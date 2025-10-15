import { QueryTranslator } from "@js-soft/docdb-querytranslator";
import { Result } from "@js-soft/ts-utils";
import {
    AbstractAttributeDeletionInfoJSON,
    AttributesController,
    LocalAttribute,
    OwnIdentityAttribute,
    OwnRelationshipAttribute,
    PeerIdentityAttribute,
    PeerRelationshipAttribute,
    ThirdPartyRelationshipAttribute,
    ThirdPartyRelationshipAttributeJSON
} from "@nmshd/consumption";
import { AbstractAttributeJSON, IdentityAttribute, IdentityAttributeJSON, RelationshipAttributeJSON } from "@nmshd/content";
import { LocalAttributeDeletionInfoDTO, LocalAttributeDTO } from "@nmshd/runtime-types";
import { Inject } from "@nmshd/typescript-ioc";
import { nameof } from "ts-simple-nameof";
import { UseCase } from "../../common";
import { flattenObject } from "../../common/flattenObject";
import { AttributeMapper } from "./AttributeMapper";

export interface GetAttributesRequest {
    query?: GetAttributesRequestQuery;
    hideTechnical?: boolean;
}

export interface GetAttributesRequestQuery {
    "@type"?: string | string[];
    createdAt?: string;
    succeeds?: string | string[];
    succeededBy?: string | string[];
    wasViewedAt?: string | string[];
    isDefault?: string;
    "content.@type"?: string | string[];
    "content.tags"?: string | string[];
    "content.owner"?: string | string[];
    "content.key"?: string | string[];
    "content.isTechnical"?: string;
    "content.confidentiality"?: string | string[];
    "content.value.@type"?: string | string[];
    peer?: string | string[];
    sourceReference?: string | string[];
    initialAttributePeer?: string | string[];
    deletionInfo?: string | string[];
    "deletionInfo.deletionStatus"?: string | string[];
    "deletionInfo.deletionDate"?: string | string[];
    numberOfForwards?: string | string[];
}

