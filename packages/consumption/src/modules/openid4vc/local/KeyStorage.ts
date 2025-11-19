import { ILogger } from "@js-soft/logging-abstractions";
import { serialize, validate } from "@js-soft/ts-serval";
import { CoreId } from "@nmshd/core-types";
import { CoreSynchronizable, ICoreSynchronizable, SynchronizedCollection } from "@nmshd/transport";

interface IKeyStorageEntry extends ICoreSynchronizable {
    key: any;
}

class KeyStorageEntry extends CoreSynchronizable {
    public override technicalProperties: string[] = ["key"];

    @serialize({ any: true })
    @validate()
    public key: any;

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
        const existing = await this.collection.read(keyId);
        return !!existing;
    }

    public async storeKey(keyId: string, keyData: any): Promise<void> {
        const entry = await this.collection.read(keyId);
        if (entry) {
            this.logger.info(`Key with id ${keyId} already exists`);
            return;
        }

        await this.collection.create(KeyStorageEntry.from({ id: CoreId.from(keyId), key: keyData }));
    }

    public async getKey(keyId: string): Promise<any | undefined> {
        const entry = await this.collection.read(keyId);
        if (!entry) {
            this.logger.warn(`Key with id ${keyId} not found`);
            return undefined;
        }

        const parsed = KeyStorageEntry.from(entry);
        return parsed.key;
    }

    public async deleteKey(keyId: string): Promise<void> {
        const entry = await this.collection.read(keyId);
        if (!entry) {
            this.logger.warn(`Key with id ${keyId} not found, cannot delete`);
            return;
        }

        await this.collection.delete(KeyStorageEntry.from(entry));
    }
}
