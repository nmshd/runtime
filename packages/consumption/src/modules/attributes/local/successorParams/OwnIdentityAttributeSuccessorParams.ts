import { serialize, type, validate } from "@js-soft/ts-serval";
import { IdentityAttribute, IdentityAttributeJSON } from "@nmshd/content";
import { CoreId, ICoreId } from "@nmshd/core-types";
import { IOwnIdentityAttributeSharingInfo, OwnIdentityAttributeSharingInfo, OwnIdentityAttributeSharingInfoJSON } from "../OwnIdentityAttributeSharingInfo";
import { AbstractAttributeSuccessorParams, AbstractAttributeSuccessorParamsJSON, IAbstractAttributeSuccessorParams } from "./AbstractAttributeSuccessorParams";

export interface OwnIdentityAttributeSuccessorParamsJSON extends AbstractAttributeSuccessorParamsJSON {
    content: IdentityAttributeJSON;
    id?: string;
    sharingInfo?: OwnIdentityAttributeSharingInfoJSON; // TODO: with the current logic we don't need this, since we succeed and share in subsequent steps
}

export interface IOwnIdentityAttributeSuccessorParams extends IAbstractAttributeSuccessorParams {
    content: IdentityAttribute;
    id?: ICoreId;
    sharingInfo?: IOwnIdentityAttributeSharingInfo;
}

@type("OwnIdentityAttributeSuccessorParams")
export class OwnIdentityAttributeSuccessorParams extends AbstractAttributeSuccessorParams implements IOwnIdentityAttributeSuccessorParams {
    @validate()
    @serialize()
    public override content: IdentityAttribute;

    @validate({ nullable: true })
    @serialize()
    public override id?: CoreId;

    @validate({ nullable: true })
    @serialize()
    public sharingInfo?: OwnIdentityAttributeSharingInfo;

    public static from(value: IOwnIdentityAttributeSuccessorParams | OwnIdentityAttributeSuccessorParamsJSON): OwnIdentityAttributeSuccessorParams {
        return this.fromAny(value);
    }
}
