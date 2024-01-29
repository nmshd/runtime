import { IDatabaseCollection } from "@js-soft/docdb-access-abstractions";
import { CoreBuffer, ICryptoSignaturePublicKey } from "@nmshd/crypto";
import { ControllerName, CoreDate, ICoreAddress, ICoreDate, TransportController } from "../../core";
import { DbCollectionName } from "../../core/DbCollectionName";
import { AccountController } from "../accounts/AccountController";
import { Certificate } from "./data/Certificate";
import { ICertificateConstraint } from "./data/CertificateConstraint";
import { CertificateContent, ICertificateContent } from "./data/CertificateContent";
import { ICertificateItem } from "./data/CertificateItem";

/**
 * The CertificateIssuer combines the functionality to create new certificates
 * for own identity (e.g. for technical communication) or others (e.g. verification
 * of other identities or certification of attributes).
 */
export class CertificateIssuer extends TransportController {
    public certificatesIssued: IDatabaseCollection;

    public constructor(parent: AccountController) {
        super(ControllerName.CertificateIssuer, parent);
    }

    public override async init(): Promise<this> {
        await super.init();

        this.certificatesIssued = await this.db.getCollection(DbCollectionName.CertificatesIssued);
        return this;
    }

    public async issueCertificate(value: CertificateContentParam | ICertificateContent): Promise<Certificate> {
        const content = CertificateContent.from(value);
        const serializedContent = content.serialize();
        const contentBuffer: CoreBuffer = CoreBuffer.fromUtf8(serializedContent);

        const signature = await this.parent.identity.sign(contentBuffer);

        const cert: Certificate = Certificate.from({
            content: serializedContent,
            signature: signature
        });
        return cert;
    }
}

export class CertificateContentParam implements ICertificateContent {
    public issuedAt: ICoreDate = CoreDate.utc();
    public issuer: ICoreAddress;
    public subject: ICoreAddress;
    public subjectPublicKey: ICryptoSignaturePublicKey;
    public constraints: ICertificateConstraint[];
    public items: ICertificateItem[];
}
