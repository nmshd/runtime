import { QueryTranslator } from "@js-soft/docdb-querytranslator";
import {
    IdentityAttribute,
    IdentityAttributeJSON,
    IdentityAttributeQuery,
    IIdentityAttributeQuery,
    IRelationshipAttributeQuery,
    IThirdPartyRelationshipAttributeQuery,
    RelationshipAttribute,
    RelationshipAttributeQuery,
    ThirdPartyRelationshipAttributeQuery
} from "@nmshd/content";
import { nameof } from "ts-simple-nameof";
import { ConsumptionError } from "../../../consumption/ConsumptionError";
import { LocalAttribute } from "./attributeTypes/LocalAttribute";
import { OwnRelationshipAttribute } from "./attributeTypes/OwnRelationshipAttribute";
import { PeerRelationshipAttribute } from "./attributeTypes/PeerRelationshipAttribute";

export class IdentityAttributeQueryTranslator {
    public static translate(query: IdentityAttributeQuery): any {
        return this.translator.parse({ ...query.toJSON(), attributeType: "IdentityAttribute" });
    }

    private static readonly translator = new QueryTranslator({
        whitelist: {
            [nameof<IIdentityAttributeQuery>((x) => x.tags)]: true,
            [nameof<IIdentityAttributeQuery>((x) => x.valueType)]: true,
            attributeType: true
        },
        alias: {
            // @type of attributeValue
            [nameof<IIdentityAttributeQuery>((x) => x.valueType)]: `${nameof<LocalAttribute>((x) => x.content)}.${nameof<IdentityAttribute>((x) => x.value)}.@type`,
            // @type of attribute
            attributeType: `${nameof<LocalAttribute>((x) => x.content)}.@type`
        },
        custom: {
            // tags
            [nameof<IIdentityAttributeQuery>((x) => x.tags)]: (query: any, input: any) => {
                if (!input) return;

                if (!Array.isArray(input)) {
                    throw new ConsumptionError("Invalid input: 'tags' must be an array");
                }

                const inputAsArray = input as string[];

                query["$or"] = inputAsArray.map((t) => ({
                    [`${nameof<LocalAttribute>((x) => x.content)}.${nameof<IdentityAttributeJSON>((x) => x.tags)}`]: {
                        $contains: t
                    }
                }));
            }
        }
    });
}

export class RelationshipAttributeQueryTranslator {
    public static translate(query: RelationshipAttributeQuery): any {
        return this.translator.parse({ ...query.toJSON(), attributeType: "RelationshipAttribute" });
    }

    private static readonly translator = new QueryTranslator({
        whitelist: {
            [nameof<IRelationshipAttributeQuery>((x) => x.key)]: true,
            [nameof<IRelationshipAttributeQuery>((x) => x.owner)]: true,
            attributeType: true
        },
        alias: {
            // key
            [nameof<IRelationshipAttributeQuery>((x) => x.key)]: `${nameof<LocalAttribute>((x) => x.content)}.${nameof<RelationshipAttribute>((x) => x.key)}`,
            // @type of attribute
            attributeType: `${nameof<LocalAttribute>((x) => x.content)}.@type`,
            // owner
            [nameof<IRelationshipAttributeQuery>((x) => x.owner)]: `${nameof<LocalAttribute>((x) => x.content)}.${nameof<RelationshipAttribute>((x) => x.owner)}`
        }
    });
}

export class ThirdPartyRelationshipAttributeQueryTranslator {
    public static translate(query: ThirdPartyRelationshipAttributeQuery): any {
        return this.translator.parse({ ...query.toJSON(), attributeType: "RelationshipAttribute" });
    }

    private static readonly translator = new QueryTranslator({
        whitelist: {
            [nameof<IThirdPartyRelationshipAttributeQuery>((x) => x.key)]: true,
            [nameof<IThirdPartyRelationshipAttributeQuery>((x) => x.owner)]: true,
            [nameof<IThirdPartyRelationshipAttributeQuery>((x) => x.thirdParty)]: true,
            attributeType: true
        },
        alias: {
            // key
            [nameof<IThirdPartyRelationshipAttributeQuery>((x) => x.key)]: `${nameof<LocalAttribute>((x) => x.content)}.${nameof<RelationshipAttribute>((x) => x.key)}`,
            // @type of attribute
            attributeType: `${nameof<LocalAttribute>((x) => x.content)}.@type`,
            // owner
            [nameof<IThirdPartyRelationshipAttributeQuery>((x) => x.owner)]: `${nameof<LocalAttribute>((x) => x.content)}.${nameof<RelationshipAttribute>((x) => x.owner)}`,
            // peer
            [nameof<IThirdPartyRelationshipAttributeQuery>((x) => x.thirdParty)]: `${nameof<OwnRelationshipAttribute | PeerRelationshipAttribute>((x) => x.peer)}`
        }
    });
}
