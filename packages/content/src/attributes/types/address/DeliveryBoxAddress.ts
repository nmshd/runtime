import { serialize, type, validate } from "@js-soft/ts-serval";
import nameOf from "easy-tsnameof";
import { AbstractAttributeValue } from "../../AbstractAttributeValue";
import { COUNTRIES_ALPHA2_TO_ENGLISH_NAME } from "../../constants";
import { RenderHints, RenderHintsEditType, RenderHintsTechnicalType, ValueHints } from "../../hints";
import { IPhoneNumber, PhoneNumber } from "../communication";
import { AbstractAddress, AbstractAddressJSON, IAbstractAddress } from "./AbstractAddress";
import { City, ICity } from "./City";
import { Country, ICountry } from "./Country";
import { IState, State } from "./State";
import { IZipCode, ZipCode } from "./ZipCode";

export interface DeliveryBoxAddressJSON extends AbstractAddressJSON {
    "@type": "DeliveryBoxAddress";
    userId: string;
    deliveryBoxId: string;
    zipCode: string;
    city: string;
    country: string;
    phoneNumber?: string;
    state?: string;
}

export interface IDeliveryBoxAddress extends IAbstractAddress {
    userId: string;
    deliveryBoxId: string;
    zipCode: IZipCode | string;
    city: ICity | string;
    country: ICountry | string;
    phoneNumber?: IPhoneNumber | string;
    state?: IState | string;
}

@type("DeliveryBoxAddress")
export class DeliveryBoxAddress extends AbstractAddress implements IDeliveryBoxAddress {
    public static override readonly propertyNames = nameOf<DeliveryBoxAddress, never>();

    @serialize()
    @validate({ max: 100 })
    public userId: string;

    @serialize()
    @validate({ max: 100 })
    public deliveryBoxId: string;

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
    public phoneNumber?: PhoneNumber;

    @serialize({ customGenerator: AbstractAttributeValue.valueGenerator })
    @validate({ nullable: true })
    public state?: State;

    public static override get valueHints(): ValueHints {
        return ValueHints.from({
            propertyHints: {
                [this.propertyNames.userId.$path]: ValueHints.from({}),
                [this.propertyNames.deliveryBoxId.$path]: ValueHints.from({}),
                [this.propertyNames.zipCode.$path]: ZipCode.valueHints,
                [this.propertyNames.city.$path]: City.valueHints,
                [this.propertyNames.country.$path]: Country.valueHints,
                [this.propertyNames.phoneNumber.$path]: PhoneNumber.valueHints,
                [this.propertyNames.state.$path]: State.valueHints
            }
        });
    }

    public static override get renderHints(): RenderHints {
        return super.renderHints.copyWith({
            propertyHints: {
                [this.propertyNames.userId.$path]: RenderHints.from({
                    editType: RenderHintsEditType.InputLike,
                    technicalType: RenderHintsTechnicalType.String
                }),
                [this.propertyNames.deliveryBoxId.$path]: RenderHints.from({
                    editType: RenderHintsEditType.InputLike,
                    technicalType: RenderHintsTechnicalType.String
                }),
                [this.propertyNames.zipCode.$path]: ZipCode.renderHints,
                [this.propertyNames.city.$path]: City.renderHints,
                [this.propertyNames.country.$path]: Country.renderHints,
                [this.propertyNames.phoneNumber.$path]: PhoneNumber.renderHints,
                [this.propertyNames.state.$path]: State.renderHints
            }
        });
    }

    public static from(value: IDeliveryBoxAddress | Omit<DeliveryBoxAddressJSON, "@type">): DeliveryBoxAddress {
        return this.fromAny(value);
    }

    public override toString(): string {
        const value: string[] = [];
        value.push(`${this.recipient}`);
        value.push(`${this.userId}`);
        if (this.phoneNumber) {
            value.push(this.phoneNumber.toString());
        }
        value.push(`${this.deliveryBoxId}`);
        value.push(`${this.zipCode} ${this.city}`);
        if (this.state) {
            value.push(this.state.toString());
        }
        const countryName = COUNTRIES_ALPHA2_TO_ENGLISH_NAME.get(this.country.value);
        value.push(countryName ? countryName : this.country.toString());

        return value.join("\n");
    }

    public override toJSON(verbose?: boolean | undefined, serializeAsString?: boolean | undefined): DeliveryBoxAddressJSON {
        return super.toJSON(verbose, serializeAsString) as DeliveryBoxAddressJSON;
    }
}
