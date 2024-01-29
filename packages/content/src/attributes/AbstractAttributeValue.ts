import { ISerializable, Serializable } from "@js-soft/ts-serval";
import { ContentJSON } from "../ContentJSON";
import { RenderHints, ValueHints } from "./hints";
import { AbstractBoolean } from "./types/AbstractBoolean";
import { AbstractFloat } from "./types/AbstractFloat";
import { AbstractInteger } from "./types/AbstractInteger";
import { AbstractString } from "./types/AbstractString";

export interface AbstractAttributeValueJSON extends ContentJSON {}

export interface IAbstractAttributeValue extends ISerializable {}

export abstract class AbstractAttributeValue extends Serializable implements IAbstractAttributeValue {
    public static valueGenerator(v: AbstractBoolean | AbstractFloat | AbstractInteger | AbstractString): boolean | number | string {
        return v.value;
    }

    public get valueHints(): ValueHints {
        return (this.constructor as any).valueHints;
    }

    public get renderHints(): RenderHints {
        return (this.constructor as any).renderHints;
    }
}
