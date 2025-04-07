import { serialize, type, validate } from "@js-soft/ts-serval";
import { AbstractAttributeValue, AbstractAttributeValueJSON, IAbstractAttributeValue } from "../../AbstractAttributeValue";
import { RenderHints, RenderHintsDataType, RenderHintsEditType, RenderHintsTechnicalType, ValueHints } from "../../hints";

export interface ConsentJSON extends AbstractAttributeValueJSON {
    consent: string;
    link?: string;
    linkText?: string;
}

export interface IConsent extends IAbstractAttributeValue {
    consent: string;
    link?: string;
    linkText?: string;
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
    @validate({ nullable: true })
    public linkText?: string;

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
                link: {
                    min: 3,
                    max: 1024
                }
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
