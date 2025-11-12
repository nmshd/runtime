import { RequestError } from "../../core/backbone/RequestError.js";
import { ControllerName, TransportController } from "../../core/TransportController.js";
import { AccountController } from "../accounts/AccountController.js";
import { PublicRelationshipTemplateReferenceClient } from "./backbone/PublicRelationshipTemplateReferenceClient.js";
import { PublicRelationshipTemplateReference } from "./data/PublicRelationshipTemplateReference.js";

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
            const result = await this.client.getPublicRelationshipTemplateReferences();

            const references = result.value.map((reference) => PublicRelationshipTemplateReference.fromAny(reference));
            return references;
        } catch (e) {
            if (e instanceof RequestError && e.status === 404) return [];

            throw e;
        }
    }
}
