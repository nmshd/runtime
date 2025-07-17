import { serialize, validate } from "@js-soft/ts-serval";
import { AbstractAttributeSharingInfo, AbstractAttributeSharingInfoJSON, IAbstractAttributeSharingInfo } from "./AbstractAttributeSharingInfo";
import { IOwnAttributeDeletionInfo, OwnAttributeDeletionInfo, OwnAttributeDeletionInfoJSON } from "./OwnAttributeDeletionInfo";

export interface OwnIdentityAttributeSharingInfoJSON extends AbstractAttributeSharingInfoJSON {
    deletionInfo?: OwnAttributeDeletionInfoJSON;
}

export interface IOwnIdentityAttributeSharingInfo extends IAbstractAttributeSharingInfo {
    deletionInfo?: IOwnAttributeDeletionInfo;
}

export class OwnIdentityAttributeSharingInfo extends AbstractAttributeSharingInfo implements IOwnIdentityAttributeSharingInfo {
    @serialize()
    @validate({ nullable: true })
    public override deletionInfo?: OwnAttributeDeletionInfo;

    public static from(value: IOwnIdentityAttributeSharingInfo | OwnIdentityAttributeSharingInfoJSON): OwnIdentityAttributeSharingInfo {
        return super.fromAny(value) as OwnIdentityAttributeSharingInfo;
    }
}
