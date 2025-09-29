/* eslint-disable no-console */
/* eslint-disable @typescript-eslint/no-unused-vars */
import { AgentContext, BaseRecord, BaseRecordConstructor, injectable, JsonTransformer, Query, QueryOptions, StorageService } from "@credo-ts/core";

import { IdentityAttribute } from "@nmshd/content";
import { CoreId } from "@nmshd/core-types";
import { AccountController } from "@nmshd/transport";
import { AttributesController } from "../../attributes/AttributesController";

@injectable()
export class EnmeshedStorageService<T extends BaseRecord> implements StorageService<T> {
    public storrage: Map<string, T> = new Map<string, T>();

    public constructor(
        public accountController: AccountController,
        public attributeController: AttributesController
    ) {}

    public async save(agentContext: AgentContext, record: T): Promise<void> {
        if (record.id === "STORAGE_VERSION_RECORD_ID") {
            this.storrage.set(record.id, record);
            return;
        }
        if (record.type === "DidRecord") {
            this.storrage.set(record.id, record);
            return;
        }

        const value = JsonTransformer.serialize(record);
        const owner = this.accountController.identity.address;
        console.log("FFS: Saving record", record);
        const identityAttribute = IdentityAttribute.from({
            value: {
                "@type": "VerifiableCredential",
                value: value,
                title: "Employee ID Card",
                description: "An employee ID card credential",
                credoId: record.id,
                type: typeof record
            },
            owner: owner
        });
        const result = await this.attributeController.createRepositoryAttribute({
            content: identityAttribute
        });
        console.log("FFS: Saved record", JSON.stringify(result));
        return await Promise.resolve();
    }

    // TODO: remove coreid
    public async update(agentContext: AgentContext, record: T): Promise<void> {
        console.log("FFS: Updating record", record);
        const value = JsonTransformer.serialize(record);
        const owner = this.accountController.identity.address;
        const oldAttribute = await this.attributeController.getLocalAttribute(CoreId.from(record.id));
        if (!oldAttribute) throw new Error(`Attribute with id ${record.id} not found`);

        const identityAttribute = IdentityAttribute.from({
            value: {
                "@type": "VerifiableCredential",
                value: value,
                title: "Employee ID Card",
                description: "An employee ID card credential",
                credoId: record.id
            },
            owner: owner
        });
        await this.attributeController.createRepositoryAttribute({
            content: identityAttribute,
            id: CoreId.from(record.id)
        });
        return await Promise.resolve();
    }

    public async delete(agentContext: AgentContext, record: T): Promise<void> {
        console.log("FFS: Deleting record", record);
        const attribute = await this.attributeController.getLocalAttribute(CoreId.from(record.id));
        if (attribute === undefined) {
            throw new Error(`Attribute with id ${record.id} not found`);
        }
        await this.attributeController.deleteAttribute(attribute);
    }

    // TODO: remove coreid
    public async deleteById(agentContext: AgentContext, recordClass: BaseRecordConstructor<T>, id: string): Promise<void> {
        console.log("FFS: Deleting record by id", id);
        const attribute = await this.attributeController.getLocalAttribute(CoreId.from(id));
        if (attribute === undefined) {
            throw new Error(`Attribute with id ${id} not found`);
        }
        await this.attributeController.deleteAttribute(attribute);
    }

    public async getById(agentContext: AgentContext, recordClass: BaseRecordConstructor<T>, id: string): Promise<T> {
        if (this.storrage.has(id)) {
            const record = this.storrage.get(id);
            if (!record) throw new Error(`Record with id ${id} not found`);
            return record;
        }

        console.log("FFS: Getting record by id", id);
        const attribute = await this.attributeController.getLocalAttribute(CoreId.from(id));
        // parse the value field of attribute as JSON into T
        if (attribute === undefined) {
            throw new Error(`Attribute with id ${id} not found`);
        }
        const record = JsonTransformer.deserialize((attribute.content.value as any).value, recordClass);
        return record;
    }

    public async getAll(agentContext: AgentContext, recordClass: BaseRecordConstructor<T>): Promise<T[]> {
        console.log("FFS: Getting all records");
        const records: T[] = [];
        const attributes = await this.attributeController.getLocalAttributes();
        console.log(`FFS: Found ${attributes.length} local attributes`);
        for (const attribute of attributes) {
            console.log("FFS: Processing attribute", JsonTransformer.serialize(attribute));
            const record = JsonTransformer.deserialize((attribute.content.value as any).value, recordClass);
            if (record.type !== "SdJwtVcRecord") {
                continue;
            }
            records.push(record);
        }
        console.log(`FFS: Actually found ${attributes.length} local attributes`);
        return records;
    }

    public async findByQuery(agentContext: AgentContext, recordClass: BaseRecordConstructor<T>, query: Query<T>, queryOptions?: QueryOptions): Promise<T[]> {
        console.log("FFS: Finding records by query", query);
        const records: T[] = [];
        for (const record of await this.getAll(agentContext, recordClass)) {
            let match = true;
            for (const [key, value] of Object.entries(query)) {
                if ((record as any)[key] !== value) {
                    match = false;
                    break;
                }
            }
            if (match) {
                records.push(record);
            }
        }
        if (records.length === 0) {
            // try to recover over local storrage - temporary fix
            for (const record of this.storrage.values()) {
                let match = true;
                // there may be keys labeled with an $or - solve them accordingly
                for (const [key, value] of Object.entries(query)) {
                    if (key === "$or" && Array.isArray(value)) {
                        let orMatch = false;
                        for (const orCondition of value) {
                            let conditionMatch = true;
                            for (const [orKey, orValue] of Object.entries(orCondition)) {
                                if ((record as any)[orKey] !== orValue) {
                                    conditionMatch = false;
                                    break;
                                }
                            }
                            if (conditionMatch) {
                                orMatch = true;
                                break;
                            }
                        }
                        if (!orMatch) {
                            match = false;
                            break;
                        }
                    } else if ((record as any)[key] !== value) {
                        match = false;
                        break;
                    }
                }
                if (match) {
                    records.push(record);
                }
            }
        }
        console.log(`FFS: Found ${records.length} records by query`);
        return records;
    }
}
