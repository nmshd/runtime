import { serialize, type, validate } from "@js-soft/ts-serval";
import { CoreDate, ICoreDate } from "../../../../core";
import { CertificateConstraint, ICertificateConstraint } from "../CertificateConstraint";

export interface ICertificateTimeConstraint extends ICertificateConstraint {
    validFrom: ICoreDate;
    validTo: ICoreDate;
}

/**
 * A CertificateTimeConstraint limits the validity of the certificate to the specified
 * dates. The certificate is not valid before the validFrom date, and not after the
 * validTo date.
 */
@type("CertificateTimeConstraint")
export class CertificateTimeConstraint extends CertificateConstraint {
    @validate()
    @serialize()
    public validFrom: CoreDate;

    @validate()
    @serialize()
    public validTo: CoreDate;

    public static override from(value: ICertificateTimeConstraint): CertificateTimeConstraint {
        return this.fromAny(value);
    }
}
