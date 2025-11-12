import { PasswordProtectionDTO, RelationshipTemplateContentDerivation } from "@nmshd/runtime-types";
import { DataViewObject } from "../DataViewObject.js";
import { LocalRequestDVO } from "../consumption/LocalRequestDVO.js";
import { RequestDVO } from "../content/index.js";
import { IdentityDVO } from "./IdentityDVO.js";

export interface RelationshipTemplateDVO extends DataViewObject {
    type: "RelationshipTemplateDVO";
    isOwn: boolean;
    createdBy: IdentityDVO;
    createdByDevice: string;
    createdAt: string;
    expiresAt?: string;
    maxNumberOfAllocations?: number;
    forIdentity?: string;
    passwordProtection?: PasswordProtectionDTO;

    /**
     * Is optional, as there can be RelationshipTemplates without actual requests in it
     */
    onNewRelationship?: RequestDVO;
    onExistingRelationship?: RequestDVO;

    request?: LocalRequestDVO;

    content: RelationshipTemplateContentDerivation;
}
