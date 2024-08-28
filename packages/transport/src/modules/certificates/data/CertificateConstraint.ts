import { ISerializable, Serializable, type } from "@js-soft/ts-serval";

export interface ICertificateConstraint extends ISerializable {}

/**
 * A CertificateConstraint limits a Certificate to a specific time, region or identity.
 */
@type("CertificateConstraint")
export class CertificateConstraint extends Serializable {
    public static from(value: ICertificateConstraint): CertificateConstraint {
        return this.fromAny(value);
    }
}
