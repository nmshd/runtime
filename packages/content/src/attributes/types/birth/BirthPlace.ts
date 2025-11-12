import { serialize, type, validate } from "@js-soft/ts-serval";
import { nameof } from "ts-simple-nameof";
import { AbstractAttributeValue } from "../../AbstractAttributeValue.js";
import { AbstractComplexValue, AbstractComplexValueJSON, IAbstractComplexValue } from "../../AbstractComplexValue.js";
import { RenderHints, ValueHints } from "../../hints/index.js";
import { BirthCity, IBirthCity } from "./BirthCity.js";
import { BirthCountry, IBirthCountry } from "./BirthCountry.js";
import { BirthState, IBirthState } from "./BirthState.js";

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
                [nameof<BirthPlace>((b) => b.city)]: BirthCity.valueHints,
                [nameof<BirthPlace>((b) => b.country)]: BirthCountry.valueHints,
                [nameof<BirthPlace>((b) => b.state)]: BirthState.valueHints
            }
        });
    }

    public static override get renderHints(): RenderHints {
        return super.renderHints.copyWith({
            propertyHints: {
                [nameof<BirthPlace>((b) => b.city)]: BirthCity.renderHints,
                [nameof<BirthPlace>((b) => b.country)]: BirthCountry.renderHints,
                [nameof<BirthPlace>((b) => b.state)]: BirthState.renderHints
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
