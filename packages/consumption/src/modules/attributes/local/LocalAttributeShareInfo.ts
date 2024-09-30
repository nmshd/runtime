import { ISerializable, Serializable, serialize, validate, ValidationError } from "@js-soft/ts-serval";
import { CoreAddress, CoreId, ICoreAddress, ICoreId } from "@nmshd/core-types";
import { nameof } from "ts-simple-nameof";
import { ConsumptionError } from "../../../consumption/ConsumptionError";

/* Either of requestReference or notificationReference must be set, but not both. */
export interface LocalAttributeShareInfoJSON {
    requestReference?: string;
    notificationReference?: string;
    peer: string;
    sourceAttribute?: string;
    thirdPartyAddress?: string;
}

/* Either of requestReference or notificationReference must be set, but not both. */
export interface ILocalAttributeShareInfo extends ISerializable {
    requestReference?: ICoreId;
    notificationReference?: ICoreId;
    peer: ICoreAddress;
    sourceAttribute?: ICoreId;
    thirdPartyAddress?: ICoreAddress;
}

export class LocalAttributeShareInfo extends Serializable implements ILocalAttributeShareInfo {
    @serialize()
    @validate({ nullable: true })
    public requestReference?: CoreId;

    @serialize()
    @validate({ nullable: true })
    public notificationReference?: CoreId;

    @validate()
    @serialize()
    public peer: CoreAddress;

    @serialize()
    @validate({ nullable: true })
    public sourceAttribute?: CoreId;

    @serialize()
    @validate({ nullable: true })
    public thirdPartyAddress?: CoreAddress;

    public static from(value: ILocalAttributeShareInfo | LocalAttributeShareInfoJSON): LocalAttributeShareInfo {
        return super.fromAny(value) as LocalAttributeShareInfo;
    }

    protected static override postFrom<T extends Serializable>(value: T): T {
        if (!(value instanceof LocalAttributeShareInfo)) throw new ConsumptionError("this should never happen");

        if (!value.requestReference && !value.notificationReference) {
            throw new ValidationError(
                LocalAttributeShareInfo.name,
                nameof<LocalAttributeShareInfo>((x) => x.requestReference),
                `One of ${nameof<LocalAttributeShareInfo>((x) => x.requestReference)} or ${nameof<LocalAttributeShareInfo>((x) => x.notificationReference)} must be set.`
            );
        }

        if (value.requestReference && value.notificationReference) {
            throw new ValidationError(
                LocalAttributeShareInfo.name,
                nameof<LocalAttributeShareInfo>((x) => x.requestReference),
                `Both of ${nameof<LocalAttributeShareInfo>((x) => x.requestReference)} or ${nameof<LocalAttributeShareInfo>((x) => x.notificationReference)} must not be set.`
            );
        }

        return value;
    }
}
