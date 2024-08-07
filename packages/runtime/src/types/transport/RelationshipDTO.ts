import { IdentityDTO } from "./IdentityDTO";
import { RelationshipChangeDTO } from "./RelationshipChangeDTO";
import { RelationshipTemplateDTO } from "./RelationshipTemplateDTO";

export enum RelationshipStatus {
    Pending = "Pending",
    Active = "Active",
    Rejected = "Rejected",
    Revoked = "Revoked",
    Terminating = "Terminating",
    Terminated = "Terminated"
}

export enum PeerStatus {
    Active = "Active",
    ToBeDeleted = "ToBeDeleted",
    Deleted = "Deleted"
}

export interface RelationshipDTO {
    id: string;
    template: RelationshipTemplateDTO;
    status: RelationshipStatus;
    peer: string;
    peerStatus: PeerStatus;
    peerIdentity: IdentityDTO;
    changes: RelationshipChangeDTO[];
}
