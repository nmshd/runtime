import {
    AcceptRelationshipRequest,
    CreateRelationshipRequest,
    GetRelationshipByAddressRequest,
    GetRelationshipRequest,
    GetRelationshipsRequest,
    IdentityDVO,
    RejectRelationshipRequest,
    RevokeRelationshipRequest
} from "@nmshd/runtime";
import { UserfriendlyApplicationError } from "../../UserfriendlyApplicationError";
import { UserfriendlyResult } from "../../UserfriendlyResult";
import { RelationshipItemsDVO } from "../DVOs/RelationshipItemsDVO";
import { AppRuntimeFacade } from "./AppRuntimeFacade";

export class AppRelationshipFacade extends AppRuntimeFacade {
    public async renderActiveRelationships(): Promise<UserfriendlyResult<IdentityDVO[]>> {
        return await this.getRelationships({
            query: { status: "Active" }
        });
    }

    public async renderAllRelationships(): Promise<UserfriendlyResult<IdentityDVO[]>> {
        return await this.getRelationships({});
    }

    public async renderRelationship(id: string): Promise<UserfriendlyResult<IdentityDVO>> {
        return await this.getRelationship({ id });
    }

    public async renderRelationshipItems(id: string, limit: number): Promise<UserfriendlyResult<RelationshipItemsDVO>> {
        const messagesResult = await this.transportServices.messages.getMessages({
            query: { "recipients.relationshipId": id },
            paginationOptions: { limit }
        });
        if (messagesResult.isError) {
            return await this.parseErrorResult<RelationshipItemsDVO>(messagesResult);
        }

        const dvo: RelationshipItemsDVO = await this.expander.expandMessageDTOs(messagesResult.value.messages);
        return UserfriendlyResult.ok<RelationshipItemsDVO, UserfriendlyApplicationError>(dvo);
    }

    public async createRelationship(request: CreateRelationshipRequest): Promise<UserfriendlyResult<IdentityDVO>> {
        const result = await this.transportServices.relationships.createRelationship(request);
        return await this.handleResult(result, (v) => this.expander.expandRelationshipDTO(v));
    }

    public async acceptRelationship(request: AcceptRelationshipRequest): Promise<UserfriendlyResult<IdentityDVO>> {
        const result = await this.transportServices.relationships.acceptRelationship(request);
        return await this.handleResult(result, (v) => this.expander.expandRelationshipDTO(v));
    }

    public async rejectRelationship(request: RejectRelationshipRequest): Promise<UserfriendlyResult<IdentityDVO>> {
        const result = await this.transportServices.relationships.rejectRelationship(request);
        return await this.handleResult(result, (v) => this.expander.expandRelationshipDTO(v));
    }

    public async revokeRelationship(request: RevokeRelationshipRequest): Promise<UserfriendlyResult<IdentityDVO>> {
        const result = await this.transportServices.relationships.revokeRelationship(request);
        return await this.handleResult(result, (v) => this.expander.expandRelationshipDTO(v));
    }

    public async getRelationships(request: GetRelationshipsRequest): Promise<UserfriendlyResult<IdentityDVO[]>> {
        const result = await this.transportServices.relationships.getRelationships(request);
        return await this.handleResult(result, (v) => this.expander.expandRelationshipDTOs(v));
    }

    public async getRelationship(request: GetRelationshipRequest): Promise<UserfriendlyResult<IdentityDVO>> {
        const result = await this.transportServices.relationships.getRelationship(request);
        return await this.handleResult(result, (v) => this.expander.expandRelationshipDTO(v));
    }

    public async getRelationshipByAddress(request: GetRelationshipByAddressRequest): Promise<UserfriendlyResult<IdentityDVO>> {
        const result = await this.transportServices.relationships.getRelationshipByAddress(request);
        return await this.handleResult(result, (v) => this.expander.expandRelationshipDTO(v));
    }
}
