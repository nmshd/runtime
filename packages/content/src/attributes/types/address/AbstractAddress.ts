import { serialize, validate } from "@js-soft/ts-serval";
import nameOf from "easy-tsnameof";
import { AbstractComplexValue, AbstractComplexValueJSON, IAbstractComplexValue } from "../../AbstractComplexValue";
import { RenderHints, RenderHintsEditType, RenderHintsTechnicalType, ValueHints } from "../../hints";

export interface AbstractAddressJSON extends AbstractComplexValueJSON {
    recipient: string;
}

export interface IAbstractAddress extends IAbstractComplexValue {
    recipient: string;
}

export abstract class AbstractAddress extends AbstractComplexValue implements IAbstractAddress {
    public static readonly propertyNames = nameOf<AbstractAddress, never>();

    @serialize()
    @validate({ max: 100 })
    public recipient: string;

    public static get valueHints(): ValueHints {
        return ValueHints.from({
            propertyHints: {
                [this.propertyNames.recipient.$path]: ValueHints.from({})
            }
        });
    }

    public static override get renderHints(): RenderHints {
        return super.renderHints.copyWith({
            propertyHints: {
                [this.propertyNames.recipient.$path]: RenderHints.from({
                    editType: RenderHintsEditType.InputLike,
                    technicalType: RenderHintsTechnicalType.String
                })
            }
        });
    }
}
