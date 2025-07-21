import { serialize, type, validate } from "@js-soft/ts-serval";
import { IdentityAttribute, IdentityAttributeJSON, IIdentityAttribute } from "@nmshd/content";
import { CoreAddress } from "@nmshd/core-types";
import { nameof } from "ts-simple-nameof";
import { IOwnIdentityAttributeSharingInfo, OwnAttributeDeletionStatus, OwnIdentityAttributeSharingInfo, OwnIdentityAttributeSharingInfoJSON } from "../sharingInfos";
import { ILocalAttribute, LocalAttribute, LocalAttributeJSON } from "./LocalAttribute";

export interface OwnIdentityAttributeJSON extends LocalAttributeJSON {
    "@type": "OwnIdentityAttribute";
    content: IdentityAttributeJSON;
    isDefault?: true;
    sharingInfos?: OwnIdentityAttributeSharingInfoJSON[];
}

export interface IOwnIdentityAttribute extends ILocalAttribute {
    content: IIdentityAttribute;
    isDefault?: true;
    sharingInfos?: IOwnIdentityAttributeSharingInfo[];
}

@type("OwnIdentityAttribute")
export class OwnIdentityAttribute extends LocalAttribute implements IOwnIdentityAttribute {
    public override readonly technicalProperties = ["@type", "@context", nameof<OwnIdentityAttribute>((r) => r.isDefault), nameof<OwnIdentityAttribute>((r) => r.sharingInfos)];

    @serialize()
    @validate()
    public override content: IdentityAttribute;

    @serialize()
    @validate({ nullable: true })
    public isDefault?: true;

    @serialize()
    @validate({ nullable: true })
    public sharingInfos?: OwnIdentityAttributeSharingInfo[];

    public isSharedWith(peerAddress: CoreAddress, includeDeletedAndToBeDeleted = false): boolean {
        if (!this.sharingInfos) return false;

        const sharingInfosWithPeer = this.sharingInfos.filter((sharingInfo) => sharingInfo.peer.equals(peerAddress));
        if (sharingInfosWithPeer.length === 0) return false;

        if (includeDeletedAndToBeDeleted) return true;

        const excludedDeletionStatuses = [OwnAttributeDeletionStatus.DeletedByPeer, OwnAttributeDeletionStatus.ToBeDeletedByPeer];
        return sharingInfosWithPeer.some((sharingInfo) => !sharingInfo.deletionInfo || !excludedDeletionStatuses.includes(sharingInfo.deletionInfo.deletionStatus));
    }

    public static override from(value: IOwnIdentityAttribute | OwnIdentityAttributeJSON): OwnIdentityAttribute {
        return super.fromAny(value) as OwnIdentityAttribute;
    }
}
