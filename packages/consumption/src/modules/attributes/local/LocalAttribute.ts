import { serialize, type, validate } from "@js-soft/ts-serval";
import {
    AbstractComplexValue,
    IIdentityAttribute,
    IRelationshipAttribute,
    IdentityAttribute,
    IdentityAttributeJSON,
    RelationshipAttribute,
    RelationshipAttributeJSON
} from "@nmshd/content";
import { CoreAddress, CoreDate, CoreId, ICoreDate, ICoreId } from "@nmshd/core-types";
import { CoreSynchronizable, ICoreSynchronizable } from "@nmshd/transport";
import { nameof } from "ts-simple-nameof";
import { ConsumptionCoreErrors } from "../../../consumption/ConsumptionCoreErrors";
import { ConsumptionIds } from "../../../consumption/ConsumptionIds";
import { ILocalAttributeDeletionInfo, LocalAttributeDeletionInfo, LocalAttributeDeletionInfoJSON, LocalAttributeDeletionStatus } from "./LocalAttributeDeletionInfo";
import { ILocalAttributeShareInfo, LocalAttributeShareInfo, LocalAttributeShareInfoJSON } from "./LocalAttributeShareInfo";

export interface LocalAttributeJSON {
    content: IdentityAttributeJSON | RelationshipAttributeJSON;
    createdAt: string;
    succeeds?: string;
    succeededBy?: string;
    shareInfo?: LocalAttributeShareInfoJSON;
    deletionInfo?: LocalAttributeDeletionInfoJSON;
    parentId?: string;
    isDefault?: true;
}

export interface ILocalAttribute extends ICoreSynchronizable {
    content: IIdentityAttribute | IRelationshipAttribute;
    createdAt: ICoreDate;
    succeeds?: ICoreId;
    succeededBy?: ICoreId;
    shareInfo?: ILocalAttributeShareInfo;
    deletionInfo?: ILocalAttributeDeletionInfo;
    parentId?: ICoreId;
    isDefault?: true;
}

export type OwnSharedIdentityAttribute = LocalAttribute & {
    content: IdentityAttribute;
    shareInfo: LocalAttributeShareInfo;
    parentId: undefined;
    isDefault: undefined;
};

export type OwnSharedRelationshipAttribute = LocalAttribute & {
    content: RelationshipAttribute;
    shareInfo: LocalAttributeShareInfo;
    parentId: undefined;
    isDefault: undefined;
};

export type PeerSharedIdentityAttribute = LocalAttribute & {
    content: IdentityAttribute;
    shareInfo: LocalAttributeShareInfo & { sourceAttribute: undefined };
    parentId: undefined;
    isDefault: undefined;
};

export type PeerSharedRelationshipAttribute = LocalAttribute & {
    content: RelationshipAttribute;
    shareInfo: LocalAttributeShareInfo & { sourceAttribute: undefined };
    parentId: undefined;
    isDefault: undefined;
};

export type ThirdPartyOwnedRelationshipAttribute = LocalAttribute & {
    content: RelationshipAttribute;
    shareInfo: LocalAttributeShareInfo;
    parentId: undefined;
    isDefault: undefined;
};

export type RepositoryAttribute = LocalAttribute & {
    content: IdentityAttribute;
    shareInfo: undefined;
    deletionInfo: undefined;
};

@type("LocalAttribute")
export class LocalAttribute extends CoreSynchronizable implements ILocalAttribute {
    public override readonly technicalProperties = [
        "@type",
        "@context",
        nameof<LocalAttribute>((r) => r.createdAt),
        nameof<LocalAttribute>((r) => r.succeeds),
        nameof<LocalAttribute>((r) => r.succeededBy),
        nameof<LocalAttribute>((r) => r.shareInfo),
        nameof<LocalAttribute>((r) => r.deletionInfo),
        nameof<LocalAttribute>((r) => r.parentId),
        nameof<LocalAttribute>((r) => r.isDefault)
    ];

    public override readonly userdataProperties = [nameof<LocalAttribute>((r) => r.content)];

