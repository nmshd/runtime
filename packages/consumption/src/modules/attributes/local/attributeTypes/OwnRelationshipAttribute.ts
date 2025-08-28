import { serialize, type, validate } from "@js-soft/ts-serval";
import { IRelationshipAttribute, RelationshipAttribute, RelationshipAttributeJSON } from "@nmshd/content";
import { CoreAddress } from "@nmshd/core-types";
import { nameof } from "ts-simple-nameof";
import { ConsumptionCoreErrors } from "../../../../consumption/ConsumptionCoreErrors";
import {
    EmittedAttributeDeletionInfo,
    EmittedAttributeDeletionStatus,
    ForwardedSharingInfo,
    ForwardedSharingInfoJSON,
    IForwardedSharingInfo,
    IOwnRelationshipAttributeSharingInfo,
    OwnRelationshipAttributeSharingInfo,
    OwnRelationshipAttributeSharingInfoJSON
} from "../sharingInfos";
import { ILocalAttribute, LocalAttribute, LocalAttributeJSON } from "./LocalAttribute";

export interface OwnRelationshipAttributeJSON extends LocalAttributeJSON {
    "@type": "OwnRelationshipAttribute";
    content: RelationshipAttributeJSON;
    peerSharingInfo: OwnRelationshipAttributeSharingInfoJSON;
    forwardedSharingInfos?: ForwardedSharingInfoJSON[];
}

export interface IOwnRelationshipAttribute extends ILocalAttribute {
    content: IRelationshipAttribute;
    peerSharingInfo: IOwnRelationshipAttributeSharingInfo;
    forwardedSharingInfos?: IForwardedSharingInfo[];
}

@type("OwnRelationshipAttribute")
export class OwnRelationshipAttribute extends LocalAttribute implements IOwnRelationshipAttribute {
    public override readonly technicalProperties: string[] = [
        ...this.technicalProperties,
        "@type",
        "@context",
        nameof<OwnRelationshipAttribute>((r) => r.peerSharingInfo),
        nameof<OwnRelationshipAttribute>((r) => r.forwardedSharingInfos)
    ];

    @serialize({ customGenerator: (value: RelationshipAttribute) => value.toJSON(true) })
    @validate()
    public override content: RelationshipAttribute;

    @serialize()
    @validate()
    public peerSharingInfo: OwnRelationshipAttributeSharingInfo;

    @serialize({ type: ForwardedSharingInfo })
    @validate({ nullable: true })
    public forwardedSharingInfos?: ForwardedSharingInfo[];

    public isForwardedTo(peerAddress: CoreAddress, excludeToBeDeleted = false): boolean {
        if (!this.forwardedSharingInfos) return false;

        const sharingInfosWithPeer = this.forwardedSharingInfos.filter(
            (sharingInfo) => sharingInfo.peer.equals(peerAddress) && sharingInfo.deletionInfo?.deletionStatus !== EmittedAttributeDeletionStatus.DeletedByPeer
        );
        if (sharingInfosWithPeer.length === 0) return false;

        if (!excludeToBeDeleted) return true;

        return sharingInfosWithPeer.some((sharingInfo) => !sharingInfo.deletionInfo);
    }

    public isDeletedOrToBeDeletedByPeer(): boolean {
        if (!this.peerSharingInfo.deletionInfo) return false;

        const deletionStatuses = [EmittedAttributeDeletionStatus.DeletedByPeer, EmittedAttributeDeletionStatus.ToBeDeletedByPeer];
        return deletionStatuses.includes(this.peerSharingInfo.deletionInfo.deletionStatus);
    }

