import { RelationshipTemplateContentDerivation } from "../../types/transport/RelationshipTemplateDTO";
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
    forIdentity?: string;
    password?: string;
    pin?: string;

    /**
     * Is optional, as there can be RelationshipTemplates without actual requests in it
     */
    onNewRelationship?: RequestDVO;
    onExistingRelationship?: RequestDVO;

    request?: LocalRequestDVO;

    content: RelationshipTemplateContentDerivation;
}