    @validate()
    @serialize({ unionTypes: [IdentityAttribute, RelationshipAttribute] })
    public content: IdentityAttribute | RelationshipAttribute;

    @validate()
    @serialize()
    public createdAt: CoreDate;

    @validate({ nullable: true })
    @serialize()
    public succeeds?: CoreId;

    @validate({ nullable: true })
    @serialize()
    public succeededBy?: CoreId;

    @validate({ nullable: true })
    @serialize()
    public shareInfo?: LocalAttributeShareInfo;

    @validate({ nullable: true })
    @serialize()
    public deletionInfo?: LocalAttributeDeletionInfo;

    @validate({ nullable: true })
    @serialize()
    public parentId?: CoreId;

    @validate({ nullable: true })
    @serialize()
    public isDefault?: true;

    public isOwnSharedIdentityAttribute(ownAddress: CoreAddress, peerAddress?: CoreAddress): this is OwnSharedIdentityAttribute {
        return this.isIdentityAttribute() && this.isOwnSharedAttribute(ownAddress, peerAddress);
    }

    public isOwnSharedRelationshipAttribute(ownAddress: CoreAddress, peerAddress?: CoreAddress): this is OwnSharedRelationshipAttribute {
        return this.isRelationshipAttribute() && this.isOwnSharedAttribute(ownAddress, peerAddress);
    }

    public isPeerSharedIdentityAttribute(peerAddress?: CoreAddress): this is PeerSharedIdentityAttribute {
        return this.isIdentityAttribute() && this.isPeerSharedAttribute(peerAddress);
    }

    public isPeerSharedRelationshipAttribute(peerAddress?: CoreAddress): this is PeerSharedRelationshipAttribute {
        return this.isRelationshipAttribute() && this.isPeerSharedAttribute(peerAddress);
    }

    public isThirdPartyOwnedRelationshipAttribute(ownAddress: CoreAddress, thirdPartyAddress?: CoreAddress): this is ThirdPartyOwnedRelationshipAttribute {
        return this.isRelationshipAttribute() && this.isThirdPartyOwnedAttribute(ownAddress, thirdPartyAddress);
    }

    public isRepositoryAttribute(ownAddress: CoreAddress): this is RepositoryAttribute {
        return this.isIdentityAttribute() && !this.isShared() && this.isOwnedBy(ownAddress);
    }

    public isOwnSharedAttribute(ownAddress: CoreAddress, peerAddress?: CoreAddress): this is OwnSharedIdentityAttribute | OwnSharedRelationshipAttribute {
        let isOwnSharedAttribute = this.isShared() && this.isOwnedBy(ownAddress);

        isOwnSharedAttribute &&= !this.parentId;
        isOwnSharedAttribute &&= !this.isDefault;

        if (peerAddress) isOwnSharedAttribute &&= this.shareInfo!.peer.equals(peerAddress);
        return isOwnSharedAttribute;
    }

    public isPeerSharedAttribute(peerAddress?: CoreAddress): this is PeerSharedIdentityAttribute | PeerSharedRelationshipAttribute {
        let isPeerSharedAttribute = this.isShared() && this.isOwnedBy(this.shareInfo.peer);

        isPeerSharedAttribute &&= !this.shareInfo!.sourceAttribute;

        isPeerSharedAttribute &&= !this.parentId;
        isPeerSharedAttribute &&= !this.isDefault;

        if (peerAddress) isPeerSharedAttribute &&= this.isOwnedBy(peerAddress);
        return isPeerSharedAttribute;
    }

    public isThirdPartyOwnedAttribute(ownAddress: CoreAddress, thirdPartyAddress?: CoreAddress): this is ThirdPartyOwnedRelationshipAttribute {
        let isThirdPartyOwnedAttribute = this.isShared() && !this.isOwnedBy(ownAddress) && !this.isOwnedBy(this.shareInfo.peer);

        isThirdPartyOwnedAttribute &&= !this.parentId;
        isThirdPartyOwnedAttribute &&= !this.isDefault;

        if (thirdPartyAddress) isThirdPartyOwnedAttribute &&= this.isOwnedBy(thirdPartyAddress);
        return isThirdPartyOwnedAttribute;
    }

