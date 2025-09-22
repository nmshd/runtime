import { FileDTO } from "./FileDTO";
import { MessageContentDerivation } from "./MessageDTO";
import { RecipientDTO } from "./RecipientDTO";

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
