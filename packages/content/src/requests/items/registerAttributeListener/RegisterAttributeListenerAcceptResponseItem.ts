import { serialize, type, validate } from "@js-soft/ts-serval";
import { AcceptResponseItem, AcceptResponseItemJSON, IAcceptResponseItem } from "../../response";

export interface RegisterAttributeListenerAcceptResponseItemJSON extends AcceptResponseItemJSON {
    "@type": "RegisterAttributeListenerAcceptResponseItem";
    listenerId: string;
}

export interface IRegisterAttributeListenerAcceptResponseItem extends IAcceptResponseItem {
    listenerId: string;
}

@type("RegisterAttributeListenerAcceptResponseItem")
export class RegisterAttributeListenerAcceptResponseItem extends AcceptResponseItem {
    @serialize()
    @validate({ max: 30 })
    public listenerId: string;

    public static override from(
        value: IRegisterAttributeListenerAcceptResponseItem | Omit<RegisterAttributeListenerAcceptResponseItemJSON, "@type">
    ): RegisterAttributeListenerAcceptResponseItem {
        return this.fromAny(value);
    }

    public override toJSON(verbose?: boolean | undefined, serializeAsString?: boolean | undefined): RegisterAttributeListenerAcceptResponseItemJSON {
        return super.toJSON(verbose, serializeAsString) as RegisterAttributeListenerAcceptResponseItemJSON;
    }
}
