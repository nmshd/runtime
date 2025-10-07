import { serialize, type, validate } from "@js-soft/ts-serval";
import { AbstractAttributeQuery, AbstractAttributeQueryJSON, IAbstractAttributeQuery } from "./AbstractAttributeQuery";

export interface DCQLQueryJSON extends AbstractAttributeQueryJSON {
    "@type": "DCQLQuery";
    query: Record<string, unknown>;
}

export interface IDCQLQuery extends IAbstractAttributeQuery {
    query: Record<string, unknown>;
}

@type("DCQLQuery")
export class DCQLQuery extends AbstractAttributeQuery implements IDCQLQuery {
    @serialize()
    @validate()
    public query: Record<string, unknown>;

    public static from(value: IDCQLQuery | Omit<DCQLQueryJSON, "@type">): DCQLQuery {
        return this.fromAny(value);
    }

    public override toJSON(verbose?: boolean | undefined, serializeAsString?: boolean | undefined): DCQLQueryJSON {
        return super.toJSON(verbose, serializeAsString) as DCQLQueryJSON;
    }
}
