import { ISerializable, Serializable, type } from "@js-soft/ts-serval";
import { CoreBuffer } from "@nmshd/crypto";

export interface ICoreSerializable extends ISerializable {}

/**
 * CoreSerializable is the local pendant of the Serializable class which
 * automatically validates, serializes, deserializes and validates again.
 *
 * With the synchronous class, the deserialize methods (from and deserialize)
 * are called synchronous. Please be aware, that CoreSerializable classes should
 * have no CoreSerializableAsync properties.
 */

@type("CoreSerializable")
export class CoreSerializable extends Serializable implements ISerializable {
    public toBase64(): string {
        return CoreBuffer.fromUtf8(this.serialize()).toBase64URL();
    }

    public static fromBase64T<T>(value: string): T {
        const serialized = CoreBuffer.fromBase64URL(value).toUtf8();
        return (this as any).deserialize(serialized);
    }

    public static fromBase64Unknown(value: string): Serializable {
        const serialized = CoreBuffer.fromBase64URL(value).toUtf8();
        return Serializable.deserializeUnknown(serialized);
    }
}
