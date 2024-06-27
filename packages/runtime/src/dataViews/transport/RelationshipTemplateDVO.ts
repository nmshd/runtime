import { ArbitraryRelationshipTemplateContentJSON, RelationshipTemplateContentContainingRequestJSON } from "@nmshd/content";
import { DataViewObject } from "../DataViewObject";
import { LocalRequestDVO } from "../consumption/LocalRequestDVO";
import { RequestDVO } from "../content";
import { IdentityDVO } from "./IdentityDVO";

export interface RelationshipTemplateDVO extends DataViewObject {
    type: "RelationshipTemplateDVO";
    isOwn: boolean;
    createdBy: IdentityDVO;
    createdByDevice: string;
    createdAt: string;
    expiresAt?: string;
    maxNumberOfAllocations?: number;

    /**
     * Is optional, as there can be RelationshipTemplates without actual requests in it
     */
    onNewRelationship?: RequestDVO;
    onExistingRelationship?: RequestDVO;

    request?: LocalRequestDVO;

    content: RelationshipTemplateContentContainingRequestJSON | ArbitraryRelationshipTemplateContentJSON;
}
