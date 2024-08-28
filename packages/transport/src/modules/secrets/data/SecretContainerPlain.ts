/* eslint-disable @typescript-eslint/no-inferrable-types */
import { ISerializable, Serializable, serialize, type, validate } from "@js-soft/ts-serval";
import { CoreDate, CoreId, ICoreDate, ICoreId } from "@nmshd/core-types";

export interface ISecretContainerPlain extends ISerializable {
    id: ICoreId;
    name: string;
    description?: string;
    createdAt: ICoreDate;
    nonce?: number;
    validFrom: ICoreDate;
    validTo?: ICoreDate;
    active: boolean;
    secret: ISerializable;
}

@type("SecretContainerPlain")
export class SecretContainerPlain extends Serializable implements ISecretContainerPlain {
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
