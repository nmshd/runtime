import {
    AcceptRelationshipChangeRequest,
    CreateRelationshipRequest,
    GetRelationshipByAddressRequest,
    GetRelationshipRequest,
    GetRelationshipsRequest,
    IdentityDVO,
    RejectRelationshipChangeRequest,
    RevokeRelationshipChangeRequest
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
            query: { "recipients.relationshipId": id }
        });
        if (messagesResult.isError) {
            return await this.parseErrorResult<RelationshipItemsDVO>(messagesResult);
        }

        const dvo: RelationshipItemsDVO = [...(await this.expander.expandMessageDTOs(messagesResult.value))]
            .sort((m1, m2) => new Date(m2.date ?? 0).valueOf() - new Date(m1.date ?? 0).valueOf())
            .slice(0, limit);

        return UserfriendlyResult.ok<RelationshipItemsDVO, UserfriendlyApplicationError>(dvo);
    }

    public async acceptRelationshipCreationChange(relationshipId: string, content: any): Promise<UserfriendlyResult<IdentityDVO>> {
        const result = await this.transportServices.relationships.getRelationship({ id: relationshipId });
        if (result.isError) {
            return await this.parseErrorResult<IdentityDVO>(result);
        }

        const changeId = result.value.changes[0].id;
        return await this.acceptRelationshipChange({ relationshipId, changeId, content });
    }

    public async rejectRelationshipCreationChange(relationshipId: string, content: any): Promise<UserfriendlyResult<IdentityDVO>> {
        const result = await this.transportServices.relationships.getRelationship({ id: relationshipId });
        if (result.isError) {
            return await this.parseErrorResult<IdentityDVO>(result);
        }

        const changeId = result.value.changes[0].id;
        return await this.rejectRelationshipChange({ relationshipId, changeId, content });
    }

    public async revokeRelationshipCreationChange(relationshipId: string, content: any): Promise<UserfriendlyResult<IdentityDVO>> {
        const result = await this.transportServices.relationships.getRelationship({ id: relationshipId });
        if (result.isError) {
            return await this.parseErrorResult<IdentityDVO>(result);
        }

        const changeId = result.value.changes[0].id;
        return await this.revokeRelationshipChange({ relationshipId, changeId, content });
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

    public async createRelationship(request: CreateRelationshipRequest): Promise<UserfriendlyResult<IdentityDVO>> {
        const result = await this.transportServices.relationships.createRelationship(request);
        return await this.handleResult(result, (v) => this.expander.expandRelationshipDTO(v));
    }

    public async acceptRelationshipChange(request: AcceptRelationshipChangeRequest): Promise<UserfriendlyResult<IdentityDVO>> {
        const result = await this.transportServices.relationships.acceptRelationshipChange(request);
        return await this.handleResult(result, (v) => this.expander.expandRelationshipDTO(v));
    }

    public async rejectRelationshipChange(request: RejectRelationshipChangeRequest): Promise<UserfriendlyResult<IdentityDVO>> {
        const result = await this.transportServices.relationships.rejectRelationshipChange(request);
        return await this.handleResult(result, (v) => this.expander.expandRelationshipDTO(v));
    }

    public async revokeRelationshipChange(request: RevokeRelationshipChangeRequest): Promise<UserfriendlyResult<IdentityDVO>> {
        const result = await this.transportServices.relationships.revokeRelationshipChange(request);
        return await this.handleResult(result, (v) => this.expander.expandRelationshipDTO(v));
    }
}
