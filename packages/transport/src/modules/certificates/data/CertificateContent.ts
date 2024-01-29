import { serialize, type, validate } from "@js-soft/ts-serval";
import { CryptoSignaturePublicKey, ICryptoSignaturePublicKey } from "@nmshd/crypto";
import { CoreAddress, CoreDate, CoreSerializable, ICoreAddress, ICoreDate, ICoreSerializable } from "../../../core";
import { CertificateConstraint, ICertificateConstraint } from "./CertificateConstraint";
import { CertificateItem, ICertificateItem } from "./CertificateItem";

export interface ICertificateContent extends ICoreSerializable {
    issuedAt: ICoreDate;
    issuer: ICoreAddress;
    issuerData?: ICoreSerializable;
    subject: ICoreAddress;
    subjectPublicKey: ICryptoSignaturePublicKey;
    constraints: ICertificateConstraint[];
    items: ICertificateItem[];
}

/**
 * A CertificateContent is the content which should be digitally signed. The digital signature
 * is done on top of the serialized content of this data structure.
 */
@type("CertificateContent")
export class CertificateContent extends CoreSerializable {
    @validate()
    @serialize()
    public issuedAt: CoreDate;

    @validate()
    @serialize()
    public issuer: CoreAddress;

    @validate()
    @serialize()
    public issuerData: CoreSerializable;

    @validate()
    @serialize()
    public subject: CoreAddress;

    @validate()
    @serialize()
    public subjectPublicKey: CryptoSignaturePublicKey;

    @validate()
    @serialize({ type: CertificateConstraint })
    public constraints: CertificateConstraint[];

    @validate()
    @serialize({ type: CertificateItem })
    public items: CertificateItem[];

    public static from(value: ICertificateContent): CertificateContent {
        return this.fromAny(value);
    }
}
