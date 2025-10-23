import { LocalAttributeDeletionInfoDTO } from "./LocalAttributeDeletionInfoDTO";

export interface LocalAttributeForwardingDetailsDTO {
    peer: string;
    sourceReference: string;
    sharedAt: string;
    deletionInfo?: LocalAttributeDeletionInfoDTO;
}
