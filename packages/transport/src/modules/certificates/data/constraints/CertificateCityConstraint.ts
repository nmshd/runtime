import { serialize, type, validate } from "@js-soft/ts-serval";
import { CertificateConstraint, ICertificateConstraint } from "../CertificateConstraint";

export interface ICertificateCityConstraint extends ICertificateConstraint {
    city: string;
    zipCode: string;
}

/**
 * A CertificateCityConstraint specifies the district, city and zip code in which the
 * certificate is valid.
 *
 * This constraint is primarily telling any verifier, that the issuer of the certificate does not
 * hold the eligibility to issue a certificate anywhere else. Thus, the certificate should be
 * treated as not valid outside the specified city.
 *
 * However, showing a certificate which is valid within a certain city (e.g. Cologne) might be
 * much better than not having a certificate at all. Therefore, the verifier could still treat this
 * certificate as valid, although the issuer is no longer taking liability.
 *
 * Consider using a CertificateBorderConstraint with a CertificateCityConstraint, otherwise the city
 * could not be unique in the world.
 *
 * Examples:
 *  - Parking permits within a city
 *  - Public transport tickets
 *  - City-Inhabitant IDs
 */
@type("CertificateCityConstraint")
export class CertificateCityConstraint extends CertificateConstraint {
    @validate()
    @serialize()
    public district: string;

    @validate()
    @serialize()
    public city: string;

    @validate()
    @serialize()
    public zipCode: string;

    public static override from(value: ICertificateCityConstraint): CertificateCityConstraint {
        return this.fromAny(value);
    }
}
