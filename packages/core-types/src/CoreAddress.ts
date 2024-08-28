import { ISerializable, Serializable, serialize, serializeOnly, type, validate } from "@js-soft/ts-serval";

export interface ICoreAddress extends ISerializable {
    address: string;
}

/**
 * A CoreAddress is the primariy technical identitier of an account.
 */
@type("CoreAddress")
@serializeOnly("address", "string")
export class CoreAddress extends Serializable {
    @validate()
    @serialize()
    public address: string;

    protected static override preFrom(value: any): any {
        if (typeof value === "string") {
            return { address: value };
        }

        return value;
    }

    public static from(value: ICoreAddress | string): CoreAddress {
        return this.fromAny(value);
    }

    public equals(address?: CoreAddress | string): boolean {
        if (address === undefined) return false;

        return this.address === address.toString();
    }

    public override toString(): string {
        return this.address;
    }

    public override serialize(): string {
        return this.address;
    }
}
