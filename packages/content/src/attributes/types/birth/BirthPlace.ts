import { serialize, type, validate } from "@js-soft/ts-serval";
import nameOf from "easy-tsnameof";
import { AbstractAttributeValue } from "../../AbstractAttributeValue";
import { AbstractComplexValue, AbstractComplexValueJSON, IAbstractComplexValue } from "../../AbstractComplexValue";
import { RenderHints, ValueHints } from "../../hints";
import { BirthCity, IBirthCity } from "./BirthCity";
import { BirthCountry, IBirthCountry } from "./BirthCountry";
import { BirthState, IBirthState } from "./BirthState";

export interface BirthPlaceJSON extends AbstractComplexValueJSON {
    "@type": "BirthPlace";
    city: string;
    country: string;
    state?: string;
}

export interface IBirthPlace extends IAbstractComplexValue {
    city: IBirthCity | string;
    country: IBirthCountry | string;
    state?: IBirthState | string;
}

@type("BirthPlace")
export class BirthPlace extends AbstractComplexValue implements IBirthPlace {
    public static readonly propertyNames = nameOf<BirthPlace, never>();

    @serialize({ customGenerator: AbstractAttributeValue.valueGenerator })
    @validate()
    public city: BirthCity;

    @serialize({ customGenerator: AbstractAttributeValue.valueGenerator })
    @validate()
    public country: BirthCountry;

    @serialize({ customGenerator: AbstractAttributeValue.valueGenerator })
    @validate({ nullable: true })
    public state?: BirthState;

    public static get valueHints(): ValueHints {
        return ValueHints.from({
            propertyHints: {
                [this.propertyNames.city.$path]: BirthCity.valueHints,
                [this.propertyNames.country.$path]: BirthCountry.valueHints,
                [this.propertyNames.state.$path]: BirthState.valueHints
            }
        });
    }

    public static override get renderHints(): RenderHints {
        return super.renderHints.copyWith({
            propertyHints: {
                [this.propertyNames.city.$path]: BirthCity.renderHints,
                [this.propertyNames.country.$path]: BirthCountry.renderHints,
                [this.propertyNames.state.$path]: BirthState.renderHints
            }
        });
    }

    public static from(value: IBirthPlace | Omit<BirthPlaceJSON, "@type">): BirthPlace {
        return this.fromAny(value);
    }

    public override toString(): string {
        const value: string[] = [this.city.toString()];
        if (this.state) {
            value.push(this.state.toString());
        }
        value.push(this.country.toString());

        return value.join(", ");
    }

    public override toJSON(verbose?: boolean | undefined, serializeAsString?: boolean | undefined): BirthPlaceJSON {
        return super.toJSON(verbose, serializeAsString) as BirthPlaceJSON;
    }
}
