import { type } from "@js-soft/ts-serval";
import { IVerifiableCredential, VerifiableCredential, VerifiableCredentialJSON } from "./VerifiableCredential";

export interface VerifiablePresentationJSON extends VerifiableCredentialJSON {
    "@type": "VerifiableCredential";
}

export interface IVerifiablePresentation extends IVerifiableCredential {}

@type("VerifiablePresentation")
export class VerifiablePresentation extends VerifiableCredential implements IVerifiablePresentation {
    public static override from(value: IVerifiablePresentation | Omit<VerifiablePresentationJSON, "@type">): VerifiablePresentation {
        return this.fromAny(value);
    }

    public override toJSON(verbose?: boolean | undefined, serializeAsString?: boolean | undefined): VerifiablePresentationJSON {
        return super.toJSON(verbose, serializeAsString) as VerifiablePresentationJSON;
    }
}
