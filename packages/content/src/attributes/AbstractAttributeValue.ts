import { ISerializable, Serializable } from "@js-soft/ts-serval";
import { ContentJSON } from "../ContentJSON.js";
import { RenderHints, ValueHints } from "./hints/index.js";
import { AbstractBoolean } from "./types/AbstractBoolean.js";
import { AbstractFloat } from "./types/AbstractFloat.js";
import { AbstractInteger } from "./types/AbstractInteger.js";
import { AbstractString } from "./types/AbstractString.js";

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
