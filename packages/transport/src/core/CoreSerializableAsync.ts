import { ISerializableAsync, SerializableAsync, type } from "@js-soft/ts-serval";
import { CoreBuffer } from "@nmshd/crypto";

export interface ICoreSerializableAsync extends ISerializableAsync {}

/**
 * CoreSerializableAsync is the local pendant of the SerializableAsync class which
 * automatically validates, serializes, deserializes and validates again.
 *
 * With the asynchronous class, the deserialize methods (from and deserialize)
 * are called asynchronous (returning a Promise). You should only use CoreSerializableAsync
 * classes if properties with CoreSerializableAsync types are used.
 */
@type("CoreSerializableAsync")
export class CoreSerializableAsync extends SerializableAsync implements ISerializableAsync {
    public toBase64(): string {
        return CoreBuffer.fromUtf8(this.serialize()).toBase64URL();
    }

    public static async fromBase64T<T>(value: string): Promise<T> {
        const serialized = CoreBuffer.fromBase64URL(value).toUtf8();
        const deserializePromise = (this as any).deserialize(serialized) as Promise<T>;
        return await deserializePromise;
    }

    public static async fromBase64Unknown(value: string): Promise<SerializableAsync> {
        const serialized = CoreBuffer.fromBase64URL(value).toUtf8();
        return await SerializableAsync.deserializeUnknown(serialized);
    }
}
