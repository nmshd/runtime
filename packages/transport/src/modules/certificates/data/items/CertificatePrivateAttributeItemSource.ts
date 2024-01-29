import { serialize, type, validate } from "@js-soft/ts-serval";
import { CoreHash } from "../../../../core/types";
import { CertificateItem, ICertificateItem } from "../CertificateItem";

export interface ICertificatePrivateAttributeItemSource extends ICertificateItem {
    nonce: string;
    name: string;
    value: string;
}

/**
 * A CertificatePrivateAttributeItemSource is the cleartext version of a
 * CertificatePrivateAttributeItem.
 *
 * With this approach, one Certificate can be used for certifying multiple attributes,
 * but without leaking any private/confidential data. A user can still select the attributes to
 * share with a third party (e.g. name, address, email) while submitting a Certificate
 * certifying much more data (e.g. name, address, email, mobile, birthdate, tax id, ...). However,
 * the additional data within the shared certificate is of no value to the third party, without
 * the shared attributes (+ nonce).
 */
@type("CertificatePrivateAttributeItem")
export class CertificatePrivateAttributeItemSource extends CertificateItem {
    @validate()
    @serialize()
    public nonce: string;

    @validate()
    @serialize()
    public name: string;

    @validate()
    @serialize()
    public value: string;

    public async hash(): Promise<CoreHash> {
        return await CoreHash.hash(`${this.nonce}|${this.name}|${this.value}`);
    }

    public static override from(value: ICertificatePrivateAttributeItemSource): CertificatePrivateAttributeItemSource {
        return this.fromAny(value);
    }
}
