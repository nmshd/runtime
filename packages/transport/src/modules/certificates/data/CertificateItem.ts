import { type } from "@js-soft/ts-serval";
import { CoreSerializable, ICoreSerializable } from "../../../core";

export interface ICertificateItem extends ICoreSerializable {}

/**
 * A CertificateItem is a digitally signed hash with information about the signature date,
 * the signer, the signature algorithm and the version.
 */
@type("CertificateItem")
export class CertificateItem extends CoreSerializable {
    public static from(value: ICertificateItem): CertificateItem {
        return this.fromAny(value);
    }
}
