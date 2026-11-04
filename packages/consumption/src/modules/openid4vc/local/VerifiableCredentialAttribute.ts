import { IdentityAttribute, VerifiableCredential } from "@nmshd/content";
import { LocalAttribute, OwnIdentityAttribute } from "../../attributes";

export interface OwnIdentityAttributeWithVerifiableCredential extends OwnIdentityAttribute {
    content: IdentityAttribute<VerifiableCredential>;
}

export function isVerifiableCredentialAttribute(attribute: LocalAttribute | undefined): attribute is OwnIdentityAttributeWithVerifiableCredential {
    return attribute instanceof OwnIdentityAttribute && attribute.content.value instanceof VerifiableCredential;
}
