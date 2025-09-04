/* eslint-disable @typescript-eslint/no-unused-vars */
import { AgentContext, BaseRecord, BaseRecordConstructor, injectable, JsonTransformer, Query, QueryOptions, StorageService } from "@credo-ts/core";

@injectable()
export class FakeStorageService<T extends BaseRecord> implements StorageService<T> {
    public storrage: Map<string, string> = new Map();

    public async save(agentContext: AgentContext, record: T): Promise<void> {
        record.updatedAt = new Date();
        const value = JsonTransformer.serialize(record);
        this.storrage.set(record.id, value);
        return await Promise.resolve();
    }

    public async update(agentContext: AgentContext, record: T): Promise<void> {
        record.updatedAt = new Date();
        const value = JsonTransformer.serialize(record);
        this.storrage.set(record.id, value);
        return await Promise.resolve();
    }
    public delete(agentContext: AgentContext, record: T): Promise<void> {
        this.storrage.delete(record.id);
        return Promise.resolve();
    }
    public deleteById(agentContext: AgentContext, recordClass: BaseRecordConstructor<T>, id: string): Promise<void> {
        this.storrage.delete(id);
        return Promise.resolve();
    }
    public getById(agentContext: AgentContext, recordClass: BaseRecordConstructor<T>, id: string): Promise<T> {
        const record = this.storrage.get(id);
        if (!record) {
            return Promise.reject(new Error(`Record with id ${id} not found`));
        }
        return Promise.resolve(JsonTransformer.deserialize(record, recordClass));
    }
    public getAll(agentContext: AgentContext, recordClass: BaseRecordConstructor<T>): Promise<T[]> {
        const records: T[] = [];
        for (const record of this.storrage.values()) {
            records.push(JsonTransformer.deserialize(record, recordClass));
        }
        return Promise.resolve(records);
    }
    public findByQuery(agentContext: AgentContext, recordClass: BaseRecordConstructor<T>, query: Query<T>, queryOptions?: QueryOptions): Promise<T[]> {
        const records: T[] = [];
        for (const record of this.storrage.values()) {
            const deserializedRecord = JsonTransformer.deserialize(record, recordClass);
            let match = true;
            for (const [key, value] of Object.entries(query)) {
                if ((deserializedRecord as any)[key] !== value) {
                    match = false;
                    break;
                }
            }
            if (match) {
                records.push(deserializedRecord);
            }
        }
        return Promise.resolve(records);
    }
}
