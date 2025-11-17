import { CoreAddress } from "@nmshd/core-types";
import { SynchronizedCollection } from "@nmshd/transport";
import { ConsumptionBaseController } from "../../consumption/ConsumptionBaseController.js";
import { ConsumptionController } from "../../consumption/ConsumptionController.js";
import { ConsumptionControllerName } from "../../consumption/ConsumptionControllerName.js";
import { ConsumptionIds } from "../../consumption/ConsumptionIds.js";
import { IdentityMetadata } from "./local/IdentityMetadata.js";
import { IUpsertIdentityMetadataParams, UpsertIdentityMetadataParams } from "./local/UpsertIdentityMetadataParams.js";

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
            key: key ?? { $exists: false }
        });

        return result ? IdentityMetadata.from(result) : undefined;
    }

    public async upsertIdentityMetadata(params: IUpsertIdentityMetadataParams): Promise<IdentityMetadata> {
        const parsedParams = UpsertIdentityMetadataParams.from(params);

        const oldDoc = await this.identityMetadata.findOne({
            reference: parsedParams.reference.toString(),
            key: parsedParams.key ?? { $exists: false }
        });

        if (!oldDoc) {
            const identityMetadata = IdentityMetadata.from({
                id: await ConsumptionIds.identityMetadata.generate(),
                key: parsedParams.key,
                reference: parsedParams.reference,
                value: parsedParams.value
            });

            await this.identityMetadata.create(identityMetadata);

            return identityMetadata;
        }

        const identityMetadata = IdentityMetadata.from(oldDoc);
        identityMetadata.value = parsedParams.value;

        await this.identityMetadata.update(oldDoc, identityMetadata);

        return identityMetadata;
    }

    public async deleteIdentityMetadata(identityMetadata: IdentityMetadata): Promise<void> {
        await this.identityMetadata.delete(identityMetadata);
    }

    public async deleteIdentityMetadataReferencedWithPeer(peerAddress: CoreAddress): Promise<void> {
        const docs = await this.identityMetadata.find({ reference: peerAddress.toString() });

        for (const doc of docs) {
            const identityMetadata = IdentityMetadata.from(doc);
            await this.deleteIdentityMetadata(identityMetadata);
        }
    }
}
