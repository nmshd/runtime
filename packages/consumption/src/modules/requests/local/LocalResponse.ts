import { ISerializable, Serializable, serialize, type, validate } from "@js-soft/ts-serval";
import { IResponse, Response } from "@nmshd/content";
import { CoreDate, CoreId, ICoreDate, ICoreId } from "@nmshd/core-types";

export interface ILocalResponseSource extends ISerializable {
    type: "Message" | "Relationship";
    reference: ICoreId;
}

@type("LocalResponseSource")
export class LocalResponseSource extends Serializable implements ILocalResponseSource {
    @serialize()
    @validate({ allowedValues: ["Message", "Relationship"] })
    public type: "Message" | "Relationship";

    @serialize()
    @validate()
    public reference: CoreId;

    public static from(value: ILocalResponseSource): LocalResponseSource {
        return this.fromAny(value);
    }
}

export interface ILocalResponse extends ISerializable {
    createdAt: ICoreDate;
    content: IResponse;
    source?: ILocalResponseSource;
}

@type("LocalResponse")
export class LocalResponse extends Serializable implements ILocalResponse {
    @serialize()
    @validate()
    public createdAt: CoreDate;

    @serialize()
    @validate()
    public content: Response;

    @serialize()
    @validate({ nullable: true })
    public source?: LocalResponseSource;

    public static from(value: ILocalResponse): LocalResponse {
        return this.fromAny(value);
    }
}