    public isDeletedOrToBeDeletedByForwardingPeer(peerAddress: CoreAddress): boolean {
        if (!this.forwardedSharingInfos) return false;

        const sharingInfosWithPeer = this.forwardedSharingInfos.filter((sharingInfo) => sharingInfo.peer.equals(peerAddress));
        if (sharingInfosWithPeer.length === 0) return false;

        const deletionStatuses = [EmittedAttributeDeletionStatus.DeletedByPeer, EmittedAttributeDeletionStatus.ToBeDeletedByPeer];

        const hasSharingInfoWithDeletionStatus = sharingInfosWithPeer.some(
            (sharingInfo) => sharingInfo.deletionInfo && deletionStatuses.includes(sharingInfo.deletionInfo.deletionStatus)
        );
        const hasSharingInfoWithoutDeletionStatus = sharingInfosWithPeer.some(
            (sharingInfo) => !sharingInfo.deletionInfo || !deletionStatuses.includes(sharingInfo.deletionInfo.deletionStatus)
        );
        return hasSharingInfoWithDeletionStatus && !hasSharingInfoWithoutDeletionStatus;
    }

    public isToBeDeletedByForwardingPeer(peerAddress: CoreAddress): boolean {
        if (!this.forwardedSharingInfos) return false;

        return this.forwardedSharingInfos.some(
            (sharingInfo) => sharingInfo.peer.equals(peerAddress) && sharingInfo.deletionInfo?.deletionStatus === EmittedAttributeDeletionStatus.ToBeDeletedByPeer
        );
    }

    public setPeerDeletionInfo(deletionInfo: EmittedAttributeDeletionInfo | undefined): this {
        this.peerSharingInfo.deletionInfo = deletionInfo;
        return this;
    }

    public setForwardedDeletionInfo(deletionInfo: EmittedAttributeDeletionInfo | undefined, thirdParty: CoreAddress): this {
        const sharingInfoForThirdParty = this.forwardedSharingInfos?.find((sharingInfo) => sharingInfo.peer.equals(thirdParty));
        if (!sharingInfoForThirdParty) throw ConsumptionCoreErrors.attributes.cannotSetAttributeDeletionInfoForPeer(this.id, thirdParty);

        sharingInfoForThirdParty.deletionInfo = deletionInfo;
        return this;
    }

    public getThirdParties(includeToBeDeleted = false): CoreAddress[] {
        const sharingInfos = includeToBeDeleted
            ? this.forwardedSharingInfos
            : this.forwardedSharingInfos?.filter((sharingInfo) => {
                  return sharingInfo.deletionInfo?.deletionStatus !== EmittedAttributeDeletionStatus.ToBeDeletedByPeer;
              });

        const thirdParty = sharingInfos?.map((sharingInfo) => sharingInfo.peer);
        if (!thirdParty) return [];

        return thirdParty;
    }

    public getForwardedSharingInfoForPeer(peer: CoreAddress): ForwardedSharingInfo | undefined {
        return this.forwardedSharingInfos?.find(
            (sharingInfo) => sharingInfo.peer.equals(peer) && sharingInfo.deletionInfo?.deletionStatus !== EmittedAttributeDeletionStatus.DeletedByPeer
        );
    }

    public upsertForwardedSharingInfoForPeer(peer: CoreAddress, sharingInfo: ForwardedSharingInfo): this {
        if (!this.forwardedSharingInfos) {
            this.forwardedSharingInfos = [sharingInfo];
            return this;
        }

        const indexForPeer = this.forwardedSharingInfos.findIndex(
            (sharingInfo) => sharingInfo.peer.equals(peer) && sharingInfo.deletionInfo?.deletionStatus !== EmittedAttributeDeletionStatus.DeletedByPeer
        );

        if (indexForPeer === -1) {
            this.forwardedSharingInfos.push(sharingInfo);
            return this;
        }

        this.forwardedSharingInfos[indexForPeer] = sharingInfo;
        return this;
    }

    public static override from(value: IOwnRelationshipAttribute | OwnRelationshipAttributeJSON): OwnRelationshipAttribute {
        return super.fromAny(value) as OwnRelationshipAttribute;
    }
}
