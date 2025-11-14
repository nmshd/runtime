import { ClientResult } from "../../../core/backbone/ClientResult.js";
import { Paginator } from "../../../core/backbone/Paginator.js";
import { RESTClientAuthenticate } from "../../../core/index.js";
import { BackboneGetRelationshipTemplatesRequest, BackboneGetRelationshipTemplatesResponse } from "./BackboneGetRelationshipTemplates.js";
import { BackbonePostRelationshipTemplatesRequest, BackbonePostRelationshipTemplatesResponse } from "./BackbonePostRelationshipTemplates.js";

export class RelationshipTemplateClient extends RESTClientAuthenticate {
    public async getRelationshipTemplates(request: BackboneGetRelationshipTemplatesRequest): Promise<ClientResult<Paginator<BackboneGetRelationshipTemplatesResponse>>> {
        return await this.getPaged<BackboneGetRelationshipTemplatesResponse>("/api/v2/RelationshipTemplates", request);
    }

    public async getRelationshipTemplate(id: string, password?: string): Promise<ClientResult<BackboneGetRelationshipTemplatesResponse>> {
        const request = password ? { password } : undefined;
        return await this.get<BackboneGetRelationshipTemplatesResponse>(`/api/v2/RelationshipTemplates/${id}`, request);
    }

    public async deleteRelationshipTemplate(id: string): Promise<ClientResult<void>> {
        return await this.delete(`/api/v2/RelationshipTemplates/${id}`);
    }

    public async createRelationshipTemplate(template: BackbonePostRelationshipTemplatesRequest): Promise<ClientResult<BackbonePostRelationshipTemplatesResponse>> {
        return await this.post<BackbonePostRelationshipTemplatesResponse>("/api/v2/RelationshipTemplates", template);
    }
}
