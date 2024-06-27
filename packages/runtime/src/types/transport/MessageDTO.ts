import { ArbitraryMessageContentJSON, MailJSON, NotificationJSON, RequestJSON, ResponseWrapperJSON } from "@nmshd/content";
import { RecipientDTO } from "./RecipientDTO";

export interface MessageDTO {
    id: string;
    content: MailJSON | ResponseWrapperJSON | RequestJSON | NotificationJSON | ArbitraryMessageContentJSON;
    createdBy: string;
    createdByDevice: string;
    recipients: RecipientDTO[];
    createdAt: string;
    attachments: string[];
    isOwn: boolean;
    wasReadAt?: string;
}
