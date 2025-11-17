import { serialize, validate } from "@js-soft/ts-serval";
import { nameof } from "ts-simple-nameof";
import { AbstractComplexValue, AbstractComplexValueJSON, IAbstractComplexValue } from "../../AbstractComplexValue.js";
import { RenderHints, RenderHintsEditType, RenderHintsTechnicalType, ValueHints } from "../../hints/index.js";

export interface AbstractMeasurementJSON extends AbstractComplexValueJSON {
    unit: string;
    value: number;
}

export interface IMeasurement extends IAbstractComplexValue {
    unit: string;
    value: number;
}

/**
 * valid unit strings must be defined in the classes extending AbstractMeasurement as enum
 */
export abstract class AbstractMeasurement extends AbstractComplexValue implements IMeasurement {
    @serialize()
    @validate({ max: 50 })
    public unit: string;

    @serialize()
    @validate()
    public value: number;

    public static get valueHints(): ValueHints {
        return ValueHints.from({
            propertyHints: {
                [nameof<AbstractMeasurement>((a) => a.unit)]: ValueHints.from({}),
                [nameof<AbstractMeasurement>((a) => a.value)]: ValueHints.from({})
            }
        });
    }

    public static override get renderHints(): RenderHints {
        return super.renderHints.copyWith({
            propertyHints: {
                [nameof<AbstractMeasurement>((a) => a.unit)]: RenderHints.from({
                    editType: RenderHintsEditType.InputLike,
                    technicalType: RenderHintsTechnicalType.String
                }),
                [nameof<AbstractMeasurement>((a) => a.value)]: RenderHints.from({
                    editType: RenderHintsEditType.InputLike,
                    technicalType: RenderHintsTechnicalType.Integer
                })
            }
        });
    }

    public override toString(): string {
        return `${this.value} ${this.unit}`;
    }
}
