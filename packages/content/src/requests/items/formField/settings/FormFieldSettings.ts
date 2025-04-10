import { ISerializable, Serializable } from "@js-soft/ts-serval";
import { ContentJSON } from "../../../../ContentJSON";

export interface FormFieldSettingsJSON extends ContentJSON {}

export interface IFormFieldSettings extends ISerializable {}

export abstract class FormFieldSettings extends Serializable {}
