import { serialize, validate } from "@js-soft/ts-serval";
import { nameof } from "ts-simple-nameof";
import { AbstractComplexValue, AbstractComplexValueJSON, IAbstractComplexValue } from "../../AbstractComplexValue.js";
import { RenderHints, RenderHintsEditType, RenderHintsTechnicalType, ValueHints } from "../../hints/index.js";

export interface AbstractAddressJSON extends AbstractComplexValueJSON {
    recipient: string;
}

export interface IAbstractAddress extends IAbstractComplexValue {
    recipient: string;
}

export abstract class AbstractAddress extends AbstractComplexValue implements IAbstractAddress {
    @serialize()
    @validate({ max: 100 })
    public recipient: string;

    public static get valueHints(): ValueHints {
        return ValueHints.from({
            propertyHints: {
                [nameof<AbstractAddress>((a) => a.recipient)]: ValueHints.from({})
            }
        });
    }

    public static override get renderHints(): RenderHints {
        return super.renderHints.copyWith({
            propertyHints: {
                [nameof<AbstractAddress>((a) => a.recipient)]: RenderHints.from({
                    editType: RenderHintsEditType.InputLike,
                    technicalType: RenderHintsTechnicalType.String
                })
            }
        });
    }
}
