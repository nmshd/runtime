import { serialize, type, validate } from "@js-soft/ts-serval";
import { IRelationshipAttribute, RelationshipAttribute, RelationshipAttributeJSON } from "@nmshd/content";
import { CoreAddress, CoreId, ICoreAddress, ICoreId } from "@nmshd/core-types";
import { nameof } from "ts-simple-nameof";
import { ConsumptionCoreErrors } from "../../../../consumption/ConsumptionCoreErrors";
import { IReceivedAttributeDeletionInfo, ReceivedAttributeDeletionInfo, ReceivedAttributeDeletionInfoJSON, ReceivedAttributeDeletionStatus } from "../deletionInfos";
import { ILocalAttribute, LocalAttribute, LocalAttributeJSON } from "./LocalAttribute";

export interface ThirdPartyRelationshipAttributeJSON extends LocalAttributeJSON {
    "@type": "ThirdPartyRelationshipAttribute";
    content: RelationshipAttributeJSON;
    peer: string;
    sourceReference: string;
    initialAttributePeer: string;
    deletionInfo?: ReceivedAttributeDeletionInfoJSON;
}

export interface IThirdPartyRelationshipAttribute extends ILocalAttribute {
    content: IRelationshipAttribute;
    peer: ICoreAddress;
    sourceReference: ICoreId;
    initialAttributePeer: ICoreAddress;
    deletionInfo?: IReceivedAttributeDeletionInfo;
}

@type("ThirdPartyRelationshipAttribute")
export class ThirdPartyRelationshipAttribute extends LocalAttribute implements IThirdPartyRelationshipAttribute {
    public override readonly technicalProperties: string[] = [
        ...this.technicalProperties,
        "@type",
        "@context",
        nameof<ThirdPartyRelationshipAttribute>((r) => r.peer),
        nameof<ThirdPartyRelationshipAttribute>((r) => r.sourceReference),
        nameof<ThirdPartyRelationshipAttribute>((r) => r.initialAttributePeer),
        nameof<ThirdPartyRelationshipAttribute>((r) => r.deletionInfo)
    ];

    @serialize({ customGenerator: (value: RelationshipAttribute) => value.toJSON(true) })
    @validate()
    public override content: RelationshipAttribute;

    @validate()
    @serialize()
    public peer: CoreAddress;

    @serialize()
    @validate()
    public sourceReference: CoreId;

    @serialize()
    @validate()
    public initialAttributePeer: CoreAddress;

    @serialize()
    @validate({ nullable: true })
    public deletionInfo?: ReceivedAttributeDeletionInfo;

    public isDeletedByEmitterOrToBeDeleted(): boolean {
        if (!this.deletionInfo) return false;

        const deletionStatuses = [ReceivedAttributeDeletionStatus.DeletedByEmitter, ReceivedAttributeDeletionStatus.ToBeDeleted];
        return deletionStatuses.includes(this.deletionInfo.deletionStatus);
    }

    public isToBeDeleted(): boolean {
        return this.deletionInfo?.deletionStatus === ReceivedAttributeDeletionStatus.ToBeDeleted;
    }

    public setPeerDeletionInfo(deletionInfo: ReceivedAttributeDeletionInfo | undefined, overrideDeleted = false): this {
        if (!overrideDeleted && this.deletionInfo?.deletionStatus === ReceivedAttributeDeletionStatus.DeletedByEmitter) {
            throw ConsumptionCoreErrors.attributes.cannotSetAttributeDeletionInfo(this.id);
        }

        this.deletionInfo = deletionInfo;
        return this;
    }

    public peerIsOwner(): boolean {
        return this.peer.equals(this.content.owner);
    }

    public static override from(value: IThirdPartyRelationshipAttribute | ThirdPartyRelationshipAttributeJSON): ThirdPartyRelationshipAttribute {
        return super.fromAny(value) as ThirdPartyRelationshipAttribute;
    }
}
