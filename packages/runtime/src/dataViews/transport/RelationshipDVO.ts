import { PeerDeletionStatus, RelationshipAuditLogDTO, RelationshipCreationContentDerivation } from "@nmshd/runtime-types";
import { DataViewObject } from "../DataViewObject.js";
import { LocalAttributeDVO } from "../consumption/index.js";

export enum RelationshipDirection {
    Outgoing = "Outgoing",
    Incoming = "Incoming"
}

export interface RelationshipDVO extends DataViewObject {
    type: "RelationshipDVO";
    status: string;
    peerDeletionStatus?: PeerDeletionStatus;
    peerDeletionDate?: string;
    direction: RelationshipDirection;
    statusText: string;
    isPinned: boolean;
    theme?: RelationshipTheme;
    creationContent: RelationshipCreationContentDerivation;
    auditLog: RelationshipAuditLogDTO;
    items: LocalAttributeDVO[];
    attributeMap: Record<string, undefined | LocalAttributeDVO[]>;
    nameMap: Record<string, undefined | string>;
    templateId: string;
    originalName?: string;
    sendMailDisabled: boolean;
}

export interface RelationshipTheme {
    image?: string;
    headerImage?: string;
    backgroundColor?: string;
    foregroundColor?: string;
}
