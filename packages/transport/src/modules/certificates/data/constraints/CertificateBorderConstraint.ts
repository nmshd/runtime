import { serialize, type, validate } from "@js-soft/ts-serval";
import { CertificateConstraint, ICertificateConstraint } from "../CertificateConstraint";

export interface ICertificateBorderConstraint extends ICertificateConstraint {
    union: string;
    country: string;
    state: string;
}

/**
 * A CertificateBorderConstraint specifies a state, a country or a union in which
 * this certificate should be valid.
 *
 * This constraint is primarily telling any verifier, that the issuer of the certificate does not
 * hold the eligibility to issue a certificate anywhere else. Thus, the certificate should be
 * treated as not valid outside the specified border.
 *
 * However, showing a certificate which is valid within a certain country (e.g. Germany) might be
 * much better than not having a certificate at all. Therefore, the verifier could still treat this
 * certificate as valid, although the issuer is no longer taking liability.
 *
 * Examples:
 *  - Freight papers for the EU
 *  - Access rights to buildings of the UN
 *  - German driver license
 */
@type("CertificateBorderConstraint")
export class CertificateBorderConstraint extends CertificateConstraint {
    @validate()
    @serialize()
    public union: string;

    @validate()
    @serialize()
    public country: string;

    @validate()
    @serialize()
    public state: string;

    public static override from(value: ICertificateBorderConstraint): CertificateBorderConstraint {
        return this.fromAny(value);
    }
}
