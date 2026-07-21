import { serialize, type, validate } from "@js-soft/ts-serval";
import { AbstractAttributeValue, AbstractAttributeValueJSON, IAbstractAttributeValue } from "../../AbstractAttributeValue";
import { RenderHints, RenderHintsEditType, RenderHintsTechnicalType, ValueHints } from "../../hints";

export interface DisplayInformationCachedImagesJSON extends AbstractAttributeValueJSON {
    "@type": "DisplayInformationCachedImages";
    locale?: string;
    logo?: string;
    backgroundImage?: string;
}

export interface IDisplayInformationCachedImages extends IAbstractAttributeValue {
    locale?: string;
    logo?: string;
    backgroundImage?: string;
}

@type("DisplayInformationCachedImages")
export class DisplayInformationCachedImages extends AbstractAttributeValue implements IDisplayInformationCachedImages {
    @serialize()
    @validate({ nullable: true })
    public locale?: string;

    @serialize()
    @validate({ nullable: true })
    public logo?: string;

    @serialize()
    @validate({ nullable: true })
    public backgroundImage?: string;

    public static get valueHints(): ValueHints {
        return ValueHints.from({});
    }

    public static get renderHints(): RenderHints {
        return RenderHints.from({
            editType: RenderHintsEditType.TextArea,
            technicalType: RenderHintsTechnicalType.Unknown
        });
    }

    public static from(value: IDisplayInformationCachedImages | Omit<DisplayInformationCachedImagesJSON, "@type">): DisplayInformationCachedImages {
        return this.fromAny(value);
    }

    public override toJSON(verbose?: boolean | undefined, serializeAsString?: boolean | undefined): DisplayInformationCachedImagesJSON {
        return super.toJSON(verbose, serializeAsString) as DisplayInformationCachedImagesJSON;
    }
}
