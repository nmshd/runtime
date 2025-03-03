import { ISerializable, Serializable, type } from "@js-soft/ts-serval";

export interface ICertificateItem extends ISerializable {}

/**
 * A CertificateItem is a digitally signed hash with information about the signature date,
 * the signer, the signature algorithm and the version.
 */
@type("CertificateItem")
export class CertificateItem extends Serializable {
    public static from(value: ICertificateItem): CertificateItem {
        return this.fromAny(value);
    }
}
