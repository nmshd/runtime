import { ISerializable, Serializable, serialize, type, validate } from "@js-soft/ts-serval";
import { CoreAddress, ICoreAddress } from "@nmshd/core-types";
import { ContentJSON } from "../ContentJSON";

export enum MailBodyFormat {
    PlainText = "PlainText",
    Markdown = "Markdown"
}

export interface MailJSON extends ContentJSON {
    "@type": "Mail";
    to: string[];
    cc?: string[];
    subject: string;
    body: string;
    bodyFormat?: `${MailBodyFormat}`;
}

export interface IMail extends ISerializable {
    to: ICoreAddress[];
    cc?: ICoreAddress[];
    subject: string;
    body: string;
    bodyFormat?: MailBodyFormat;
}

@type("Mail")
export class Mail extends Serializable implements IMail {
    @serialize({ type: CoreAddress })
    @validate({ customValidator: (v) => (v.length < 1 ? "may not be empty" : undefined) })
    public to: CoreAddress[];

    @serialize({ type: CoreAddress })
    @validate({ nullable: true })
    public cc?: CoreAddress[];

    @serialize()
    @validate({ max: 300 })
    public subject: string;

    @serialize()
    @validate({ max: 50000 })
    public body: string;

    @serialize()
    @validate({ nullable: true, customValidator: (v) => (!Object.values(MailBodyFormat).includes(v) ? `must be one of: ${Object.values(MailBodyFormat)}` : undefined) })
    public bodyFormat?: MailBodyFormat;

    protected static override preFrom(value: any): any {
        value.cc ??= [];

        if (!value.body && value.content) {
            value.body = value.content;
            delete value.content;
        }

        return value;
    }

    public static from(value: IMail | Omit<MailJSON, "@type">): Mail {
        return this.fromAny(value);
    }

    public override toJSON(verbose?: boolean | undefined, serializeAsString?: boolean | undefined): MailJSON {
        return super.toJSON(verbose, serializeAsString) as MailJSON;
    }
}
