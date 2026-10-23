import { ILogger } from "@js-soft/logging-abstractions";
import { Jwk, zJwk } from "@openid4vc/oauth2";
import { z } from "zod";
import { serialize, validate } from "@js-soft/ts-serval";
import { CoreId } from "@nmshd/core-types";
import { CoreSynchronizable, ICoreSynchronizable, SynchronizedCollection } from "@nmshd/transport";
import { base64url, calculateJwkThumbprint } from "jose";
import { nameof } from "ts-simple-nameof";

const keyPairSchema = z.object({ publicKey: zJwk, privateKey: zJwk });
const legacyKeyEntrySchema = z.object({ key: z.string() });

function normalizeLegacyKey(key: Jwk): Jwk {
    if (key.kty !== "EC" || key.crv !== "P-256") return key;
    const coordinates = z.object({ x: z.string(), y: z.string(), d: z.string().optional() }).parse(key);
    // The old generator encoded these integers without leading zeros; P-256
    // JWK coordinates and private scalars must occupy exactly 32 bytes.
    const pad = (value: string): string => {
        const bytes = base64url.decode(value);
        if (!bytes.length || bytes.length > 32) throw new Error("Invalid legacy P-256 coordinate length");
        const padded = new Uint8Array(32);
        padded.set(bytes, 32 - bytes.length);
        return base64url.encode(padded);
    };
    return { ...key, x: pad(coordinates.x), y: pad(coordinates.y), ...(coordinates.d ? { d: pad(coordinates.d) } : {}) };
}

function decodeKeyPair(value: unknown): HolderKeyPair {
    if (typeof value !== "string") return keyPairSchema.parse(value);
    const parsed: unknown = JSON.parse(value);
    const key = keyPairSchema.parse(parsed);
    return { publicKey: normalizeLegacyKey(key.publicKey), privateKey: normalizeLegacyKey(key.privateKey) };
}
export interface HolderKeyPair {
    publicKey: Jwk;
    privateKey: Jwk;
}

interface IKeyStorageEntry extends ICoreSynchronizable {
    key: HolderKeyPair;
}

class KeyStorageEntry extends CoreSynchronizable {
    public override technicalProperties: string[] = [nameof<KeyStorageEntry>((r) => r.key)];

    @serialize({ any: true })
    @validate()
    public key: HolderKeyPair;

    public static from(entry: IKeyStorageEntry): KeyStorageEntry {
        return this.fromAny<KeyStorageEntry>(entry);
    }
}

export class KeyStorage {
    public constructor(
        private readonly collection: SynchronizedCollection,
        private readonly logger: ILogger
    ) {}

    public async hasKey(keyId: string): Promise<boolean> {
        const entry: unknown = await this.collection.read(keyId);
        return !!entry;
    }

    public async storeKey(keyId: string, keyData: HolderKeyPair): Promise<void> {
        const entry: unknown = await this.collection.read(keyId);
        if (entry) {
            this.logger.info(`Key with id ${keyId} already exists`);
            return;
        }

        await this.collection.create(KeyStorageEntry.from({ id: CoreId.from(keyId), key: keyData }));
    }

    public async getKey(keyId: string): Promise<HolderKeyPair | undefined> {
        const entry: unknown = await this.collection.read(keyId);
        if (entry) {
            return decodeKeyPair(KeyStorageEntry.fromAny<KeyStorageEntry>(entry).key);
        }

        // Old keys were stored as JSON strings under UUIDs (and sometimes an
        // additional public-key id). Resolve their JWK thumbprint on demand.
        const records: unknown[] = await this.collection.find({});
        for (const record of records) {
            const legacy = legacyKeyEntrySchema.safeParse(record);
            if (!legacy.success) continue;
            try {
                const parsed: unknown = JSON.parse(legacy.data.key);
                const original = keyPairSchema.parse(parsed);
                const key = decodeKeyPair(legacy.data.key);
                if ((await calculateJwkThumbprint(key.publicKey)) === keyId || (await calculateJwkThumbprint(original.publicKey)) === keyId) return key;
            } catch {
                // An unrelated malformed legacy record must not prevent lookup
                // of another credential's holder key. Direct reads still fail.
            }
        }

        this.logger.warn(`Key with id ${keyId} not found`);
        return undefined;
    }

    public async deleteKey(keyId: string): Promise<void> {
        const entry: unknown = await this.collection.read(keyId);
        if (!entry) {
            this.logger.warn(`Key with id ${keyId} not found, cannot delete`);
            return;
        }

        await this.collection.delete(KeyStorageEntry.fromAny<KeyStorageEntry>(entry));
    }
}
