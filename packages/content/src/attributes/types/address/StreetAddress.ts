import { serialize, type, validate } from "@js-soft/ts-serval";
import { COUNTRIES_ALPHA2_TO_ENGLISH_NAME } from "@nmshd/core-types";
import { nameof } from "ts-simple-nameof";
import { AbstractAttributeValue } from "../../AbstractAttributeValue.js";
import { RenderHints, ValueHints } from "../../hints/index.js";
import { AbstractAddress, AbstractAddressJSON, IAbstractAddress } from "./AbstractAddress.js";
import { City, ICity } from "./City.js";
import { Country, ICountry } from "./Country.js";
import { HouseNumber, IHouseNumber } from "./HouseNumber.js";
import { IState, State } from "./State.js";
import { IStreet, Street } from "./Street.js";
import { IZipCode, ZipCode } from "./ZipCode.js";

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
                [nameof<StreetAddress>((s) => s.street)]: Street.valueHints,
                [nameof<StreetAddress>((s) => s.houseNo)]: HouseNumber.valueHints,
                [nameof<StreetAddress>((s) => s.zipCode)]: ZipCode.valueHints,
                [nameof<StreetAddress>((s) => s.city)]: City.valueHints,
                [nameof<StreetAddress>((s) => s.country)]: Country.valueHints,
                [nameof<StreetAddress>((s) => s.state)]: State.valueHints
            }
        });
    }

    public static override get renderHints(): RenderHints {
        return super.renderHints.copyWith({
            propertyHints: {
                [nameof<StreetAddress>((s) => s.street)]: Street.renderHints,
                [nameof<StreetAddress>((s) => s.houseNo)]: HouseNumber.renderHints,
                [nameof<StreetAddress>((s) => s.zipCode)]: ZipCode.renderHints,
                [nameof<StreetAddress>((s) => s.city)]: City.renderHints,
                [nameof<StreetAddress>((s) => s.country)]: Country.renderHints,
                [nameof<StreetAddress>((s) => s.state)]: State.renderHints
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
        value.push(countryName ?? this.country.toString());

        return value.join("\n");
    }

    public override toJSON(verbose?: boolean | undefined, serializeAsString?: boolean | undefined): StreetAddressJSON {
        return super.toJSON(verbose, serializeAsString) as StreetAddressJSON;
    }
}
