import { ISerializable, Serializable, serialize, type, validate } from "@js-soft/ts-serval";
import { ContentJSON } from "../../ContentJSON.js";
import { RenderHintsDataType } from "./RenderHintsDataType.js";
import { RenderHintsEditType } from "./RenderHintsEditType.js";
import { RenderHintsTechnicalType } from "./RenderHintsTechnicalType.js";

export interface RenderHintsJSON extends ContentJSON {
    "@type": "RenderHints";
    technicalType: RenderHintsTechnicalType;
    editType: RenderHintsEditType;
    dataType?: RenderHintsDataType;
    propertyHints?: Record<string, RenderHintsJSON>;
}

export interface RenderHintsOverrideJSON extends Partial<RenderHintsJSON> {}

export interface IRenderHints extends ISerializable {
    technicalType: RenderHintsTechnicalType;
    editType: RenderHintsEditType;
    dataType?: RenderHintsDataType;
    propertyHints?: Record<string, IRenderHints>;
}

export interface IRenderHintsOverride extends Partial<IRenderHints> {}

function deserializePropertyHints(value: RenderHints | RenderHintsOverride): void {
    if (!value.propertyHints) return;

    value.propertyHints = Object.entries(value.propertyHints)
        .map((k) => {
            return { [k[0]]: RenderHints.fromAny(k[1]) };
        })
        .reduce((obj, item) => Object.assign(obj, { [Object.keys(item)[0]]: Object.values(item)[0] }), {});
}

function serializePropertyHints(hints: RenderHints | RenderHintsOverride, json: RenderHintsOverrideJSON | RenderHintsJSON): void {
    json.propertyHints = Object.entries(hints.propertyHints ?? {})
        .map((k) => {
            return { [k[0]]: k[1].toJSON() };
        })
        .reduce((obj, item) => Object.assign(obj, { [Object.keys(item)[0]]: Object.values(item)[0] }), {});
}

@type("RenderHints")
export class RenderHints extends Serializable implements IRenderHints {
    @serialize()
    @validate()
    public technicalType: RenderHintsTechnicalType;

    @serialize()
    @validate()
    public editType: RenderHintsEditType;

    @serialize()
    @validate({ nullable: true })
    public dataType?: RenderHintsDataType;

    @serialize()
    @validate({ nullable: true })
    public propertyHints: Record<string, RenderHints> = {};

    public static from(value: IRenderHints | Omit<RenderHintsJSON, "@type">): RenderHints {
        return this.fromAny(value);
    }

    public static override postFrom<T extends Serializable>(value: T): T {
        deserializePropertyHints(value);
        return value;
    }

    public override toJSON(): RenderHintsJSON {
        const json = super.toJSON() as RenderHintsJSON;

        serializePropertyHints(this, json);
        return json;
    }

    public copyWith(override?: Partial<IRenderHintsOverride | RenderHintsOverrideJSON | RenderHintsOverride>): RenderHints {
        const overrideJson = override && override instanceof RenderHintsOverride ? override.toJSON() : override;

        const propertyHints = { ...this.toJSON().propertyHints, ...overrideJson?.propertyHints };
        return RenderHints.from({ ...this.toJSON(), ...overrideJson, propertyHints });
    }
}

@type("RenderHintsOverride")
export class RenderHintsOverride extends Serializable implements IRenderHintsOverride {
    @serialize()
    @validate({ nullable: true })
    public technicalType?: RenderHintsTechnicalType;

    @serialize()
    @validate({ nullable: true })
    public editType?: RenderHintsEditType;

    @serialize()
    @validate({ nullable: true })
    public dataType?: RenderHintsDataType;

    @serialize()
    @validate({ nullable: true })
    public propertyHints?: Record<string, RenderHints>;

    public static from(value: IRenderHintsOverride | Omit<RenderHintsOverrideJSON, "@type">): RenderHintsOverride {
        return this.fromAny(value);
    }

    public static override postFrom<T extends Serializable>(value: T): T {
        deserializePropertyHints(value);
        return value;
    }

    public override toJSON(): RenderHintsOverrideJSON {
        const json = super.toJSON() as RenderHintsOverrideJSON;

        serializePropertyHints(this, json);
        return json;
    }
}
