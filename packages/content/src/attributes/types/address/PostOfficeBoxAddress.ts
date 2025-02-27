import { serialize, type, validate } from "@js-soft/ts-serval";
import { nameof } from "ts-simple-nameof";
import { AbstractAttributeValue } from "../../AbstractAttributeValue";
import { COUNTRIES_ALPHA2_TO_ENGLISH_NAME } from "../../constants";
import { characterSets } from "../../constants/CharacterSets";
import { RenderHints, RenderHintsEditType, RenderHintsTechnicalType, ValueHints } from "../../hints";
import { AbstractAddress, AbstractAddressJSON, IAbstractAddress } from "./AbstractAddress";
import { City, ICity } from "./City";
import { Country, ICountry } from "./Country";
import { IState, State } from "./State";
import { IZipCode, ZipCode } from "./ZipCode";

export interface PostOfficeBoxAddressJSON extends AbstractAddressJSON {
    "@type": "PostOfficeBoxAddress";
    boxId: string;
    zipCode: string;
    city: string;
    country: string;
    state?: string;
}

export interface IPostOfficeBoxAddress extends IAbstractAddress {
    boxId: string;
    zipCode: IZipCode | string;
    city: ICity | string;
    country: ICountry | string;
    state?: IState | string;
}

@type("PostOfficeBoxAddress")
export class PostOfficeBoxAddress extends AbstractAddress implements IPostOfficeBoxAddress {
    @serialize()
    @validate({ max: 100, regExp: characterSets.din91379DatatypeB })
    public boxId: string;

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

    public static override get valueHints(): ValueHints {
        return super.valueHints.copyWith({
            propertyHints: {
                [nameof<PostOfficeBoxAddress>((p) => p.boxId)]: ValueHints.from({ pattern: characterSets.din91379DatatypeB.toString().slice(1, -1).replaceAll("/", "\\/") }),
                [nameof<PostOfficeBoxAddress>((p) => p.zipCode)]: ZipCode.valueHints,
                [nameof<PostOfficeBoxAddress>((p) => p.city)]: City.valueHints,
                [nameof<PostOfficeBoxAddress>((p) => p.country)]: Country.valueHints,
                [nameof<PostOfficeBoxAddress>((p) => p.state)]: State.valueHints
            }
        });
    }

    public static override get renderHints(): RenderHints {
        return super.renderHints.copyWith({
            propertyHints: {
                [nameof<PostOfficeBoxAddress>((p) => p.boxId)]: RenderHints.from({
                    editType: RenderHintsEditType.InputLike,
                    technicalType: RenderHintsTechnicalType.String
                }),
                [nameof<PostOfficeBoxAddress>((p) => p.zipCode)]: ZipCode.renderHints,
                [nameof<PostOfficeBoxAddress>((p) => p.city)]: City.renderHints,
                [nameof<PostOfficeBoxAddress>((p) => p.country)]: Country.renderHints,
                [nameof<PostOfficeBoxAddress>((p) => p.state)]: State.renderHints
            }
        });
    }

    public static from(value: IPostOfficeBoxAddress | Omit<PostOfficeBoxAddressJSON, "@type">): PostOfficeBoxAddress {
        return this.fromAny(value);
    }

    public override toString(): string {
        const value: string[] = [];
        value.push(`${this.recipient}`);
        value.push(`${this.boxId}`);
        value.push(`${this.zipCode} ${this.city}`);
        if (this.state) {
            value.push(this.state.toString());
        }
        const countryName = COUNTRIES_ALPHA2_TO_ENGLISH_NAME.get(this.country.value);
        value.push(countryName ?? this.country.toString());

        return value.join("\n");
    }

    public override toJSON(verbose?: boolean | undefined, serializeAsString?: boolean | undefined): PostOfficeBoxAddressJSON {
        return super.toJSON(verbose, serializeAsString) as PostOfficeBoxAddressJSON;
    }
}
