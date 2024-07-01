import { INotification, NotificationJSON } from "../notifications";
import { IRequest, IResponseWrapper, RequestJSON, ResponseWrapper, ResponseWrapperJSON } from "../requests";
import { ArbitraryMessageContent, ArbitraryMessageContentJSON, IArbitraryMessageContent } from "./ArbitraryMessageContent";
import { IMail, Mail, MailJSON } from "./Mail";

export type MessageContentJSON = MailJSON | ResponseWrapperJSON | RequestJSON | NotificationJSON | ArbitraryMessageContentJSON;

export type IMessageContent = IMail | IResponseWrapper | IRequest | INotification | IArbitraryMessageContent;

export type MessageContent = Mail | ResponseWrapper | Request | Notification | ArbitraryMessageContent;
