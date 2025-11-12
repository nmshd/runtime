import { serialize, type, validate } from "@js-soft/ts-serval";
import { COUNTRIES_ALPHA2_TO_ENGLISH_NAME } from "@nmshd/core-types";
import { nameof } from "ts-simple-nameof";
import { AbstractAttributeValue } from "../../AbstractAttributeValue.js";
import { RenderHints, RenderHintsEditType, RenderHintsTechnicalType, ValueHints } from "../../hints/index.js";
import { IPhoneNumber, PhoneNumber } from "../communication/index.js";
import { AbstractAddress, AbstractAddressJSON, IAbstractAddress } from "./AbstractAddress.js";
import { City, ICity } from "./City.js";
import { Country, ICountry } from "./Country.js";
import { IState, State } from "./State.js";
import { IZipCode, ZipCode } from "./ZipCode.js";

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
        return super.valueHints.copyWith({
            propertyHints: {
                [nameof<DeliveryBoxAddress>((d) => d.userId)]: ValueHints.from({}),
                [nameof<DeliveryBoxAddress>((d) => d.deliveryBoxId)]: ValueHints.from({}),
                [nameof<DeliveryBoxAddress>((d) => d.zipCode)]: ZipCode.valueHints,
                [nameof<DeliveryBoxAddress>((d) => d.city)]: City.valueHints,
                [nameof<DeliveryBoxAddress>((d) => d.country)]: Country.valueHints,
                [nameof<DeliveryBoxAddress>((d) => d.phoneNumber)]: PhoneNumber.valueHints,
                [nameof<DeliveryBoxAddress>((d) => d.state)]: State.valueHints
            }
        });
    }

    public static override get renderHints(): RenderHints {
        return super.renderHints.copyWith({
            propertyHints: {
                [nameof<DeliveryBoxAddress>((d) => d.userId)]: RenderHints.from({
                    editType: RenderHintsEditType.InputLike,
                    technicalType: RenderHintsTechnicalType.String
                }),
                [nameof<DeliveryBoxAddress>((d) => d.deliveryBoxId)]: RenderHints.from({
                    editType: RenderHintsEditType.InputLike,
                    technicalType: RenderHintsTechnicalType.String
                }),
                [nameof<DeliveryBoxAddress>((d) => d.zipCode)]: ZipCode.renderHints,
                [nameof<DeliveryBoxAddress>((d) => d.city)]: City.renderHints,
                [nameof<DeliveryBoxAddress>((d) => d.country)]: Country.renderHints,
                [nameof<DeliveryBoxAddress>((d) => d.phoneNumber)]: PhoneNumber.renderHints,
                [nameof<DeliveryBoxAddress>((d) => d.state)]: State.renderHints
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
        value.push(countryName ?? this.country.toString());

        return value.join("\n");
    }

    public override toJSON(verbose?: boolean | undefined, serializeAsString?: boolean | undefined): DeliveryBoxAddressJSON {
        return super.toJSON(verbose, serializeAsString) as DeliveryBoxAddressJSON;
    }
}