export class GetAttributesUseCase extends UseCase<GetAttributesRequest, LocalAttributeDTO[]> {
    public static readonly queryTranslator = new QueryTranslator({
        whitelist: {
            ["@type"]: true,
            [nameof<LocalAttributeDTO>((x) => x.createdAt)]: true,
            [nameof<LocalAttributeDTO>((x) => x.succeeds)]: true,
            [nameof<LocalAttributeDTO>((x) => x.succeededBy)]: true,
            [nameof<LocalAttributeDTO>((x) => x.wasViewedAt)]: true,
            [nameof<LocalAttributeDTO>((x) => x.isDefault)]: true,

            // content.abstractAttribute
            [`${nameof<LocalAttributeDTO>((x) => x.content)}.${nameof<AbstractAttributeJSON>((x) => x.owner)}`]: true,
            [`${nameof<LocalAttributeDTO>((x) => x.content)}.@type`]: true,

            // content.identityAttribute
            [`${nameof<LocalAttributeDTO>((x) => x.content)}.${nameof<IdentityAttributeJSON>((x) => x.tags)}`]: true,
            [`${nameof<LocalAttribute>((x) => x.content)}.${nameof<IdentityAttributeJSON>((x) => x.value)}.@type`]: true,

            // content.relationshipAttribute
            [`${nameof<LocalAttributeDTO>((x) => x.content)}.${nameof<RelationshipAttributeJSON>((x) => x.key)}`]: true,
            [`${nameof<LocalAttributeDTO>((x) => x.content)}.${nameof<RelationshipAttributeJSON>((x) => x.isTechnical)}`]: true,
            [`${nameof<LocalAttributeDTO>((x) => x.content)}.${nameof<RelationshipAttributeJSON>((x) => x.confidentiality)}`]: true,

            [`${nameof<LocalAttributeDTO>((x) => x.peer)}`]: true,
            [`${nameof<LocalAttributeDTO>((x) => x.sourceReference)}`]: true,
            [`${nameof<LocalAttributeDTO>((x) => x.initialAttributePeer)}`]: true,
            [`${nameof<LocalAttributeDTO>((x) => x.deletionInfo)}`]: true,
            [`${nameof<LocalAttributeDTO>((x) => x.deletionInfo)}.${nameof<LocalAttributeDeletionInfoDTO>((x) => x.deletionStatus)}`]: true,
            [`${nameof<LocalAttributeDTO>((x) => x.deletionInfo)}.${nameof<LocalAttributeDeletionInfoDTO>((x) => x.deletionDate)}`]: true
        },
        alias: {
            [nameof<LocalAttributeDTO>((x) => x.createdAt)]: nameof<LocalAttribute>((x) => x.createdAt),
            [nameof<LocalAttributeDTO>((x) => x.succeeds)]: nameof<LocalAttribute>((x) => x.succeeds),
            [nameof<LocalAttributeDTO>((x) => x.succeededBy)]: nameof<LocalAttribute>((x) => x.succeededBy),
            [nameof<LocalAttributeDTO>((x) => x.wasViewedAt)]: nameof<LocalAttribute>((x) => x.wasViewedAt),
            [nameof<LocalAttributeDTO>((x) => x.isDefault)]: nameof<OwnIdentityAttribute>((x) => x.isDefault),

            // content.abstractAttribute
            [`${nameof<LocalAttributeDTO>((x) => x.content)}.${nameof<AbstractAttributeJSON>((x) => x.owner)}`]: `${nameof<LocalAttribute>((x) => x.content)}.${nameof<AbstractAttributeJSON>((x) => x.owner)}`,
            [`${nameof<LocalAttributeDTO>((x) => x.content)}.@type`]: `${nameof<LocalAttribute>((x) => x.content)}.@type`,

            // content.identityAttribute
            [`${nameof<LocalAttributeDTO>((x) => x.content)}.${nameof<IdentityAttributeJSON>((x) => x.tags)}`]: `${nameof<LocalAttribute>((x) => x.content)}.${nameof<IdentityAttributeJSON>((x) => x.tags)}`,
            [`${nameof<LocalAttribute>((x) => x.content)}.${nameof<IdentityAttributeJSON>((x) => x.value)}.@type`]: `${nameof<LocalAttribute>((x) => x.content)}.${nameof<IdentityAttributeJSON>((x) => x.value)}.@type`,

            // content.relationshipAttribute
            [`${nameof<LocalAttributeDTO>((x) => x.content)}.${nameof<RelationshipAttributeJSON>((x) => x.key)}`]: `${nameof<LocalAttribute>((x) => x.content)}.${nameof<RelationshipAttributeJSON>((x) => x.key)}`,
            [`${nameof<LocalAttributeDTO>((x) => x.content)}.${nameof<RelationshipAttributeJSON>((x) => x.isTechnical)}`]: `${nameof<LocalAttribute>((x) => x.content)}.${nameof<RelationshipAttributeJSON>((x) => x.isTechnical)}`,
            [`${nameof<LocalAttributeDTO>((x) => x.content)}.${nameof<RelationshipAttributeJSON>((x) => x.confidentiality)}`]: `${nameof<LocalAttribute>((x) => x.content)}.${nameof<RelationshipAttributeJSON>((x) => x.confidentiality)}`,

            [`${nameof<LocalAttributeDTO>((x) => x.peer)}`]: `${nameof<PeerIdentityAttribute | OwnRelationshipAttribute | PeerRelationshipAttribute | ThirdPartyRelationshipAttribute>((x) => x.peer)}`,
            [`${nameof<LocalAttributeDTO>((x) => x.sourceReference)}`]: `${nameof<PeerIdentityAttribute | OwnRelationshipAttribute | PeerRelationshipAttribute | ThirdPartyRelationshipAttribute>((x) => x.sourceReference)}`,
            [`${nameof<LocalAttributeDTO>((x) => x.initialAttributePeer)}`]: `${nameof<ThirdPartyRelationshipAttributeJSON>((x) => x.initialAttributePeer)}`,
            [`${nameof<LocalAttributeDTO>((x) => x.deletionInfo)}`]: `${nameof<PeerIdentityAttribute | OwnRelationshipAttribute | PeerRelationshipAttribute | ThirdPartyRelationshipAttribute>((x) => x.deletionInfo)}`,
            [`${nameof<LocalAttributeDTO>((x) => x.deletionInfo)}.${nameof<LocalAttributeDeletionInfoDTO>((x) => x.deletionStatus)}`]: `${nameof<PeerIdentityAttribute | OwnRelationshipAttribute | PeerRelationshipAttribute | ThirdPartyRelationshipAttribute>((x) => x.deletionInfo)}.${nameof<AbstractAttributeDeletionInfoJSON>((x) => x.deletionStatus)}`,
            [`${nameof<LocalAttributeDTO>((x) => x.deletionInfo)}.${nameof<LocalAttributeDeletionInfoDTO>((x) => x.deletionDate)}`]: `${nameof<PeerIdentityAttribute | OwnRelationshipAttribute | PeerRelationshipAttribute | ThirdPartyRelationshipAttribute>((x) => x.deletionInfo)}.${nameof<AbstractAttributeDeletionInfoJSON>((x) => x.deletionDate)}`
        },
        custom: {
            // content.tags
            [`${nameof<LocalAttributeDTO>((x) => x.content)}.${nameof<IdentityAttribute>((x) => x.tags)}`]: (query: any, input: string | string[]) => {
                if (typeof input === "string") {
                    query[`${nameof<LocalAttribute>((x) => x.content)}.${nameof<IdentityAttributeJSON>((x) => x.tags)}`] = { $contains: input };
                    return;
                }
                const allowedTags = [];
                for (const tag of input) {
                    const tagQuery = { [`${nameof<LocalAttribute>((x) => x.content)}.${nameof<IdentityAttributeJSON>((x) => x.tags)}`]: { $contains: tag } };
                    allowedTags.push(tagQuery);
                }
                query["$or"] = allowedTags;
            }
        }
    });

    public constructor(@Inject private readonly attributeController: AttributesController) {
        super();
    }

    protected async executeInternal(request: GetAttributesRequest): Promise<Result<LocalAttributeDTO[]>> {
        const query = request.query ?? {};
        const flattenedQuery = flattenObject(query);
        const dbQuery = GetAttributesUseCase.queryTranslator.parse(flattenedQuery);

        const attributes = await this.attributeController.getLocalAttributes(dbQuery, request.hideTechnical);

        // TODO: get the number of forwards
        // TODO: filter for query.numberOfForwards

        return Result.ok(AttributeMapper.toAttributeDTOList(attributes));
    }
}
