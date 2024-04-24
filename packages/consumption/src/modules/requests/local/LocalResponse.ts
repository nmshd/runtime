import { serialize, type, validate } from "@js-soft/ts-serval";
import { IResponse, Response } from "@nmshd/content";
import { CoreDate, CoreId, CoreSerializable, ICoreDate, ICoreId, ICoreSerializable } from "@nmshd/transport";

export interface ILocalResponseSource extends ICoreSerializable {
    type: "Message" | "Relationship";
    reference: ICoreId;
}

@type("LocalResponseSource")
export class LocalResponseSource extends CoreSerializable implements ILocalResponseSource {
    @serialize()
    @validate()
    public type: "Message" | "Relationship";

    @serialize()
    @validate()
    public reference: CoreId;

    public static from(value: ILocalResponseSource): LocalResponseSource {
        return this.fromAny(value);
    }
}

export interface ILocalResponse extends ICoreSerializable {
    createdAt: ICoreDate;
    content: IResponse;
    source?: ILocalResponseSource;
}

@type("LocalResponse")
export class LocalResponse extends CoreSerializable implements ILocalResponse {
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
