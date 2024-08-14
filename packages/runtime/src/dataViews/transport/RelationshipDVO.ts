import { PeerDeletionInfoDTO, RelationshipAuditLogDTO, RelationshipCreationContentDerivation } from "../../types/transport/RelationshipDTO";
import { DataViewObject } from "../DataViewObject";
import { LocalAttributeDVO } from "../consumption";

export enum RelationshipDirection {
    Outgoing = "Outgoing",
    Incoming = "Incoming"
}

export interface RelationshipDVO extends DataViewObject {
    type: "RelationshipDVO";
    status: string;
    peerDeletionInfo?: PeerDeletionInfoDTO;
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
}

export interface RelationshipTheme {
    image?: string;
    headerImage?: string;
    backgroundColor?: string;
    foregroundColor?: string;
}
