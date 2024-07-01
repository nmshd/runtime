import { MessageContentJSON } from "@nmshd/content";
import { RecipientDTO } from "./RecipientDTO";

export interface MessageDTO {
    id: string;
    content: MessageContentJSON;
    createdBy: string;
    createdByDevice: string;
    recipients: RecipientDTO[];
    createdAt: string;
    attachments: string[];
    isOwn: boolean;
    wasReadAt?: string;
}
