import { Serializable, serialize, validate, ValidationError } from "@js-soft/ts-serval";
import nameOf from "easy-tsnameof";
import { AbstractComplexValue, AbstractComplexValueJSON, IAbstractComplexValue } from "../../AbstractComplexValue";
import { RenderHints, ValueHints } from "../../hints";
import { DigitalIdentityDescriptor, DigitalIdentityDescriptorJSON, IDigitalIdentityDescriptor } from "./DigitalIdentityDescriptor";
import { IStatementIssuerConditions, StatementIssuerConditions, StatementIssuerConditionsJSON } from "./StatementIssuerConditions";
import { IStatementObject, StatementObject, StatementObjectJSON } from "./StatementObject";
import { IStatementPredicate, Predicates, StatementPredicate, StatementPredicateJSON } from "./StatementPredicate";
import { IStatementSubject, StatementSubject, StatementSubjectJSON } from "./StatementSubject";

export interface AbstractStatementJSON extends AbstractComplexValueJSON {
    subject: StatementSubjectJSON;
    predicate: StatementPredicateJSON;
    object: StatementObjectJSON;
    issuer: DigitalIdentityDescriptorJSON;
    issuerConditions: StatementIssuerConditionsJSON;
}

export interface IAbstractStatement extends IAbstractComplexValue {
    subject: IStatementSubject;
    predicate: IStatementPredicate;
    object: IStatementObject;
    issuer: IDigitalIdentityDescriptor;
    issuerConditions: IStatementIssuerConditions;
}

export abstract class AbstractStatement extends AbstractComplexValue implements IAbstractStatement {
    public static readonly propertyNames: any = nameOf<AbstractStatement, never>();

    @serialize()
    @validate()
    public subject: StatementSubject;

    @serialize()
    @validate()
    public predicate: StatementPredicate;

    @serialize()
    @validate()
    public object: StatementObject;

    @serialize()
    @validate()
    public issuer: DigitalIdentityDescriptor;

    @serialize()
    @validate()
    public issuerConditions: StatementIssuerConditions;

    public static override postFrom<T extends Serializable>(value: T): T {
        if (!(value instanceof AbstractStatement)) throw new Error("this should never happen");

        if (value.predicate.value === Predicates.HasAttribute && (value.object.attributes?.length ?? 0) < 1) {
            throw new ValidationError(
                this.constructor.name,
                `${nameOf<AbstractStatement>((x) => x.object)}.${nameOf<StatementObject>((x) => x.attributes)}`,
                `If the predicate of the Statement is '${Predicates.HasAttribute}' you have to define attributes in '${nameOf<AbstractStatement>(
                    (x) => x.object
                )}.${nameOf<StatementObject>((x) => x.attributes)}'.`
            );
        }

        return value;
    }

    public override toJSON(verbose?: boolean | undefined, serializeAsString?: boolean | undefined): AbstractStatementJSON {
        return super.toJSON(verbose, serializeAsString) as AbstractStatementJSON;
    }

    public static get valueHints(): ValueHints {
        return ValueHints.from({
            propertyHints: {
                [this.propertyNames.subject.$path]: StatementSubject.valueHints,
                [this.propertyNames.predicate.$path]: StatementPredicate.valueHints,
                [this.propertyNames.object.$path]: StatementObject.valueHints,
                [this.propertyNames.issuer.$path]: DigitalIdentityDescriptor.valueHints,
                [this.propertyNames.issuerConditions.$path]: StatementIssuerConditions.valueHints
            }
        });
    }

    public static override get renderHints(): RenderHints {
        return super.renderHints.copyWith({
            propertyHints: {
                [this.propertyNames.subject.$path]: StatementSubject.renderHints,
                [this.propertyNames.predicate.$path]: StatementPredicate.renderHints,
                [this.propertyNames.object.$path]: StatementObject.renderHints,
                [this.propertyNames.issuer.$path]: DigitalIdentityDescriptor.renderHints,
                [this.propertyNames.issuerConditions.$path]: StatementIssuerConditions.renderHints
            }
        });
    }
}
