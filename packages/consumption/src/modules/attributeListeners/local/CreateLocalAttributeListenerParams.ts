import { ISerializable, Serializable, serialize, validate } from "@js-soft/ts-serval";
import { IIdentityAttributeQuery, IThirdPartyRelationshipAttributeQuery, IdentityAttributeQuery, ThirdPartyRelationshipAttributeQuery } from "@nmshd/content";
import { CoreAddress, ICoreAddress } from "@nmshd/transport";

export interface ICreateLocalAttributeListenerParams extends ISerializable {
    query: IIdentityAttributeQuery | IThirdPartyRelationshipAttributeQuery;
    peer: ICoreAddress;
}

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
