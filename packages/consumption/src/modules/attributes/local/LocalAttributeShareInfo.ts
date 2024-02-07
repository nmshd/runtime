import { Serializable, serialize, validate, ValidationError } from "@js-soft/ts-serval";
import { CoreAddress, CoreId, CoreSerializable, ICoreAddress, ICoreId } from "@nmshd/transport";
import { nameof } from "ts-simple-nameof";
import { ConsumptionError } from "../../../consumption/ConsumptionError";

/* Either of requestReference or noticicationReference must be set, but not both. */
export interface LocalAttributeShareInfoJSON {
    requestReference?: string;
    notificationReference?: string;

    peer: string;
    sourceAttribute?: string;
}

/* Either of requestReference or noticicationReference must be set, but not both. */
export interface ILocalAttributeShareInfo {
    requestReference?: ICoreId;
    notificationReference?: ICoreId;

    peer: ICoreAddress;
    sourceAttribute?: ICoreId;
}

export class LocalAttributeShareInfo extends CoreSerializable implements ILocalAttributeShareInfo {
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

    public static from(value: ILocalAttributeShareInfo | LocalAttributeShareInfoJSON): LocalAttributeShareInfo {
        return super.fromAny(value) as LocalAttributeShareInfo;
    }

    protected static override postFrom<T extends Serializable>(value: T): T {
        if (!(value instanceof LocalAttributeShareInfo)) {
            throw new ConsumptionError("this should never happen");
        }

        if (typeof value.requestReference === "undefined" && typeof value.notificationReference === "undefined") {
            throw new ValidationError(
                LocalAttributeShareInfo.name,
                nameof<LocalAttributeShareInfo>((x) => x.requestReference),
                `One of ${nameof<LocalAttributeShareInfo>((x) => x.requestReference)} or ${nameof<LocalAttributeShareInfo>((x) => x.notificationReference)} must be set.`
            );
        }

        if (typeof value.requestReference !== "undefined" && typeof value.notificationReference !== "undefined") {
            throw new ValidationError(
                LocalAttributeShareInfo.name,
                nameof<LocalAttributeShareInfo>((x) => x.requestReference),
                `Both of ${nameof<LocalAttributeShareInfo>((x) => x.requestReference)} or ${nameof<LocalAttributeShareInfo>((x) => x.notificationReference)} must not be set.`
            );
        }

        return value;
    }
}
