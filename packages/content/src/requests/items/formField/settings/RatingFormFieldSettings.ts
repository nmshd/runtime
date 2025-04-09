import { ISerializable, Serializable, serialize, validate } from "@js-soft/ts-serval";

type MaxRating = 5 | 6 | 7 | 8 | 9 | 10;

export interface RatingFormFieldSettingsJSON {
    maxRating: MaxRating;
}

export interface IRatingFormFieldSettings extends ISerializable {
    maxRating: MaxRating;
}

export class RatingFormFieldSettings extends Serializable implements IRatingFormFieldSettings {
    @serialize()
    @validate()
    public maxRating: MaxRating;

    public static from(value: IRatingFormFieldSettings | RatingFormFieldSettingsJSON): RatingFormFieldSettings {
        return this.fromAny(value);
    }
}