    public isIdentityAttribute(): this is LocalAttribute & { content: IdentityAttribute } {
        return this.content instanceof IdentityAttribute;
    }

    public isRelationshipAttribute(): this is LocalAttribute & { content: RelationshipAttribute } & {
        shareInfo: LocalAttributeShareInfo;
    } {
        return this.content instanceof RelationshipAttribute && this.isShared();
    }

    public isComplexAttribute(): boolean {
        return this.content.value instanceof AbstractComplexValue;
    }

    public isOwnedBy(identity: CoreAddress): boolean {
        return this.content.owner.equals(identity);
    }

    public isShared(): this is LocalAttribute & { shareInfo: LocalAttributeShareInfo } {
        return !!this.shareInfo;
    }

    public setDeletionInfo(deletionInfo: LocalAttributeDeletionInfo, ownAddress: CoreAddress): this {
        if (this.isRepositoryAttribute(ownAddress)) {
            throw ConsumptionCoreErrors.attributes.cannotSetDeletionInfoOfRepositoryAttributes();
        }

        if (this.isOwnSharedAttribute(ownAddress) && !this.isOwnSharedAttributeDeletionInfo(deletionInfo)) {
            throw ConsumptionCoreErrors.attributes.invalidDeletionInfoOfOwnSharedAttribute();
        }

        if (this.isPeerSharedAttribute() && !this.isPeerSharedAttributeDeletionInfo(deletionInfo)) {
            throw ConsumptionCoreErrors.attributes.invalidDeletionInfoOfPeerSharedAttribute();
        }

        if (this.isThirdPartyOwnedRelationshipAttribute(ownAddress) && !this.isThirdPartyOwnedRelationshipAttributeDeletionInfo(deletionInfo)) {
            throw ConsumptionCoreErrors.attributes.invalidDeletionInfoOfThirdPartyOwnedRelationshipAttribute();
        }

        this.deletionInfo = deletionInfo;
        return this;
    }

    private isPeerSharedAttributeDeletionInfo(deletionInfo: LocalAttributeDeletionInfo): boolean {
        return deletionInfo.deletionStatus === LocalAttributeDeletionStatus.DeletedByOwner || deletionInfo.deletionStatus === LocalAttributeDeletionStatus.ToBeDeleted;
    }

    private isOwnSharedAttributeDeletionInfo(deletionInfo: LocalAttributeDeletionInfo): boolean {
        return (
            deletionInfo.deletionStatus === LocalAttributeDeletionStatus.DeletedByPeer ||
            deletionInfo.deletionStatus === LocalAttributeDeletionStatus.ToBeDeletedByPeer ||
            deletionInfo.deletionStatus === LocalAttributeDeletionStatus.DeletionRequestSent ||
            deletionInfo.deletionStatus === LocalAttributeDeletionStatus.DeletionRequestRejected
        );
    }

    private isThirdPartyOwnedRelationshipAttributeDeletionInfo(deletionInfo: LocalAttributeDeletionInfo): boolean {
        return deletionInfo.deletionStatus === LocalAttributeDeletionStatus.DeletedByPeer;
    }

    public hasDeletionInfo(): this is LocalAttribute & { deletionInfo: LocalAttributeDeletionInfo } {
        return !!this.deletionInfo;
    }

    public static from(value: ILocalAttribute | LocalAttributeJSON): LocalAttribute {
        return this.fromAny(value);
    }

    public static async fromAttribute(
        content: IIdentityAttribute | IRelationshipAttribute,
        succeeds?: ICoreId,
        shareInfo?: ILocalAttributeShareInfo,
        id?: CoreId,
        parentId?: CoreId
    ): Promise<LocalAttribute> {
        return this.from({
            id: id ?? (await ConsumptionIds.attribute.generate()),
            createdAt: CoreDate.utc(),
            content,
            succeeds,
            shareInfo,
            parentId
        });
    }
}
