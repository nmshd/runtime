import { type } from "@js-soft/ts-serval";
import { AbstractStringJSON, IAbstractString } from "../AbstractString.js";
import { AbstractLanguage } from "../strings/AbstractLanguage.js";

export interface CommunicationLanguageJSON extends AbstractStringJSON {
    "@type": "CommunicationLanguage";
}

export interface ICommunicationLanguage extends IAbstractString {}

@type("CommunicationLanguage")
export class CommunicationLanguage extends AbstractLanguage implements ICommunicationLanguage {
    public static from(value: ICommunicationLanguage | Omit<CommunicationLanguageJSON, "@type"> | string): CommunicationLanguage {
        return this.fromAny(value);
    }

    public override toJSON(verbose?: boolean | undefined, serializeAsString?: boolean | undefined): CommunicationLanguageJSON {
        return super.toJSON(verbose, serializeAsString) as CommunicationLanguageJSON;
    }
}
