import { serialize, type, validate } from "@js-soft/ts-serval";
import { IRelationshipAttribute, RelationshipAttribute, RelationshipAttributeJSON } from "@nmshd/content";
import { CoreAddress, CoreId, ICoreAddress, ICoreId } from "@nmshd/core-types";
import { nameof } from "ts-simple-nameof";
import { ConsumptionCoreErrors } from "../../../../consumption/ConsumptionCoreErrors.js";
import { EmittedAttributeDeletionInfo, EmittedAttributeDeletionInfoJSON, EmittedAttributeDeletionStatus, IEmittedAttributeDeletionInfo } from "../deletionInfos/index.js";
import { ILocalAttribute, LocalAttribute, LocalAttributeJSON } from "./LocalAttribute.js";

export interface OwnRelationshipAttributeJSON extends LocalAttributeJSON {
    "@type": "OwnRelationshipAttribute";
    content: RelationshipAttributeJSON;
    peer: string;
    sourceReference: string;
    deletionInfo?: EmittedAttributeDeletionInfoJSON;
}

export interface IOwnRelationshipAttribute extends ILocalAttribute {
    content: IRelationshipAttribute;
    peer: ICoreAddress;
    sourceReference: ICoreId;
    deletionInfo?: IEmittedAttributeDeletionInfo;
}

@type("OwnRelationshipAttribute")
export class OwnRelationshipAttribute extends LocalAttribute implements IOwnRelationshipAttribute {
    public override readonly technicalProperties: string[] = [
        ...this.technicalProperties,
        "@type",
        "@context",
        nameof<OwnRelationshipAttribute>((r) => r.peer),
        nameof<OwnRelationshipAttribute>((r) => r.sourceReference),
        nameof<OwnRelationshipAttribute>((r) => r.deletionInfo)
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
    @validate({ nullable: true })
    public deletionInfo?: EmittedAttributeDeletionInfo;

    // this is not persisted, only used when returning Attributes via the API
    public numberOfForwards?: number;

    public isDeletedOrToBeDeletedByRecipient(): boolean {
        if (!this.deletionInfo) return false;

        const deletionStatuses = [EmittedAttributeDeletionStatus.DeletedByRecipient, EmittedAttributeDeletionStatus.ToBeDeletedByRecipient];
        return deletionStatuses.includes(this.deletionInfo.deletionStatus);
    }

    public setPeerDeletionInfo(deletionInfo: EmittedAttributeDeletionInfo | undefined, overrideDeleted = false): this {
        if (!overrideDeleted && this.deletionInfo?.deletionStatus === EmittedAttributeDeletionStatus.DeletedByRecipient) {
            throw ConsumptionCoreErrors.attributes.cannotSetAttributeDeletionInfo(this.id);
        }

        this.deletionInfo = deletionInfo;
        return this;
    }

    public static override from(value: IOwnRelationshipAttribute | OwnRelationshipAttributeJSON): OwnRelationshipAttribute {
        return super.fromAny(value) as OwnRelationshipAttribute;
    }
}
