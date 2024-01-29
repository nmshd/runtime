import { serialize, type, validate } from "@js-soft/ts-serval";
import { CertificateItem, ICertificateItem } from "../CertificateItem";

export interface ICertificateRoleItem extends ICertificateItem {
    role: string;
}

/**
 * A CertificateRoleItem certifies a certain role, that the subject got from
 * the issuer.
 *
 * Example:
 *  - Employee
 *  - Administrator
 */
@type("CertificateRoleItem")
export class CertificateRoleItem extends CertificateItem {
    @validate()
    @serialize()
    public role: string;

    public static override from(value: ICertificateRoleItem): CertificateRoleItem {
        return this.fromAny(value);
    }
}
