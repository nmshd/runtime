import { serialize, validate } from "@js-soft/ts-serval";
import { CoreSynchronizable, ICoreSynchronizable } from "@nmshd/transport";
import { nameof } from "ts-simple-nameof";

interface IASynchronizedCollectionItem extends ICoreSynchronizable {
    someTechnicalStringProperty?: string;
    someTechnicalNumberProperty?: number;
    someTechnicalBooleanProperty?: boolean;

    someUserdataStringProperty?: string;
    someUserdataNumberProperty?: number;
    someUserdataBooleanProperty?: boolean;

    someMetadataStringProperty?: string;
    someMetadataNumberProperty?: number;
    someMetadataBooleanProperty?: boolean;
}

export class ASynchronizedCollectionItem extends CoreSynchronizable implements IASynchronizedCollectionItem {
    public override readonly technicalProperties = [
        nameof<ASynchronizedCollectionItem>((r) => r.someTechnicalStringProperty),
        nameof<ASynchronizedCollectionItem>((r) => r.someTechnicalNumberProperty),
        nameof<ASynchronizedCollectionItem>((r) => r.someTechnicalBooleanProperty)
    ];

    public override readonly userdataProperties = [
        nameof<ASynchronizedCollectionItem>((r) => r.someUserdataStringProperty),
        nameof<ASynchronizedCollectionItem>((r) => r.someUserdataNumberProperty),
        nameof<ASynchronizedCollectionItem>((r) => r.someUserdataBooleanProperty)
    ];

    public override readonly metadataProperties = [
        nameof<ASynchronizedCollectionItem>((r) => r.someMetadataStringProperty),
        nameof<ASynchronizedCollectionItem>((r) => r.someMetadataNumberProperty),
        nameof<ASynchronizedCollectionItem>((r) => r.someMetadataBooleanProperty)
    ];

    @serialize()
    @validate({ nullable: true })
    public someTechnicalStringProperty?: string;
    @serialize()
    @validate({ nullable: true })
    public someTechnicalNumberProperty?: number;
    @serialize()
    @validate({ nullable: true })
    public someTechnicalBooleanProperty?: boolean;

    @serialize()
    @validate({ nullable: true })
    public someUserdataStringProperty?: string;
    @serialize()
    @validate({ nullable: true })
    public someUserdataNumberProperty?: number;
    @serialize()
    @validate({ nullable: true })
    public someUserdataBooleanProperty?: boolean;

    @serialize()
    @validate({ nullable: true })
    public someMetadataStringProperty?: string;
    @serialize()
    @validate({ nullable: true })
    public someMetadataNumberProperty?: number;
    @serialize()
    @validate({ nullable: true })
    public someMetadataBooleanProperty?: boolean;

    public static from(value: IASynchronizedCollectionItem): ASynchronizedCollectionItem {
        return this.fromAny(value);
    }
}
