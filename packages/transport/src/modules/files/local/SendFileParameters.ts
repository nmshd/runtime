import { ISerializable, Serializable, serialize, type, validate } from "@js-soft/ts-serval";
import { CoreDate, ICoreDate } from "@nmshd/core-types";
import { CoreBuffer, ICoreBuffer } from "@nmshd/crypto";

export interface ISendFileParameters extends ISerializable {
    title: string;
    description: string;
    filename: string;
    mimetype: string;
    expiresAt: ICoreDate;
    filemodified?: ICoreDate;
    buffer: ICoreBuffer;
}

@type("SendFileParameters")
export class SendFileParameters extends Serializable implements ISendFileParameters {
    @validate()
    @serialize()
    public title: string;
    @validate()
    @serialize()
    public description: string;
    @validate()
    @serialize()
    public filename: string;
    @validate()
    @serialize()
    public mimetype: string;
    @validate()
    @serialize()
    public expiresAt: CoreDate;

    @validate({ nullable: true })
    @serialize()
    public filemodified?: CoreDate;

    @validate()
    @serialize()
    public buffer: CoreBuffer;

    public static from(value: ISendFileParameters): SendFileParameters {
        return this.fromAny(value);
    }
}
