import { ISerializable, Serializable, serialize, type, validate } from "@js-soft/ts-serval";
import { CoreId, ICoreId } from "@nmshd/core-types";

export interface IDatawalletModification extends ISerializable {
    localId: ICoreId;
    objectIdentifier: ICoreId;
    payloadCategory?: DatawalletModificationCategory;
    collection: string;
    type: DatawalletModificationType;
    payload?: object;
    datawalletVersion?: number;
}

export enum DatawalletModificationType {
    Create = "Create",
    Update = "Update",
    Delete = "Delete",
    CacheChanged = "CacheChanged"
}

export enum DatawalletModificationCategory {
    TechnicalData = "TechnicalData",
    Content = "Content",
    Userdata = "Userdata",
    Metadata = "Metadata"
}

@type("DatawalletModification")
export class DatawalletModification extends Serializable implements IDatawalletModification {
    @validate()
    @serialize()
    public localId: CoreId;

    @validate()
    @serialize()
    public objectIdentifier: CoreId;

    @validate({ nullable: true })
    @serialize()
    public payloadCategory?: DatawalletModificationCategory;

    @validate()
    @serialize()
    public collection: string;

    @validate()
    @serialize()
    public type: DatawalletModificationType;

    @validate({ nullable: true })
    @serialize()
    public payload?: object;

    @validate({ nullable: true })
    @serialize()
    public datawalletVersion?: number;

    public static from(value: IDatawalletModification): DatawalletModification {
        return this.fromAny(value);
    }
}
