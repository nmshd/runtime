import { RequestError } from "../../core/backbone/RequestError";
import { ControllerName, TransportController } from "../../core/TransportController";
import { AccountController } from "../accounts/AccountController";
import { PublicRelationshipTemplateReferenceClient } from "./backbone/PublicRelationshipTemplateReferenceClient";
import { PublicRelationshipTemplateReference } from "./data/PublicRelationshipTemplateReference";

export class PublicRelationshipTemplateReferencesController extends TransportController {
    public constructor(parent: AccountController) {
        super(ControllerName.PublicRelationshipTemplateReferences, parent);
    }

    private client: PublicRelationshipTemplateReferenceClient;

    public override async init(): Promise<this> {
        await super.init();

        this.client = new PublicRelationshipTemplateReferenceClient(this.config, this.parent.authenticator, this.transport.correlator);

        return this;
    }

    public async getPublicRelationshipTemplateReferences(): Promise<PublicRelationshipTemplateReference[]> {
        try {
            const backbonePublicRelationshipTemplateReferencesResult = await this.client.getPublicRelationshipTemplateReferences();
            return backbonePublicRelationshipTemplateReferencesResult.value.map((reference) => PublicRelationshipTemplateReference.fromAny(reference));
        } catch (e) {
            if (e instanceof RequestError && e.status === 404) {
                return [];
            }
            throw e;
        }
    }
}
