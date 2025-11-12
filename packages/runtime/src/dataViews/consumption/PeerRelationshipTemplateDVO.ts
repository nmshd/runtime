import { PasswordProtectionDTO } from "@nmshd/runtime-types";
import { RequestDVO } from "../content/index.js";
import { DataViewObject } from "../DataViewObject.js";
import { IdentityDVO } from "../transport/index.js";
import { LocalRequestDVO } from "./LocalRequestDVO.js";

export interface PeerRelationshipTemplateDVO extends DataViewObject {
    type: "PeerRelationshipTemplateDVO";
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

    content: unknown;
}
