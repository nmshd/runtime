import { ISerializable, Serializable, serialize, type, validate } from "@js-soft/ts-serval";
import { CoreAddress, CoreDate, CoreId, ICoreAddress, ICoreDate, ICoreId } from "@nmshd/core-types";
import { ICryptoExchangePublicKey } from "@nmshd/crypto";
import { IIdentity, Identity } from "../../accounts/data/Identity";
import { RelationshipTemplatePublicKey } from "../transmission/RelationshipTemplatePublicKey";

export interface ICachedRelationshipTemplate extends ISerializable {
    identity: IIdentity;
    createdBy: ICoreAddress;
    createdByDevice: ICoreId;
    templateKey: ICryptoExchangePublicKey;
    content: ISerializable;
    createdAt: ICoreDate;
    expiresAt?: ICoreDate;
    maxNumberOfAllocations?: number;
}

@type("CachedRelationshipTemplate")
export class CachedRelationshipTemplate extends Serializable implements ICachedRelationshipTemplate {
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
