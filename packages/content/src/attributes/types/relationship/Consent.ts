import { Serializable, serialize, type, validate, ValidationError } from "@js-soft/ts-serval";
import { nameof } from "ts-simple-nameof";
import { AbstractAttributeValue, AbstractAttributeValueJSON, IAbstractAttributeValue } from "../../AbstractAttributeValue";
import { RenderHints, RenderHintsDataType, RenderHintsEditType, RenderHintsTechnicalType, ValueHints } from "../../hints";

export interface ConsentJSON extends AbstractAttributeValueJSON {
    consent: string;
    link?: string;
    linkDisplayText?: string;
}

export interface IConsent extends IAbstractAttributeValue {
    consent: string;
    link?: string;
    linkDisplayText?: string;
}

@type("Consent")
export class Consent extends AbstractAttributeValue implements IConsent {
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
    @validate({ nullable: true, min: 3, max: 30 })
    public linkDisplayText?: string;

    protected static override postFrom<T extends Serializable>(value: T): T {
        if (!(value instanceof Consent)) throw new Error("this should never happen");

        if (typeof value.linkDisplayText === "string" && typeof value.link === "undefined") {
            throw new ValidationError(
                Consent.name,
                nameof<Consent>((x) => x.linkDisplayText),
                `A ${nameof<Consent>((x) => x.linkDisplayText)} can only be defined if a ${nameof<Consent>((x) => x.link)} is defined too.`
            );
        }

        return value;
    }

    public static from(value: IConsent | Omit<ConsentJSON, "@type">): Consent {
        return this.fromAny(value);
    }

    public override toJSON(verbose?: boolean | undefined, serializeAsString?: boolean | undefined): ConsentJSON {
        return super.toJSON(verbose, serializeAsString) as ConsentJSON;
    }

    public static get valueHints(): ValueHints {
        return ValueHints.from({
            propertyHints: {
                consent: { max: 2000 },
                link: { min: 3, max: 1024 },
                linkDisplayText: { min: 3, max: 30 }
            }
        });
    }

    public static get renderHints(): RenderHints {
        return RenderHints.from({
            editType: RenderHintsEditType.Complex,
            technicalType: RenderHintsTechnicalType.Object,
            propertyHints: {
                consent: {
                    editType: RenderHintsEditType.TextArea,
                    technicalType: RenderHintsTechnicalType.String
                },
                link: {
                    editType: RenderHintsEditType.InputLike,
                    technicalType: RenderHintsTechnicalType.String,
                    dataType: RenderHintsDataType.URL
                }
            }
        });
    }
}
