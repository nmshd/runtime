import { PrimitiveType, serialize, type, validate } from "@js-soft/ts-serval";
import { RenderHints, RenderHintsEditType, ValueHints, ValueHintsValue } from "../../hints/index.js";
import { AbstractString, AbstractStringJSON, IAbstractString } from "../AbstractString.js";

/**
 * Supported Predicates
 */
export enum Predicates {
    HasAttribute = "hasAttribute",
    RelatesTo = "relatesTo",
    IsRelatedTo = "isRelatedTo"
}

export interface StatementPredicateJSON extends AbstractStringJSON {
    "@type": "StatementPredicate";
    value: Predicates | `z-${string}`;
}

export interface IStatementPredicate extends IAbstractString {
    value: Predicates | `z-${string}`;
}

@type("StatementPredicate")
export class StatementPredicate extends AbstractString {
    @serialize()
    @validate({
        customValidator: StatementPredicate.validatePredicate,
        allowedTypes: [PrimitiveType.String]
    })
    public override value: Predicates | `z-${string}`;

    public static override get valueHints(): ValueHints {
        return super.valueHints.copyWith({
            values: Object.values(Predicates).map((value) =>
                ValueHintsValue.from({
                    key: value,
                    displayName: `i18n://attributes.values.StatementPredicate.${value}`
                })
            )
        });
    }

    public static override get renderHints(): RenderHints {
        return super.renderHints.copyWith({
            editType: RenderHintsEditType.ButtonLike
        });
    }

    public static from(value: IStatementPredicate | Omit<StatementPredicateJSON, "@type"> | string): StatementPredicate {
        return this.fromAny(value);
    }

    public override toJSON(verbose?: boolean | undefined, serializeAsString?: boolean | undefined): StatementPredicateJSON {
        return super.toJSON(verbose, serializeAsString) as StatementPredicateJSON;
    }

    private static validatePredicate(predicate: Predicates) {
        if (Object.values(Predicates).includes(predicate)) {
            return undefined;
        }

        if (predicate.startsWith("z-")) {
            return undefined;
        }
        return `must be one of: ${Object.values(Predicates)} or start with z-`;
    }
}
