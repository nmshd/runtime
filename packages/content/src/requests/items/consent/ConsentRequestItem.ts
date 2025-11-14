import { Serializable, serialize, type, validate, ValidationError } from "@js-soft/ts-serval";
import { nameof } from "ts-simple-nameof";
import { IRequestItem, RequestItem, RequestItemJSON } from "../../RequestItem.js";

export interface ConsentRequestItemJSON extends RequestItemJSON {
    "@type": "ConsentRequestItem";
    consent: string;
    link?: string;
    linkDisplayText?: string;
    requiresInteraction?: boolean;
}

export interface IConsentRequestItem extends IRequestItem {
    consent: string;
    link?: string;
    linkDisplayText?: string;
    requiresInteraction?: boolean;
}

@type("ConsentRequestItem")
export class ConsentRequestItem extends RequestItem implements IConsentRequestItem {
    @serialize()
    @validate({ max: 10000 })
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
    @validate({ nullable: true, min: 3, max: 30 })
    public linkDisplayText?: string;

    @serialize()
    @validate({ nullable: true })
    public requiresInteraction?: boolean;

    protected static override postFrom<T extends Serializable>(value: T): T {
        if (!(value instanceof ConsentRequestItem)) throw new Error("this should never happen");

        if (typeof value.linkDisplayText === "string" && value.link === undefined) {
            throw new ValidationError(
                ConsentRequestItem.name,
                nameof<ConsentRequestItem>((x) => x.linkDisplayText),
                `A ${nameof<ConsentRequestItem>((x) => x.linkDisplayText)} can only be defined if a ${nameof<ConsentRequestItem>((x) => x.link)} is defined too.`
            );
        }

        return value;
    }

    public static from(value: IConsentRequestItem | Omit<ConsentRequestItemJSON, "@type"> | ConsentRequestItemJSON): ConsentRequestItem {
        return this.fromAny(value);
    }

    public override toJSON(verbose?: boolean | undefined, serializeAsString?: boolean | undefined): ConsentRequestItemJSON {
        return super.toJSON(verbose, serializeAsString) as ConsentRequestItemJSON;
    }
}
