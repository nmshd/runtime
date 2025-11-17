import { ClientResult } from "../../../core/backbone/ClientResult.js";
import { RESTClientAuthenticate } from "../../../core/backbone/RESTClientAuthenticate.js";

export interface BackbonePublicRelationshipTemplateReference {
    title: string;
    description: string;
    truncatedReference: string;
}

export class PublicRelationshipTemplateReferenceClient extends RESTClientAuthenticate {
    public async getPublicRelationshipTemplateReferences(): Promise<ClientResult<BackbonePublicRelationshipTemplateReference[]>> {
        return await this.get<BackbonePublicRelationshipTemplateReference[]>("/api/poc/PublicRelationshipTemplateReferences");
    }
}
