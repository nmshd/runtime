import { ISerializable, Serializable, serialize, serializeOnly, type, validate } from "@js-soft/ts-serval";

export interface ICoreId extends ISerializable {
    id: string;
}

/**
 * A CoreId is any kind of identifier we have in the system.
 */
@type("CoreId")
@serializeOnly("id", "string")
export class CoreId extends Serializable implements ICoreId {
    @validate()
    @serialize()
    public id: string;

    public override toString(): string {
        return this.id;
    }

    public equals(id: CoreId | string): boolean {
        return this.id === id.toString();
    }

    public static from(value: ICoreId | string): CoreId {
        return this.fromAny(value);
    }

    protected static override preFrom(value: any): any {
        if (typeof value === "string") {
            return { id: value };
        }

        return value;
    }

    public override serialize(): string {
        return this.id;
    }
}
