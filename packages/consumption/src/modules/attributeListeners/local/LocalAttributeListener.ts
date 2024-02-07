import { serialize, type, validate } from "@js-soft/ts-serval";
import {
    IdentityAttributeQuery,
    IdentityAttributeQueryJSON,
    IIdentityAttributeQuery,
    IThirdPartyRelationshipAttributeQuery,
    ThirdPartyRelationshipAttributeQuery,
    ThirdPartyRelationshipAttributeQueryJSON
} from "@nmshd/content";
import { CoreAddress, CoreSynchronizable, ICoreAddress, ICoreSynchronizable } from "@nmshd/transport";
import { nameof } from "ts-simple-nameof";

export interface LocalAttributeListenerJSON {
    "@type": "LocalAttributeListener";
    id: string;
    query: IdentityAttributeQueryJSON | ThirdPartyRelationshipAttributeQueryJSON;
    peer: string;
}

export interface ILocalAttributeListener extends ICoreSynchronizable {
    query: IIdentityAttributeQuery | IThirdPartyRelationshipAttributeQuery;
    peer: ICoreAddress;
}

@type("LocalAttributeListener")
export class LocalAttributeListener extends CoreSynchronizable {
    public override readonly userdataProperties = [nameof<LocalAttributeListener>((r) => r.query), nameof<LocalAttributeListener>((r) => r.peer)];

    @serialize({ unionTypes: [IdentityAttributeQuery, ThirdPartyRelationshipAttributeQuery] })
    @validate()
    public query: IdentityAttributeQuery | ThirdPartyRelationshipAttributeQuery;

    @serialize()
    @validate()
    public peer: CoreAddress;

    public static from(value: ILocalAttributeListener | LocalAttributeListenerJSON): LocalAttributeListener {
        return this.fromAny(value);
    }

    public override toJSON(): LocalAttributeListenerJSON {
        return super.toJSON() as LocalAttributeListenerJSON;
    }
}
