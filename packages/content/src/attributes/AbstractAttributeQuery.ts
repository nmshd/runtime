import { ISerializable, Serializable } from "@js-soft/ts-serval";
import { ContentJSON } from "../ContentJSON.js";

export interface AbstractAttributeQueryJSON extends ContentJSON {}
export interface IAbstractAttributeQuery extends ISerializable {}
export abstract class AbstractAttributeQuery extends Serializable implements IAbstractAttributeQuery {}
