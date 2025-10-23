import { ISerializable, Serializable, serialize, type, validate } from "@js-soft/ts-serval";
import { IdentityAttribute, IdentityAttributeJSON } from "@nmshd/content";
import { CoreId, ICoreId } from "@nmshd/core-types";

export interface PeerIdentityAttributeSuccessorParamsJSON {
    content: IdentityAttributeJSON;
    id: string;
    sourceReference: string;
}

export interface IPeerIdentityAttributeSuccessorParams extends ISerializable {
    content: IdentityAttribute;
    id: ICoreId;
    sourceReference: ICoreId;
}

@type("PeerIdentityAttributeSuccessorParams")
export class PeerIdentityAttributeSuccessorParams extends Serializable implements IPeerIdentityAttributeSuccessorParams {
    @validate()
    @serialize()
    public content: IdentityAttribute;

    @validate()
    @serialize()
    public id: CoreId;

    @validate({ nullable: true })
    @serialize()
    public sourceReference: CoreId;

    public static from(value: IPeerIdentityAttributeSuccessorParams | PeerIdentityAttributeSuccessorParamsJSON): PeerIdentityAttributeSuccessorParams {
        return this.fromAny(value);
    }
}
