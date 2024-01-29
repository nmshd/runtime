import { AbstractAttributeValue, AbstractAttributeValueJSON, IAbstractAttributeValue } from "./AbstractAttributeValue";
import { RenderHints, RenderHintsEditType, RenderHintsTechnicalType } from "./hints";

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
