/* eslint-disable @typescript-eslint/no-inferrable-types */
import { Serializable, serialize, type, validate } from "@js-soft/ts-serval";
import { CoreDate, CoreId, CoreSerializable, ICoreDate, ICoreId, ICoreSerializable } from "../../../core";

export interface ISecretContainerPlain extends ICoreSerializable {
    id: ICoreId;
    name: string;
    description?: string;
    createdAt: ICoreDate;
    nonce?: number;
    validFrom: ICoreDate;
    validTo?: ICoreDate;
    active: boolean;
    secret: ICoreSerializable;
}

@type("SecretContainerPlain")
export class SecretContainerPlain extends CoreSerializable implements ISecretContainerPlain {
    @serialize()
    @validate()
    public id: CoreId;

    @serialize()
    @validate({ nullable: true })
    public name: string = "";

    @serialize()
    @validate({ nullable: true })
    public description: string = "";

    @serialize()
    @validate()
    public createdAt: CoreDate;

    @serialize()
    @validate()
    public validFrom: CoreDate;

    @serialize()
    @validate({ nullable: true })
    public validTo: CoreDate;

    @serialize()
    @validate({ nullable: true })
    public nonce?: number;

    @serialize()
    @validate()
    public active: boolean;

    @serialize()
    @validate()
    public secret: Serializable;

    public static from(value: ISecretContainerPlain): SecretContainerPlain {
        return this.fromAny(value);
    }
}
