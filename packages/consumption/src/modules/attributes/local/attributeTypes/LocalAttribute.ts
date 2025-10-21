import { serialize, type, validate } from "@js-soft/ts-serval";
import { IIdentityAttribute, IRelationshipAttribute, IdentityAttribute, IdentityAttributeJSON, RelationshipAttribute, RelationshipAttributeJSON } from "@nmshd/content";
import { CoreDate, CoreId, ICoreDate, ICoreId } from "@nmshd/core-types";
import { CoreSynchronizable, ICoreSynchronizable } from "@nmshd/transport";
import { nameof } from "ts-simple-nameof";

export interface LocalAttributeJSON {
    id: string;
    content: IdentityAttributeJSON | RelationshipAttributeJSON;
    createdAt: string;
    succeeds?: string;
    succeededBy?: string;
    wasViewedAt?: string;
}

export interface ILocalAttribute extends ICoreSynchronizable {
    content: IIdentityAttribute | IRelationshipAttribute;
    createdAt: ICoreDate;
    succeeds?: ICoreId;
    succeededBy?: ICoreId;
    wasViewedAt?: ICoreDate;
}

@type("LocalAttribute")
export class LocalAttribute extends CoreSynchronizable implements ILocalAttribute {
    public override readonly technicalProperties = [
        "@type",
        "@context",
        nameof<LocalAttribute>((r) => r.createdAt),
        nameof<LocalAttribute>((r) => r.succeeds),
        nameof<LocalAttribute>((r) => r.succeededBy),
        nameof<LocalAttribute>((r) => r.wasViewedAt)
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
    public wasViewedAt?: CoreDate;

    // this is not persisted, only used when returning Attributes via the API
    public numberOfForwards?: number;

    public static from(value: ILocalAttribute | LocalAttributeJSON): LocalAttribute {
        const parsed = this.fromUnknown(value);
        if (!(parsed instanceof LocalAttribute)) {
            throw new Error(`Parsed value is not an instance of ${LocalAttribute.name}`);
        }

        return parsed;
    }
}
