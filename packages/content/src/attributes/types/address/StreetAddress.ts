import { serialize, type, validate } from "@js-soft/ts-serval";
import { nameOf as nameof } from "easy-tsnameof";
import { AbstractAttributeValue } from "../../AbstractAttributeValue";
import { COUNTRIES_ALPHA2_TO_ENGLISH_NAME } from "../../constants";
import { RenderHints, ValueHints } from "../../hints";
import { AbstractAddress, AbstractAddressJSON, IAbstractAddress } from "./AbstractAddress";
import { City, ICity } from "./City";
import { Country, ICountry } from "./Country";
import { HouseNumber, IHouseNumber } from "./HouseNumber";
import { IState, State } from "./State";
import { IStreet, Street } from "./Street";
import { IZipCode, ZipCode } from "./ZipCode";

export interface StreetAddressJSON extends AbstractAddressJSON {
    "@type": "StreetAddress";
    street: string;
    houseNo: string;
    zipCode: string;
    city: string;
    country: string;
    state?: string;
}

export interface IStreetAddress extends IAbstractAddress {
    street: IStreet | string;
    houseNo: IHouseNumber | string;
    zipCode: IZipCode | string;
    city: ICity | string;
    country: ICountry | string;
    state?: IState | string;
}

@type("StreetAddress")
export class StreetAddress extends AbstractAddress implements IStreetAddress {
    public static override readonly propertyNames = nameof<StreetAddress, never>();

    @serialize({ customGenerator: AbstractAttributeValue.valueGenerator })
    @validate()
    public street: Street;

    @serialize({ customGenerator: AbstractAttributeValue.valueGenerator })
    @validate()
    public houseNo: HouseNumber;

    @serialize({ customGenerator: AbstractAttributeValue.valueGenerator })
    @validate()
    public zipCode: ZipCode;

    @serialize({ customGenerator: AbstractAttributeValue.valueGenerator })
    @validate()
    public city: City;

    @serialize({ customGenerator: AbstractAttributeValue.valueGenerator })
    @validate()
    public country: Country;

    @serialize({ customGenerator: AbstractAttributeValue.valueGenerator })
    @validate({ nullable: true })
    public state?: State;

    public static from(value: IStreetAddress | Omit<StreetAddressJSON, "@type">): StreetAddress {
        return this.fromAny(value);
    }

    public static override get valueHints(): ValueHints {
        return super.valueHints.copyWith({
            propertyHints: {
                [this.propertyNames.street.$path]: Street.valueHints,
                [this.propertyNames.houseNo.$path]: HouseNumber.valueHints,
                [this.propertyNames.zipCode.$path]: ZipCode.valueHints,
                [this.propertyNames.city.$path]: City.valueHints,
                [this.propertyNames.country.$path]: Country.valueHints,
                [this.propertyNames.state.$path]: State.valueHints
            }
        });
    }

    public static override get renderHints(): RenderHints {
        return super.renderHints.copyWith({
            propertyHints: {
                [this.propertyNames.street.$path]: Street.renderHints,
                [this.propertyNames.houseNo.$path]: HouseNumber.renderHints,
                [this.propertyNames.zipCode.$path]: ZipCode.renderHints,
                [this.propertyNames.city.$path]: City.renderHints,
                [this.propertyNames.country.$path]: Country.renderHints,
                [this.propertyNames.state.$path]: State.renderHints
            }
        });
    }

    public override toString(): string {
        const value: string[] = [];
        value.push(`${this.recipient}`);
        value.push(`${this.street} ${this.houseNo}`);
        value.push(`${this.zipCode} ${this.city}`);
        if (this.state) {
            value.push(this.state.toString());
        }
        const countryName = COUNTRIES_ALPHA2_TO_ENGLISH_NAME.get(this.country.value);
        value.push(countryName ? countryName : this.country.toString());

        return value.join("\n");
    }

    public override toJSON(verbose?: boolean | undefined, serializeAsString?: boolean | undefined): StreetAddressJSON {
        return super.toJSON(verbose, serializeAsString) as StreetAddressJSON;
    }
}
