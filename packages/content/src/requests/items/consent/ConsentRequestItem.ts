import { serialize, type, validate } from "@js-soft/ts-serval";
import { IRequestItem, RequestItem, RequestItemJSON } from "../../RequestItem";

export interface ConsentRequestItemJSON extends RequestItemJSON {
    "@type": "ConsentRequestItem";
    consent: string;
    link?: string;
    linkDisplayText?: string;
}

export interface IConsentRequestItem extends IRequestItem {
    consent: string;
    link?: string;
    linkDisplayText?: string;
}

@type("ConsentRequestItem")
export class ConsentRequestItem extends RequestItem implements IConsentRequestItem {
    @serialize()
    @validate({ max: 2000 })
    public consent: string;

    @serialize()
    @validate({
        nullable: true,
        min: 3,
        max: 1024,
        regExp: new RegExp(
            // eslint-disable-next-line no-useless-escape
            /^((([A-Za-z]{3,9}:(?:\/\/)?)(?:[\-;:&=\+\$,\w]+@)?[A-Za-z0-9\.\-]+|(?:www\.|[\-;:&=\+\$,\w]+@)[A-Za-z0-9\.\-]+)((?:\/[\+~%\/\.\w\-_]*)?\??(?:[\-\+=&;%@\.\w_]*)#?(?:[\.\!\/\\\w]*))?)$/i
        )
    })
    public link?: string;

    @serialize()
    @validate({ nullable: true })
    public linkDisplayText?: string;

    public static from(value: IConsentRequestItem | Omit<ConsentRequestItemJSON, "@type"> | ConsentRequestItemJSON): ConsentRequestItem {
        return this.fromAny(value);
    }

    public override toJSON(verbose?: boolean | undefined, serializeAsString?: boolean | undefined): ConsentRequestItemJSON {
        return super.toJSON(verbose, serializeAsString) as ConsentRequestItemJSON;
    }
}
