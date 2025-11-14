import { LocalAttributeDeletionInfoDTO } from "./LocalAttributeDeletionInfoDTO.js";

export interface LocalAttributeForwardingDetailsDTO {
    peer: string;
    sourceReference: string;
    sharedAt: string;
    deletionInfo?: LocalAttributeDeletionInfoDTO;
}
