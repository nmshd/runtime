import { serialize, type, validate } from "@js-soft/ts-serval";
import { CoreHash } from "../../../../core/types";
import { CertificateItem, ICertificateItem } from "../CertificateItem";

export interface ICertificatePrivateAttributeItem extends ICertificateItem {}

/**
 * A CertificatePrivateAttributeItem is a hashed representation of a single attribute,
 * consisting of a user-defined random nonce, the name of the attribute and its value.
 *
 * With this approach, one Certificate can be used for certifying multiple attributes,
 * but without leaking any private/confidential data. A user can still select the attributes to
 * share with a third party (e.g. name, address, email) while submitting a Certificate
 * certifying much more data (e.g. name, address, email, mobile, birthdate, tax id, ...). However,
 * the additional data within the shared certificate is of no value to the third party, without
 * the shared attributes (+ nonce).
 */
@type("CertificatePrivateAttributeItem")
export class CertificatePrivateAttributeItem extends CertificateItem {
    @validate()
    @serialize()
    public hash: CoreHash;

    public static override from(value: ICertificatePrivateAttributeItem): CertificatePrivateAttributeItem {
        return this.fromAny(value);
    }
}
