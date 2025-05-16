import { ISerializable, PrimitiveType, Serializable, serialize, type, validate } from "@js-soft/ts-serval";
import { ContentJSON } from "../../ContentJSON";
import { IValueHintsValue, ValueHintsValue, ValueHintsValueJSON } from "./ValueHintsValue";

export interface ValueHintsJSON extends ContentJSON {
    "@type": "ValueHints";
    editHelp?: string;
    min?: number;
    max?: number;
    pattern?: string;
    /**
     * @uniqueItems true
     */
    values?: ValueHintsValueJSON[];
    defaultValue?: string | number | boolean;
    propertyHints?: Record<string, ValueHintsJSON>;
}

export interface ValueHintsOverrideJSON extends Partial<ValueHintsJSON> {}

export interface IValueHints extends ISerializable {
    editHelp?: string;
    min?: number;
    max?: number;
    pattern?: string;
    values?: IValueHintsValue[];
    defaultValue?: string | number | boolean;
    propertyHints?: Record<string, IValueHints>;
}

export interface IValueHintsOverride extends Partial<IValueHints> {}

function deserializePropertyHints(value: ValueHints | ValueHintsOverride): void {
    if (!value.propertyHints) return;

    value.propertyHints = Object.entries(value.propertyHints)
        .map((k) => {
            return { [k[0]]: ValueHints.fromAny(k[1]) };
        })
        .reduce((obj, item) => Object.assign(obj, { [Object.keys(item)[0]]: Object.values(item)[0] }), {});
}

function serializePropertyHints(hints: ValueHints | ValueHintsOverride, json: ValueHintsOverrideJSON | ValueHintsJSON): void {
    json.propertyHints = Object.entries(hints.propertyHints ?? {})
        .map((k) => {
            return { [k[0]]: k[1].toJSON() };
        })
        .reduce((obj, item) => Object.assign(obj, { [Object.keys(item)[0]]: Object.values(item)[0] }), {});
}

@type("ValueHints")
export class ValueHints extends Serializable implements IValueHints {
    @serialize()
    @validate({ nullable: true, max: 500 })
    public editHelp?: string;

    @serialize()
    @validate({ nullable: true })
    public min?: number;

    @serialize()
    @validate({ nullable: true })
    public max?: number;

    @serialize()
    @validate({ nullable: true, max: 1000 })
    public pattern?: string;

    @serialize({ type: ValueHintsValue })
    @validate({ nullable: true })
    public values?: ValueHintsValue[];

    @validate({ nullable: true, allowedTypes: [PrimitiveType.Number, PrimitiveType.String, PrimitiveType.Boolean] })
    @serialize()
    public defaultValue?: number | string | boolean;

    @serialize()
    @validate({ nullable: true })
    public propertyHints: Record<string, ValueHints> = {};

    public static from(value: IValueHints | Omit<ValueHintsJSON, "@type">): ValueHints {
        return this.fromAny(value);
    }

    public static override postFrom<T extends Serializable>(value: T): T {
        if (!(value instanceof ValueHints)) throw new Error("this should never happen");

        deserializePropertyHints(value);
        return value;
    }

    public override toJSON(): ValueHintsJSON {
        const json = super.toJSON() as ValueHintsJSON;

        serializePropertyHints(this, json);
        return json;
    }

    public copyWith(override?: Partial<IValueHintsOverride | ValueHintsOverrideJSON | ValueHintsOverride>): ValueHints {
        const overrideJson = override && override instanceof ValueHintsOverride ? override.toJSON() : override;

        const propertyHints = { ...this.toJSON().propertyHints, ...overrideJson?.propertyHints };
        return ValueHints.from({ ...this.toJSON(), ...overrideJson, propertyHints });
    }
}

@type("ValueHintsOverride")
export class ValueHintsOverride extends Serializable implements IValueHintsOverride {
    @serialize()
    @validate({ nullable: true, max: 500 })
    public editHelp?: string;

    @serialize()
    @validate({ nullable: true })
    public min?: number;

    @serialize()
    @validate({ nullable: true })
    public max?: number;

    @serialize()
    @validate({ nullable: true, max: 1000 })
    public pattern?: string;

    @serialize({ type: ValueHintsValue })
    @validate({ nullable: true })
    public values?: ValueHintsValue[];

    @serialize()
    @validate({ nullable: true, allowedTypes: [PrimitiveType.Number, PrimitiveType.String, PrimitiveType.Boolean] })
    public defaultValue?: boolean | number | string;

    @serialize()
    @validate({ nullable: true })
    public propertyHints?: Record<string, ValueHints>;

    public static from(value: IValueHintsOverride | Omit<ValueHintsOverrideJSON, "@type">): ValueHintsOverride {
        return this.fromAny(value);
    }

    public static override postFrom<T extends Serializable>(value: T): T {
        deserializePropertyHints(value);
        return value;
    }

    public override toJSON(): ValueHintsOverrideJSON {
        const json = super.toJSON() as ValueHintsOverrideJSON;

        serializePropertyHints(this, json);
        return json;
    }
}
