import { ControllerName, TransportController } from "../../core";
import { AccountController } from "../accounts/AccountController";

/**
 * The CertificateValidator includes all functionality for validating certificates.
 * - Check Issuer (+Signature)
 * - Check Subject
 * - Check Revocation (online vs. cached)
 *   -> possibly register for push notifications on status changes of this certificate
 * - Check Constraints (Time, Region, ...)
 * - Check Content
 */
export class CertificateValidator extends TransportController {
    public constructor(parent: AccountController) {
        super(ControllerName.CertificateValidator, parent);
    }
}
