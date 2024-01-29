import { serialize, validate } from "@js-soft/ts-serval";
import nameOf from "easy-tsnameof";
import { AbstractComplexValue, AbstractComplexValueJSON, IAbstractComplexValue } from "../../AbstractComplexValue";
import { RenderHints, RenderHintsEditType, RenderHintsTechnicalType, ValueHints } from "../../hints";

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
    public static readonly propertyNames = nameOf<AbstractMeasurement, never>();

    @serialize()
    @validate({ max: 50 })
    public unit: string;

    @serialize()
    @validate()
    public value: number;

    public static get valueHints(): ValueHints {
        return ValueHints.from({
            propertyHints: {
                [this.propertyNames.unit.$path]: ValueHints.from({}),
                [this.propertyNames.value.$path]: ValueHints.from({})
            }
        });
    }

    public static override get renderHints(): RenderHints {
        return super.renderHints.copyWith({
            propertyHints: {
                [this.propertyNames.unit.$path]: RenderHints.from({
                    editType: RenderHintsEditType.InputLike,
                    technicalType: RenderHintsTechnicalType.String
                }),
                [this.propertyNames.value.$path]: RenderHints.from({
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
