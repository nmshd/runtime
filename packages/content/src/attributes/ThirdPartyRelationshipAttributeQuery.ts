import { serialize, type, validate } from "@js-soft/ts-serval";
import { CoreAddress, CoreDate, ICoreAddress, ICoreDate } from "@nmshd/core-types";
import { AbstractAttributeQuery, AbstractAttributeQueryJSON, IAbstractAttributeQuery } from "./AbstractAttributeQuery";
export interface ThirdPartyRelationshipAttributeQueryJSON extends AbstractAttributeQueryJSON {
    "@type": "ThirdPartyRelationshipAttributeQuery";
    key: string;
    owner: `${ThirdPartyRelationshipAttributeQueryOwner}`;
    thirdParty: string[];
    validFrom?: string;
    validTo?: string;
}

export interface IThirdPartyRelationshipAttributeQuery extends IAbstractAttributeQuery {
    key: string;
    owner: ThirdPartyRelationshipAttributeQueryOwner;
    thirdParty: ICoreAddress[];
    validFrom?: ICoreDate;
    validTo?: ICoreDate;
}

export enum ThirdPartyRelationshipAttributeQueryOwner {
    ThirdParty = "thirdParty",
    Recipient = "recipient",
    Empty = ""
}

@type("ThirdPartyRelationshipAttributeQuery")
export class ThirdPartyRelationshipAttributeQuery extends AbstractAttributeQuery implements IThirdPartyRelationshipAttributeQuery {
    @serialize()
    @validate({ max: 100 })
    public key: string;

    @serialize()
    @validate({
        customValidator: (v) =>
            !Object.values(ThirdPartyRelationshipAttributeQueryOwner).includes(v)
                ? `must be one of: ${Object.values(ThirdPartyRelationshipAttributeQueryOwner).map((o) => `"${o}"`)}`
                : undefined
    })
    public owner: ThirdPartyRelationshipAttributeQueryOwner;

    @serialize({ type: CoreAddress })
    @validate({ customValidator: (v) => (v.length < 1 ? "may not be empty" : undefined) })
    public thirdParty: CoreAddress[];

    @serialize()
    @validate({ nullable: true })
    public validFrom?: CoreDate;

    @serialize()
    @validate({ nullable: true })
    public validTo?: CoreDate;

    protected static override preFrom(value: any): any {
        if (typeof value.thirdParty === "string" || (typeof value.thirdParty === "object" && value.thirdParty !== null && "address" in value.thirdParty)) {
            value.thirdParty = [CoreAddress.from(value.thirdParty)];
        }

        return value;
    }

    public static from(value: IThirdPartyRelationshipAttributeQuery | Omit<ThirdPartyRelationshipAttributeQueryJSON, "@type">): ThirdPartyRelationshipAttributeQuery {
        return this.fromAny(value);
    }

    public override toJSON(verbose?: boolean | undefined, serializeAsString?: boolean | undefined): ThirdPartyRelationshipAttributeQueryJSON {
        return super.toJSON(verbose, serializeAsString) as ThirdPartyRelationshipAttributeQueryJSON;
    }
}
