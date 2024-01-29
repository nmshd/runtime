import { type } from "@js-soft/ts-serval";
import { CoreSerializable, ICoreSerializable } from "../../../core";

export interface ICertificateConstraint extends ICoreSerializable {}

/**
 * A CertificateConstraint limits a Certificate to a specific time, region or identity.
 */
@type("CertificateConstraint")
export class CertificateConstraint extends CoreSerializable {
    public static from(value: ICertificateConstraint): CertificateConstraint {
        return this.fromAny(value);
    }
}
