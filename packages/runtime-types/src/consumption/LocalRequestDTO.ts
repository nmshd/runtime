import { RequestJSON, ResponseJSON } from "@nmshd/content";

export enum LocalRequestStatus {
    Draft = "Draft",
    Open = "Open",
    DecisionRequired = "DecisionRequired",
    ManualDecisionRequired = "ManualDecisionRequired",
    Decided = "Decided",
    Completed = "Completed",
    Expired = "Expired"
}

export interface LocalRequestDTO {
    id: string;
    isOwn: boolean;
    peer: string;
    createdAt: string;
    status: LocalRequestStatus;
    content: RequestJSON;
    source?: LocalRequestSourceDTO;
    response?: LocalResponseDTO;
    wasAutomaticallyDecided?: true;
}

export interface LocalRequestSourceDTO {
    type: "Message" | "RelationshipTemplate";
    reference: string;
}

export interface LocalResponseSourceDTO {
    type: "Message" | "Relationship";
    reference: string;
}

export interface LocalResponseDTO {
    createdAt: string;
    content: ResponseJSON;
    source?: LocalResponseSourceDTO;
}
