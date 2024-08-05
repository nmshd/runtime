import { ISerializable, Serializable, serialize, type, validate } from "@js-soft/ts-serval";
import { ICryptoExchangePublicKey } from "@nmshd/crypto";
import { CoreAddress, CoreDate, CoreSerializable, ICoreAddress, ICoreDate, ICoreSerializable } from "../../../core";
import { CoreId, ICoreId } from "../../../core/types/CoreId";
import { IIdentity, Identity } from "../../accounts/data/Identity";
import { RelationshipTemplatePublicKey } from "../transmission/RelationshipTemplatePublicKey";

export interface ICachedRelationshipTemplate extends ICoreSerializable {
    identity: IIdentity;
    createdBy: ICoreAddress;
    createdByDevice: ICoreId;
    templateKey: ICryptoExchangePublicKey;
    content: ISerializable;
    createdAt: ICoreDate;
    expiresAt?: ICoreDate;
    maxNumberOfAllocations?: number;
    forIdentity?: ICoreAddress;
}

@type("CachedRelationshipTemplate")
export class CachedRelationshipTemplate extends CoreSerializable implements ICachedRelationshipTemplate {
    @validate()
    @serialize()
    public identity: Identity;

    @validate()
    @serialize()
    public createdBy: CoreAddress;

    @validate()
    @serialize()
    public createdByDevice: CoreId;

    @validate()
    @serialize()
    public templateKey: RelationshipTemplatePublicKey;

    @validate()
    @serialize()
    public content: Serializable;

    @validate()
    @serialize()
    public createdAt: CoreDate;

    @validate({ nullable: true })
    @serialize()
    public expiresAt?: CoreDate;

    @validate({ nullable: true, customValidator: validateMaxNumberOfAllocations })
    @serialize()
    public maxNumberOfAllocations?: number;

    @validate()
    @serialize()
    public forIdentity?: CoreAddress;

    public static from(value: ICachedRelationshipTemplate): CachedRelationshipTemplate {
        return this.fromAny(value);
    }
}

export function validateMaxNumberOfAllocations(value?: number): string | undefined {
    if (value === undefined) return;

    if (value <= 0) {
        return "maxNumberOfAllocations must be greater than 0";
    }

    return;
}
