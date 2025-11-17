import { LocalRequestStatus } from "@nmshd/consumption";
import { RequestDVO, RequestItemDVO, RequestItemGroupDVO, ResponseDVO } from "../content/index.js";
import { DataViewObject } from "../DataViewObject.js";
import { IdentityDVO } from "../transport/index.js";

export interface LocalRequestDVO extends DataViewObject {
    isOwn: boolean;
    createdAt: string;
    content: RequestDVO;
    status: LocalRequestStatus;
    statusText: string;
    directionText: string;
    sourceTypeText: string;
    createdBy: IdentityDVO;
    peer: IdentityDVO;
    response?: LocalResponseDVO;
    source?: LocalRequestSourceDVO;
    decider: IdentityDVO;
    isDecidable: boolean;
    items: (RequestItemDVO | RequestItemGroupDVO)[];
    wasAutomaticallyDecided?: true;
}

export interface LocalRequestSourceDVO {
    type: "Message" | "RelationshipTemplate";
    reference: string;
}

export interface LocalResponseDVO extends DataViewObject {
    createdAt: string;
    content: ResponseDVO;
    source?: LocalResponseSourceDVO;
}

export interface LocalResponseSourceDVO {
    type: "Message" | "Relationship";
    reference: string;
}
