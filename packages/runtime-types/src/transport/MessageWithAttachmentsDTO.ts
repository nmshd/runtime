import { FileDTO } from "./FileDTO.js";
import { MessageContentDerivation } from "./MessageDTO.js";
import { RecipientDTO } from "./RecipientDTO.js";

export interface MessageWithAttachmentsDTO {
    id: string;
    isOwn: boolean;
    content: MessageContentDerivation;
    createdBy: string;
    createdByDevice: string;
    recipients: RecipientDTO[];
    createdAt: string;
    attachments: FileDTO[];
    wasReadAt?: string;
}
