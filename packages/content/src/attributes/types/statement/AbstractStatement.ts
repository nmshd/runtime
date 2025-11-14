import { Serializable, serialize, validate, ValidationError } from "@js-soft/ts-serval";
import { nameof } from "ts-simple-nameof";
import { AbstractComplexValue, AbstractComplexValueJSON, IAbstractComplexValue } from "../../AbstractComplexValue.js";
import { RenderHints, ValueHints } from "../../hints/index.js";
import { DigitalIdentityDescriptor, DigitalIdentityDescriptorJSON, IDigitalIdentityDescriptor } from "./DigitalIdentityDescriptor.js";
import { IStatementIssuerConditions, StatementIssuerConditions, StatementIssuerConditionsJSON } from "./StatementIssuerConditions.js";
import { IStatementObject, StatementObject, StatementObjectJSON } from "./StatementObject.js";
import { IStatementPredicate, Predicates, StatementPredicate, StatementPredicateJSON } from "./StatementPredicate.js";
import { IStatementSubject, StatementSubject, StatementSubjectJSON } from "./StatementSubject.js";

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
                `${nameof<AbstractStatement>((x) => x.object)}.${nameof<StatementObject>((x) => x.attributes)}`,
                `If the predicate of the Statement is '${Predicates.HasAttribute}' you have to define attributes in '${nameof<AbstractStatement>(
                    (x) => x.object
                )}.${nameof<StatementObject>((x) => x.attributes)}'.`
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
                [nameof<AbstractStatement>((a) => a.subject)]: StatementSubject.valueHints,
                [nameof<AbstractStatement>((a) => a.predicate)]: StatementPredicate.valueHints,
                [nameof<AbstractStatement>((a) => a.object)]: StatementObject.valueHints,
                [nameof<AbstractStatement>((a) => a.issuer)]: DigitalIdentityDescriptor.valueHints,
                [nameof<AbstractStatement>((a) => a.issuerConditions)]: StatementIssuerConditions.valueHints
            }
        });
    }

    public static override get renderHints(): RenderHints {
        return super.renderHints.copyWith({
            propertyHints: {
                [nameof<AbstractStatement>((a) => a.subject)]: StatementSubject.renderHints,
                [nameof<AbstractStatement>((a) => a.predicate)]: StatementPredicate.renderHints,
                [nameof<AbstractStatement>((a) => a.object)]: StatementObject.renderHints,
                [nameof<AbstractStatement>((a) => a.issuer)]: DigitalIdentityDescriptor.renderHints,
                [nameof<AbstractStatement>((a) => a.issuerConditions)]: StatementIssuerConditions.renderHints
            }
        });
    }
}
