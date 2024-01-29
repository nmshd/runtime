import { serialize, type, validate } from "@js-soft/ts-serval";
import { CoreBuffer, CryptoSignature, CryptoSignaturePublicKey, ICryptoSignature } from "@nmshd/crypto";
import { CoreCrypto, CoreSerializable, ICoreSerializable } from "../../../core";

export interface ICertificate extends ICoreSerializable {
    content: string;
    signature: ICryptoSignature;
}

/**
 * A Certificate is digitally signed data which is issued by one user A (issuer) for another user B (subject).
 * The subject is eligible to share the certificate to any other user C, who in turn can verify, if the information
 * provided really comes from user A. Certificates always contain structured data, thus it is machine readable and
 * can be used for automatic checks.
 *
 * The content of a certificate is comparable with standardized SSL/TLS certificates, but they are not compatible
 * with each other. However, the content can be transformed.
 *
 *
 */
@type("Certificate")
export class Certificate extends CoreSerializable {
    @validate()
    @serialize()
    public content: string;

    @validate()
    @serialize()
    public signature: CryptoSignature;

    public static from(value: ICertificate): Certificate {
        return this.fromAny(value);
    }

    /**
     * Checks the validity of the digital signature. You have to provide the
     * public key of the issuer.
     *
     * Careful: This method does only check the digital signature (if the certificate
     * really comes from the issuer). Anything else, like validity, revocation or other
     * constraints is not checked!
     *
     * @param publicKey The issuer's public key.
     */
    public async verify(publicKey: CryptoSignaturePublicKey): Promise<boolean> {
        const buffer = CoreBuffer.fromUtf8(this.content);
        const correct = await CoreCrypto.verify(buffer, this.signature, publicKey);
        return correct;
    }
}
