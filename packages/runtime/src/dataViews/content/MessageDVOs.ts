import { LocalRequestDVO } from "../consumption";
import { MessageDVO, RecipientDVO } from "../transport/MessageDVO";

export interface RequestMessageDVO extends Omit<MessageDVO, "type"> {
    type: "RequestMessageDVO";

    request: LocalRequestDVO;
}

export interface RequestMessageErrorDVO extends Omit<MessageDVO, "type"> {
    type: "RequestMessageErrorDVO";

    code: string;
    message: string;
}

export interface MailDVO extends Omit<MessageDVO, "type"> {
    type: "MailDVO";

    // overwrite DTO
    to: RecipientDVO[];
    cc: RecipientDVO[];
    subject: string;
    body: string;

    // new
    toCount: number;
    ccCount: number;
}
