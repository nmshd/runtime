import { ISerializable, Serializable, serialize, type, validate } from "@js-soft/ts-serval";
import { CoreDate, ICoreDate } from "@nmshd/core-types";

export interface IdentityDeletionInfoJSON {
    isDeleted: boolean;
    deletionDate?: string;
}

export interface IIdentityDeletionInfo extends ISerializable {
    isDeleted: boolean;
    deletionDate?: ICoreDate;
}

@type("IdentityDeletionInfo")
export class IdentityDeletionInfo extends Serializable implements IIdentityDeletionInfo {
    @validate()
    @serialize()
    public isDeleted: boolean;

    @validate({ nullable: true })
    @serialize()
    public deletionDate?: CoreDate;

    public static from(value: IIdentityDeletionInfo | IdentityDeletionInfoJSON): IdentityDeletionInfo {
        return this.fromAny(value);
    }
}
