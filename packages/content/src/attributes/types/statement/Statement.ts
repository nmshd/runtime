import { type } from "@js-soft/ts-serval";
import { AbstractStatement, AbstractStatementJSON, IAbstractStatement } from "./AbstractStatement.js";

export interface StatementJSON extends AbstractStatementJSON {
    "@type": "Statement";
}

export interface IStatement extends IAbstractStatement {}

@type("Statement")
export class Statement extends AbstractStatement implements IStatement {
    public static from(value: IStatement | Omit<StatementJSON, "@type"> | string): Statement {
        return this.fromAny(value);
    }

    public override toJSON(verbose?: boolean | undefined, serializeAsString?: boolean | undefined): StatementJSON {
        return super.toJSON(verbose, serializeAsString) as StatementJSON;
    }
}
