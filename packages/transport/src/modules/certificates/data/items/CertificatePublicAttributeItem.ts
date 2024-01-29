import { serialize, type, validate } from "@js-soft/ts-serval";
import { CertificateItem, ICertificateItem } from "../CertificateItem";

export interface ICertificatePublicAttributeItem extends ICertificateItem {
    name: string;
    value: string;
}

/**
 * A CertificatePublicAttributeItem is a representation of a single attribute,
 * consisting of a name of the attribute and its value.
 */
@type("CertificatePublicAttributeItem")
export class CertificatePublicAttributeItem extends CertificateItem {
    @validate()
    @serialize()
    public name: string;

    @validate()
    @serialize()
    public value: string;

    public static override from(value: ICertificatePublicAttributeItem): CertificatePublicAttributeItem {
        return this.fromAny(value);
    }
}
