import { AbstractAttributeValue, AbstractAttributeValueJSON, IAbstractAttributeValue } from "./AbstractAttributeValue.js";
import { RenderHints, RenderHintsEditType, RenderHintsTechnicalType } from "./hints/index.js";

export interface AbstractComplexValueJSON extends AbstractAttributeValueJSON {}

export interface IAbstractComplexValue extends IAbstractAttributeValue {}

export abstract class AbstractComplexValue extends AbstractAttributeValue implements IAbstractComplexValue {
    public static get renderHints(): RenderHints {
        return RenderHints.from({
            technicalType: RenderHintsTechnicalType.Object,
            editType: RenderHintsEditType.Complex
        });
    }
}
