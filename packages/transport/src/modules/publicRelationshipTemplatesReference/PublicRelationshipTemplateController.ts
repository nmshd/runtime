import { RequestError } from "../../core/backbone/RequestError";
import { ControllerName, TransportController } from "../../core/TransportController";
import { AccountController } from "../accounts/AccountController";
import { PublicRelationshipTemplateReferenceClient } from "./backbone/PublicRelationshipTemplateClient";
import { PublicRelationshipTemplateReference } from "./data/PublicRelationshipTemplateReference";

export class PublicRelationshipTemplateReferenceController extends TransportController {
    public constructor(parent: AccountController) {
        super(ControllerName.PublicRelationshipTemplateController, parent);
    }

    private client: PublicRelationshipTemplateReferenceClient;

    public override async init(): Promise<this> {
        await super.init();

        this.client = new PublicRelationshipTemplateReferenceClient(this.config, this.parent.authenticator, this.transport.correlator);

        return this;
    }

    public async getPublicRelationshipTemplateReferences(): Promise<PublicRelationshipTemplateReference[]> {
        let publicRelationshipTemplateReferences: PublicRelationshipTemplateReference[];
        try {
            publicRelationshipTemplateReferences = (await this.client.getPublicRelationshipTemplateReferences()).value.map((reference) =>
                PublicRelationshipTemplateReference.fromAny(reference)
            );
        } catch (e) {
            if (e instanceof RequestError && e.status === 404) {
                publicRelationshipTemplateReferences = [];
            } else {
                throw e;
            }
        }
        return publicRelationshipTemplateReferences;
    }
}
