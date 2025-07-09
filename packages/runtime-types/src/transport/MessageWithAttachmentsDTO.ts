import { FileDTO } from "./FileDTO";
import { RecipientDTO } from "./RecipientDTO";

export interface MessageWithAttachmentsDTO {
    id: string;
    isOwn: boolean;
    content: any;
    createdBy: string;
    createdByDevice: string;
    recipients: RecipientDTO[];
    createdAt: string;
    attachments: FileDTO[];
    wasReadAt?: string;
}
