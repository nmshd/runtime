import {
    AgentContext,
    BaseRecord,
    BaseRecordConstructor,
    ClaimFormat,
    injectable,
    MdocRecord,
    Query,
    QueryOptions,
    SdJwtVcRecord,
    StorageService,
    W3cCredentialRecord
} from "@credo-ts/core";
import { IdentityAttribute, VerifiableCredential } from "@nmshd/content";
import { AccountController } from "@nmshd/transport";
import { OwnIdentityAttribute } from "../../attributes";
import { AttributesController } from "../../attributes/AttributesController";
import { KeyStorage } from "./KeyStorage";

@injectable()
export class EnmeshedStorageService<T extends BaseRecord> implements StorageService<T> {
    public storage: Map<string, T> = new Map<string, T>();
    public constructor(
        private readonly accountController: AccountController,
        private readonly attributeController: AttributesController,
        private readonly keyStorage: KeyStorage
    ) {}

    public save(_agentContext: AgentContext, record: T): Promise<void> {
        if (record.id !== "STORAGE_VERSION_RECORD_ID" && record.type !== "DidRecord") {
            throw new Error("Only storage of STORAGE_VERSION_RECORD_ID and DidRecord implemented because others previously not needed");
        }

        this.storage.set(record.id, record);
        return Promise.resolve();
    }

    public async saveWithDisplay(
        agentContext: AgentContext,
        value: string | Record<string, any>,
        type: string,
        displayInformation?: Record<string, any>[]
    ): Promise<OwnIdentityAttribute> {
        const owner = this.accountController.identity.address;
        const identityAttribute = IdentityAttribute.from({
            value: {
                "@type": "VerifiableCredential",
                value: value,
                type: type,
                displayInformation: displayInformation
            },
            owner: owner
        });
        const result = await this.attributeController.createOwnIdentityAttribute({
            content: identityAttribute
        });
        agentContext.config.logger.debug(`Saved record: ${JSON.stringify(result)}`);
        return await Promise.resolve(result);
    }

    public update(_agentContext: AgentContext, _record: T): Promise<void> {
        throw new Error("Storage update not implemented because previously not needed");
    }

    public delete(_agentContext: AgentContext, _record: T): Promise<void> {
        throw new Error("Storage delete not implemented because previously not needed");
    }

    public deleteById(_agentContext: AgentContext, _recordClass: BaseRecordConstructor<T>, _id: string): Promise<void> {
        throw new Error("Storage delete not implemented because previously not needed");
    }

    public getById(_agentContext: AgentContext, _recordClass: BaseRecordConstructor<T>, id: string): Promise<T> {
        const record = this.storage.get(id);
        if (!record) throw new Error(`Record with id ${id} not found`);
        return Promise.resolve(record);
    }

    public async getAll(_agentContext: AgentContext, recordClass: BaseRecordConstructor<T>): Promise<T[]> {
        // so far only encountered in the credential context
        const recordType = recordClass.type;
        const correspondingCredentialType = this.recordTypeToCredentialType(recordType);

        const attributes = await this.attributeController.getLocalAttributes({
            "@type": "OwnIdentityAttribute",
            "content.value.@type": "VerifiableCredential",
            "content.value.type": correspondingCredentialType
        });

        return await Promise.all(
            attributes.map(async (attribute) => {
                const attributeValue = attribute.content.value as VerifiableCredential;
                if (attributeValue.key !== undefined) {
                    // TODO: Remove as this is only a workaround for demo purposes
                    _agentContext.config.logger.info("Found keys to possibly import");

                    const parsed = JSON.parse(attributeValue.key) as Map<string, any>;
                    for (const [k, v] of Object.entries(parsed)) {
                        await this.keyStorage.storeKey(k, v);
                    }
                }

                return this.fromEncoded(correspondingCredentialType, (attribute.content.value as VerifiableCredential).value) as T;
            })
        );
    }

    private recordTypeToCredentialType(recordType: string): string {
        switch (recordType) {
            case SdJwtVcRecord.name:
                return ClaimFormat.SdJwtDc;
            case MdocRecord.name:
                return ClaimFormat.MsoMdoc;
            case W3cCredentialRecord.name:
                return ClaimFormat.SdJwtW3cVc;
            default:
                throw new Error("Record type not supported.");
        }
    }

    private fromEncoded(type: string, encoded: string | Record<string, any>): BaseRecord<any, any> {
        switch (type) {
            case ClaimFormat.SdJwtDc:
                return new SdJwtVcRecord({ credentialInstances: [{ compactSdJwtVc: encoded as string }] });
            case ClaimFormat.MsoMdoc:
                return new MdocRecord({ credentialInstances: [{ issuerSignedBase64Url: encoded as string }] });
            case ClaimFormat.SdJwtW3cVc:
                return new W3cCredentialRecord({ credentialInstances: [{ credential: encoded as string }] });
            default:
                throw new Error("Credential type not supported.");
        }
    }

    public async findByQuery(agentContext: AgentContext, recordClass: BaseRecordConstructor<T>, query: Query<T>, queryOptions?: QueryOptions): Promise<T[]> {
        // so far only encountered in the credential context
        agentContext.config.logger.debug(`Finding records by query ${JSON.stringify(query)} and options ${JSON.stringify(queryOptions)}`);
        const records: T[] = [];
        for (const record of await this.getAll(agentContext, recordClass)) {
            if (this.matchesQuery(record, query)) {
                records.push(record);
            }
        }
        if (records.length === 0) {
            // try to recover over local storage - temporary fix
            for (const record of this.storage.values()) {
                if (this.matchesQuery(record, query)) {
                    records.push(record);
                }
            }
        }
        return records;
    }

    private matchesQuery(record: BaseRecord, query: Query<T>): boolean {
        return Object.entries(query).every(([key, value]) => {
            if (key === "$or") {
                return (value as any[]).some((subquery) => this.matchesQuery(record, subquery));
            }
            return record.getTags()[key] === value;
        });
    }
}
