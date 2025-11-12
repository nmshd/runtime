import { serialize, validate } from "@js-soft/ts-serval";
import { nameof } from "ts-simple-nameof";
import { ValueHints, ValueHintsValue } from "../../hints/index.js";
import { AbstractMeasurement } from "./AbstractMeasurement.js";

export enum LengthUnit {
    NM = "nm",
    UM = "um",
    MM = "mm",
    CM = "cm",
    DM = "dm",
    M = "m",
    KM = "km",
    MI = "mi",
    YD = "yd",
    FT = "ft",
    SM = "sm",
    IN = "in"
}

export class AbstractLengthMeasurement extends AbstractMeasurement {
    @serialize()
    @validate({
        customValidator: (v) => (!Object.values(LengthUnit).includes(v) ? `must be one of: ${Object.values(LengthUnit)}` : undefined)
    })
    public override unit: LengthUnit;

    public static override get valueHints(): ValueHints {
        return super.valueHints.copyWith({
            propertyHints: {
                [nameof<AbstractLengthMeasurement>((a) => a.unit)]: ValueHints.from({
                    values: Object.entries(LengthUnit).map((v) =>
                        ValueHintsValue.from({
                            displayName: v[1],
                            key: v[0]
                        })
                    )
                })
            }
        });
    }
}
