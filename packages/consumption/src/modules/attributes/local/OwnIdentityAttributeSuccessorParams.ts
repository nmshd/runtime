import { ISerializable, Serializable, serialize, type, validate } from "@js-soft/ts-serval";
import { IdentityAttribute, IdentityAttributeJSON } from "@nmshd/content";
import { CoreId, ICoreId } from "@nmshd/core-types";
import { IOwnIdentityAttributeSharingInfo, OwnIdentityAttributeSharingInfo, OwnIdentityAttributeSharingInfoJSON } from "./OwnIdentityAttributeSharingInfo";

// TODO: put into index file and check all imports (after adding folders)
export interface OwnIdentityAttributeSuccessorParamsJSON {
    content: IdentityAttributeJSON;
    sharingInfo?: OwnIdentityAttributeSharingInfoJSON; // TODO: with the current logic we don't need this, since we succeed and share in subsequent steps
    id?: string;
}

export interface IOwnIdentityAttributeSuccessorParams extends ISerializable {
    content: IdentityAttribute;
    sharingInfo?: IOwnIdentityAttributeSharingInfo;
    id?: ICoreId;
}

@type("OwnIdentityAttributeSuccessorParams")
export class OwnIdentityAttributeSuccessorParams extends Serializable implements IOwnIdentityAttributeSuccessorParams {
    @validate()
    @serialize()
    public content: IdentityAttribute;

    @validate({ nullable: true })
    @serialize()
    public sharingInfo?: OwnIdentityAttributeSharingInfo;

    @validate({ nullable: true })
    @serialize()
    public id?: CoreId;

    public static from(value: IOwnIdentityAttributeSuccessorParams | OwnIdentityAttributeSuccessorParamsJSON): OwnIdentityAttributeSuccessorParams {
        return this.fromAny(value);
    }
}
