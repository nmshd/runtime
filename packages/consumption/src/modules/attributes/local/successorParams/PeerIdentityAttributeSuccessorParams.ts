import { serialize, type, validate } from "@js-soft/ts-serval";
import { IdentityAttribute, IdentityAttributeJSON } from "@nmshd/content";
import { CoreId, ICoreId } from "@nmshd/core-types";
import { IPeerIdentityAttributeSharingInfo, PeerIdentityAttributeSharingInfo, PeerIdentityAttributeSharingInfoJSON } from "../PeerIdentityAttributeSharingInfo";
import { AbstractAttributeSuccessorParams, AbstractAttributeSuccessorParamsJSON, IAbstractAttributeSuccessorParams } from "./AbstractAttributeSuccessorParams";

export interface PeerIdentityAttributeSuccessorParamsJSON extends AbstractAttributeSuccessorParamsJSON {
    content: IdentityAttributeJSON;
    id: string;
    sharingInfo: PeerIdentityAttributeSharingInfoJSON; // TODO: omit deletionInfo?
}

export interface IPeerIdentityAttributeSuccessorParams extends IAbstractAttributeSuccessorParams {
    content: IdentityAttribute;
    id: ICoreId;
    sharingInfo: IPeerIdentityAttributeSharingInfo;
}

@type("PeerIdentityAttributeSuccessorParams")
export class PeerIdentityAttributeSuccessorParams extends AbstractAttributeSuccessorParams implements IPeerIdentityAttributeSuccessorParams {
    @validate()
    @serialize()
    public override content: IdentityAttribute;

    @validate()
    @serialize()
    public override id: CoreId;

    @validate({ nullable: true })
    @serialize()
    public sharingInfo: PeerIdentityAttributeSharingInfo;

    public static from(value: IPeerIdentityAttributeSuccessorParams | PeerIdentityAttributeSuccessorParamsJSON): PeerIdentityAttributeSuccessorParams {
        return this.fromAny(value);
    }
}
