import { serialize, type, validate } from "@js-soft/ts-serval";
import { AbstractAttributeQuery, AbstractAttributeQueryJSON, IAbstractAttributeQuery } from "./AbstractAttributeQuery";

export interface DCQLQueryJSON extends AbstractAttributeQueryJSON {
    "@type": "DCQLQuery";
    query: Object;
}

export interface IDCQLQuery extends IAbstractAttributeQuery {
    query: Object;
}

@type("DCQLQuery")
export class DCQLQuery extends AbstractAttributeQuery implements IDCQLQuery {
    @serialize()
    @validate()
    public query: Object;

    public static from(value: IDCQLQuery | Omit<DCQLQueryJSON, "@type">): DCQLQuery {
        return this.fromAny(value);
    }

    public override toJSON(verbose?: boolean | undefined, serializeAsString?: boolean | undefined): DCQLQueryJSON {
        return super.toJSON(verbose, serializeAsString) as DCQLQueryJSON;
    }
}
