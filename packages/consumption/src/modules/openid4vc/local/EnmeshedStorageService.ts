import {
    AgentContext,
    BaseRecord,
    BaseRecordConstructor,
    ClaimFormat,
    injectable,
    JsonTransformer,
    Mdoc,
    MdocRecord,
    Query,
    QueryOptions,
    SdJwtVcRecord,
    StorageService,
    VerifiableCredential,
    W3cCredentialRecord,
    W3cJwtVerifiableCredential
} from "@credo-ts/core";
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

        let value = (record as unknown as VerifiableCredential).encoded;
        if (typeof value !== "string") {
            agentContext.config.logger.warn(`Record is not a string, serializing to JSON`);
            value = JSON.stringify(value);
        }
        const owner = this.accountController.identity.address;
        agentContext.config.logger.debug(`Saving record with id ${record.id} and value ${value}`);

        const identityAttribute = IdentityAttribute.from({
            value: {
                "@type": "VerifiableCredential",
                title: (record as any).credential?.payload?.vct ?? "Credential",
                value: value,
                type: record.type
            },
            owner: owner
        });
        const result = await this.attributeController.createRepositoryAttribute({
            content: identityAttribute
        });
        agentContext.config.logger.debug(`Saved record: ${JSON.stringify(result)}`);
        return await Promise.resolve();
    }

    public async saveWithDisplay(agentContext: AgentContext, value: string, type: string, displayInformation: string, title: string): Promise<any> {
        const owner = this.accountController.identity.address;
        const identityAttribute = IdentityAttribute.from({
            value: {
                "@type": "VerifiableCredential",
                value: value,
                type: type,
                displayInformation: displayInformation,
                title: title
            },
            owner: owner
        });
        const result = await this.attributeController.createRepositoryAttribute({
            content: identityAttribute
        });
        agentContext.config.logger.debug(`Saved record: ${JSON.stringify(result)}`);
        return await Promise.resolve(result);
    }

    public async update(agentContext: AgentContext, record: T): Promise<void> {
        agentContext.config.logger.debug(`Updating record with id ${record.id}`);
        const value = JsonTransformer.serialize(record);
        const owner = this.accountController.identity.address;
        const oldAttribute = await this.attributeController.getLocalAttribute(CoreId.from(record.id));
        if (!oldAttribute) throw new Error(`Attribute with id ${record.id} not found`);

        const identityAttribute = IdentityAttribute.from({
            value: {
                "@type": "VerifiableCredential",
                value: value,
                title: "Employee ID Card",
                displayInformation: (oldAttribute.content.value as any).displayInformation
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
        agentContext.config.logger.debug(`Deleting record with id ${record.id}`);
        const attribute = await this.attributeController.getLocalAttribute(CoreId.from(record.id));
        if (attribute === undefined) {
            throw new Error(`Attribute with id ${record.id} not found`);
        }
        await this.attributeController.deleteAttribute(attribute);
    }

    public async deleteById(agentContext: AgentContext, recordClass: BaseRecordConstructor<T>, id: string): Promise<void> {
        agentContext.config.logger.debug(`Deleting record with id ${id} - with record class ${recordClass.name}`);
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

        agentContext.config.logger.debug(`Getting record with id ${id}`);
        const attribute = await this.attributeController.getLocalAttribute(CoreId.from(id));
        // parse the value field of attribute as JSON into T
        if (attribute === undefined) {
            throw new Error(`Attribute with id ${id} not found`);
        }
        const record = JsonTransformer.deserialize((attribute.content.value as any).value, recordClass);
        return record;
    }

    public async getAll(agentContext: AgentContext, recordClass: BaseRecordConstructor<T>): Promise<T[]> {
        const records: T[] = [];
        const attributes = await this.attributeController.getLocalAttributes({ "content.value.@type": "VerifiableCredential", shareInfo: { $exists: false } });
        for (const attribute of attributes) {
            // TODO: Correct casting
            const type = (attribute as any).content.value.type;
            let record: T;
            if (type === ClaimFormat.SdJwtDc.toString() && recordClass.name === SdJwtVcRecord.name) {
                record = new SdJwtVcRecord({ id: (attribute as any).content.id, compactSdJwtVc: (attribute as any).content.value.value }) as unknown as T;
            } else if (type === ClaimFormat.MsoMdoc.toString() && recordClass.name === MdocRecord.name) {
                record = new MdocRecord({ id: (attribute as any).content.id, mdoc: Mdoc.fromBase64Url((attribute as any).content.value.value) }) as unknown as T;
            } else if (type === ClaimFormat.SdJwtW3cVc.toString() && recordClass.name === W3cCredentialRecord.name) {
                const credential = W3cJwtVerifiableCredential.fromSerializedJwt((attribute as any).content.value.value);
                record = new W3cCredentialRecord({
                    id: (attribute as any).content.id,
                    credential: credential,
                    tags: {}
                }) as unknown as T;
            } else {
                agentContext.config.logger.info(`Skipping attribute with id ${attribute.id} and type ${type} as it does not match record class ${recordClass.name}`);
                continue;
            }
            if ((attribute as any).content.value.key !== undefined) {
                // TODO: Remove as this is only a workaround for demo purposes
                agentContext.config.logger.info("Found keys to possibly import");
                const parsed = JSON.parse((attribute as any).content.value.key) as Map<string, any>;
                for (const [k, v] of parsed) {
                    const currentKeys = (globalThis as any).fakeKeyStorage as Map<string, any>;
                    if (!currentKeys.has(k)) {
                        (globalThis as any).fakeKeyStorage.set(k, v);
                        agentContext.config.logger.info(`Added key ${k} to fake keystore`);
                    } else {
                        agentContext.config.logger.info(`Key ${k} already in fake keystore`);
                    }
                }
            }
            records.push(record);
        }
        return records;
    }

    // should only be used for exporting data out of the credo environment
    public async getAllAsAttributes(agentContext: AgentContext, recordClass: BaseRecordConstructor<T>): Promise<any[]> {
        agentContext.config.logger.debug(`Getting all records of type ${recordClass.name}`);
        const attributes = await this.attributeController.getLocalAttributes({ "content.value.@type": "VerifiableCredential", shareInfo: { $exists: false } });
        return attributes;
    }

    public async findByQuery(agentContext: AgentContext, recordClass: BaseRecordConstructor<T>, query: Query<T>, queryOptions?: QueryOptions): Promise<T[]> {
        agentContext.config.logger.debug(`Finding records by query ${JSON.stringify(query)} and options ${JSON.stringify(queryOptions)}`);
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
                // TODO: $or and other operators not yet supported
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
        }
        return records;
    }
}
