import { serialize, type, validate } from "@js-soft/ts-serval";
import { IRequestItem, RequestItem, RequestItemJSON } from "../../RequestItem";

export interface AuthenticationRequestItemJSON extends RequestItemJSON {
    "@type": "AuthenticationRequestItem";
    title: string;
}

export interface IAuthenticationRequestItem extends IRequestItem {
    title: string;
}

@type("AuthenticationRequestItem")
export class AuthenticationRequestItem extends RequestItem implements IAuthenticationRequestItem {
    @serialize()
    @validate({ max: 200 })
    public override title: string;

    public static from(value: IAuthenticationRequestItem | Omit<AuthenticationRequestItemJSON, "@type"> | AuthenticationRequestItemJSON): AuthenticationRequestItem {
        return this.fromAny(value);
    }

    public override toJSON(verbose?: boolean | undefined, serializeAsString?: boolean | undefined): AuthenticationRequestItemJSON {
        return super.toJSON(verbose, serializeAsString) as AuthenticationRequestItemJSON;
    }
}
