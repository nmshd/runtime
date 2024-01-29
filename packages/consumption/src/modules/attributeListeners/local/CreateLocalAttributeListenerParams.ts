import { ISerializable, Serializable, serialize, type, validate } from "@js-soft/ts-serval";
import { IdentityAttributeQuery, IIdentityAttributeQuery, IThirdPartyRelationshipAttributeQuery, ThirdPartyRelationshipAttributeQuery } from "@nmshd/content";
import { CoreAddress, ICoreAddress } from "@nmshd/transport";

export interface ICreateLocalAttributeListenerParams extends ISerializable {
    query: IIdentityAttributeQuery | IThirdPartyRelationshipAttributeQuery;
    peer: ICoreAddress;
}

@type("CreateLocalAttributeListenerParams")
export class CreateLocalAttributeListenerParams extends Serializable implements ICreateLocalAttributeListenerParams {
    @serialize({ unionTypes: [IdentityAttributeQuery, ThirdPartyRelationshipAttributeQuery] })
    @validate()
    public query: IdentityAttributeQuery | ThirdPartyRelationshipAttributeQuery;

    @serialize()
    @validate()
    public peer: CoreAddress;

    public static from(value: ICreateLocalAttributeListenerParams): CreateLocalAttributeListenerParams {
        return this.fromAny(value);
    }
}
