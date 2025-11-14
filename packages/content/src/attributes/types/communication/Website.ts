import { type } from "@js-soft/ts-serval";
import { AbstractStringJSON, IAbstractString } from "../AbstractString.js";
import { AbstractURL } from "../strings/index.js";

export interface WebsiteJSON extends AbstractStringJSON {
    "@type": "Website";
}

export interface IWebsite extends IAbstractString {}

@type("Website")
export class Website extends AbstractURL implements IWebsite {
    public static from(value: IWebsite | Omit<WebsiteJSON, "@type"> | string): Website {
        return this.fromAny(value);
    }

    public override toJSON(verbose?: boolean | undefined, serializeAsString?: boolean | undefined): WebsiteJSON {
        return super.toJSON(verbose, serializeAsString) as WebsiteJSON;
    }
}
