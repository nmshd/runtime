import { ILogger } from "@js-soft/logging-abstractions";
import { Jwk, zJwk } from "@openid4vc/oauth2";
import { z } from "zod";
import { serialize, validate } from "@js-soft/ts-serval";
import { CoreId } from "@nmshd/core-types";
import { CoreSynchronizable, ICoreSynchronizable, SynchronizedCollection } from "@nmshd/transport";
import { nameof } from "ts-simple-nameof";

const keyPairSchema = z.object({ publicKey: zJwk, privateKey: zJwk });
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
        if (!entry) {
            this.logger.warn(`Key with id ${keyId} not found`);
            return undefined;
        }

        const parsed = KeyStorageEntry.fromAny<KeyStorageEntry>(entry);
        return keyPairSchema.parse(parsed.key);
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
