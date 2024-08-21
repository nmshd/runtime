import { ArbitraryMessageContentJSON, MailJSON, NotificationJSON, RequestJSON, ResponseWrapperJSON } from "@nmshd/content";
import { RecipientDTO } from "./RecipientDTO";

export type MessageContentDerivation = MailJSON | ResponseWrapperJSON | RequestJSON | NotificationJSON | ArbitraryMessageContentJSON;

export interface MessageDTO {
    id: string;
    content: MessageContentDerivation;
    createdBy: string;
    createdByDevice: string;
    recipients: RecipientDTO[];
    createdAt: string;
    attachments: string[];
    isOwn: boolean;
    wasReadAt?: string;
}
