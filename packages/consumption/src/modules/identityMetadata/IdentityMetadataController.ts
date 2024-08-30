import { CoreAddress } from "@nmshd/core-types";
import { SynchronizedCollection, TransportCoreErrors } from "@nmshd/transport";
import { ConsumptionBaseController } from "../../consumption/ConsumptionBaseController";
import { ConsumptionController } from "../../consumption/ConsumptionController";
import { ConsumptionControllerName } from "../../consumption/ConsumptionControllerName";
import { ConsumptionIds } from "../../consumption/ConsumptionIds";
import { CreateIdentityMetadataParams, ICreateIdentityMetadataParams } from "./local/CreateIdentityMetadataParams";
import { DeleteIdentityMetadataParams, IDeleteIdentityMetadataParams } from "./local/DeleteIdentityMetadataParams";
import { IdentityMetadata } from "./local/IdentityMetadata";
import { IUpdateIdentityMetadataParams, UpdateIdentityMetadataParams } from "./local/UpdateIdentityMetadataParams";

export class IdentityMetadataController extends ConsumptionBaseController {
    private identityMetadata: SynchronizedCollection;

    public constructor(parent: ConsumptionController) {
        super(ConsumptionControllerName.IdentityMetadataController, parent);
    }

    public override async init(): Promise<this> {
        await super.init();

        this.identityMetadata = await this.parent.accountController.getSynchronizedCollection("IdentityMetadata");
        return this;
    }

    public async getIdentityMetadata(reference: CoreAddress, key?: string): Promise<IdentityMetadata | undefined> {
        const result = await this.identityMetadata.findOne({
            reference: reference.toString(),
            key: key
        });

        return result ? IdentityMetadata.from(result) : undefined;
    }

    public async getIdentityMetadatas(query?: any): Promise<IdentityMetadata[]> {
        const items = await this.identityMetadata.find(query);
        return this.parseArray(items, IdentityMetadata);
    }

    public async createIdentityMetadata(params: ICreateIdentityMetadataParams): Promise<IdentityMetadata> {
        const parsedParams = CreateIdentityMetadataParams.from(params);

        const identityMetadata = IdentityMetadata.from({
            id: await ConsumptionIds.identityMetadata.generate(),
            key: parsedParams.key,
            reference: parsedParams.reference,
            value: parsedParams.value
        });

        await this.identityMetadata.create(identityMetadata);

        return identityMetadata;
    }

    public async updateIdentityMetadata(params: IUpdateIdentityMetadataParams): Promise<IdentityMetadata> {
        const parsedParams = UpdateIdentityMetadataParams.from(params);

        const oldDoc = await this.identityMetadata.findOne({
            reference: parsedParams.reference.toString(),
            key: parsedParams.key
        });

        if (!oldDoc) {
            if (parsedParams.upsert) return await this.createIdentityMetadata(parsedParams);

            throw TransportCoreErrors.general.recordNotFound(IdentityMetadata, `reference: '${parsedParams.reference.toString()}' - key: '${parsedParams.key}'`);
        }

        const identityMetadata = IdentityMetadata.from(oldDoc);
        identityMetadata.value = parsedParams.value;

        await this.identityMetadata.update(oldDoc, identityMetadata);

        return identityMetadata;
    }

    public async deleteIdentityMetadata(params: IDeleteIdentityMetadataParams): Promise<void> {
        const parsedParams = DeleteIdentityMetadataParams.from(params);

        const identityMetadata = await this.getIdentityMetadata(parsedParams.reference, parsedParams.key);

        if (!identityMetadata) {
            throw TransportCoreErrors.general.recordNotFound(IdentityMetadata, `reference: '${parsedParams.reference.toString()}' - key: '${parsedParams.key}'`);
        }

        await this.identityMetadata.delete(identityMetadata);
    }
}
