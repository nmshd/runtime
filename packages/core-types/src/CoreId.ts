import { serialize, serializeOnly, type, validate } from "@js-soft/ts-serval";
import { CoreSerializable, ICoreSerializable } from "./CoreSerializable";

export interface ICoreId extends ICoreSerializable {
    id: string;
}

/**
 * A CoreId is any kind of identifier we have in the system.
 */
@type("CoreId")
@serializeOnly("id", "string")
export class CoreId extends CoreSerializable implements ICoreId {
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
