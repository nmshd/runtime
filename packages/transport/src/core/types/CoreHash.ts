import { ISerializable, Serializable, serialize, serializeOnly, validate } from "@js-soft/ts-serval";
import { CoreBuffer, CryptoHash, CryptoHashAlgorithm, Encoding, ICoreBuffer } from "@nmshd/crypto";

export interface ICoreHash extends ISerializable {
    hash: string;
}

/**
 * Hash wraps a hash
 */
@serializeOnly("hash", "string")
export class CoreHash extends Serializable {
    @validate()
    @serialize()
    public hash: string;

    public override toString(): string {
        return this.hash;
    }

    /**
     * Creates a new hash of the given content
     *
     * @param content A String object of the content which should be hashed
     * @param algorithm The CryptoHashAlgorithm, defaults to SHA512
     * @returns A Promise resolving to the Hash object
     */
    public static async hash(content: string, algorithm: CryptoHashAlgorithm = 2): Promise<CoreHash> {
        const hash = await CryptoHash.hash(CoreBuffer.fromString(content, Encoding.Base64_UrlSafe_NoPadding), algorithm);
        return CoreHash.from(hash.toBase64());
    }

    /**
     * Verifies if the given content is creating the underlying hash with the
     * given hash algorithm.
     *
     * @param content A Buffer object of the content which should be equal to the hash
     * @param algorithm The CryptoHashAlgorithm, defaults to SHA512
     * @returns A Promise resolving to true if the content equals to the hash, or false otherwise
     */
    public async verify(content: ICoreBuffer, algorithm: CryptoHashAlgorithm = 2): Promise<boolean> {
        return await CryptoHash.verify(content, CoreBuffer.fromString(this.hash, Encoding.Base64_UrlSafe_NoPadding), algorithm);
    }

    protected static override preFrom(value: any): any {
        if (typeof value === "string") {
            return { hash: value };
        }

        return value;
    }

    /**
     * Creates a new Hash object from a given IHash or a string
     * @param value Hash, IHash or string
     */
    public static from(value: ICoreHash | string): CoreHash {
        return this.fromAny(value);
    }

    public override serialize(): string {
        return this.hash;
    }

    public toBase64(): string {
        return this.hash;
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
