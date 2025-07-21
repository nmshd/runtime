import { QueryTranslator } from "@js-soft/docdb-querytranslator";
import { Result } from "@js-soft/ts-utils";
import { AttributesController, LocalAttribute, LocalAttributeDeletionInfoJSON, LocalAttributeShareInfoJSON } from "@nmshd/consumption";
import { AbstractAttributeJSON, IdentityAttribute, IdentityAttributeJSON, RelationshipAttributeJSON } from "@nmshd/content";
import { LocalAttributeDTO } from "@nmshd/runtime-types";
import { Inject } from "@nmshd/typescript-ioc";
import { nameof } from "ts-simple-nameof";
import { UseCase } from "../../common";
import { flattenObject } from "../../common/flattenObject";
import { AttributeMapper } from "./AttributeMapper";

export interface GetAttributesRequest {
    query?: GetAttributesRequestQuery;
    hideTechnical?: boolean;
}

// TODO: sharingInfos variations
export interface GetAttributesRequestQuery {
    "@type"?: string | string[];
    createdAt?: string;
    succeeds?: string | string[];
    succeededBy?: string | string[];
    isDefault?: string;
    wasViewedAt?: string | string[];
    "content.@type"?: string | string[];
    "content.tags"?: string | string[];
    "content.owner"?: string | string[];
    "content.key"?: string | string[];
    "content.isTechnical"?: string;
    "content.confidentiality"?: string | string[];
    "content.value.@type"?: string | string[];
    sharingInfos?: string | string[];
    "sharingInfos.peer"?: string | string[];
    "sharingInfos.sourceReference"?: string | string[];
    "sharingInfos.sharedAt"?: string | string[];
    "sharingInfos.thirdPartyAddress"?: string | string[];
    deletionInfo?: string | string[];
    "deletionInfo.deletionStatus"?: string | string[];
    "deletionInfo.deletionDate"?: string | string[];
}

export class GetAttributesUseCase extends UseCase<GetAttributesRequest, LocalAttributeDTO[]> {
    public static readonly queryTranslator = new QueryTranslator({
        whitelist: {
            [`${nameof<LocalAttributeDTO>}.@type`]: true,
            [nameof<LocalAttributeDTO>((x) => x.createdAt)]: true,
            [nameof<LocalAttributeDTO>((x) => x.succeeds)]: true,
            [nameof<LocalAttributeDTO>((x) => x.succeededBy)]: true,
            [nameof<LocalAttributeDTO>((x) => x.isDefault)]: true,
            [nameof<LocalAttributeDTO>((x) => x.wasViewedAt)]: true,

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

            // shareInfo
            [`${nameof<LocalAttributeDTO>((x) => x.sharingInfos)}`]: true,
            [`${nameof<LocalAttributeDTO>((x) => x.sharingInfos)}.${nameof<LocalAttributeShareInfoJSON>((x) => x.peer)}`]: true,
            [`${nameof<LocalAttributeDTO>((x) => x.sharingInfos)}.${nameof<LocalAttributeShareInfoJSON>((x) => x.sourceReference)}`]: true,
            [`${nameof<LocalAttributeDTO>((x) => x.sharingInfos)}.${nameof<LocalAttributeShareInfoJSON>((x) => x.sharedAt)}`]: true,
            [`${nameof<LocalAttributeDTO>((x) => x.sharingInfos)}.${nameof<LocalAttributeShareInfoJSON>((x) => x.thirdPartyAddress)}`]: true,

            // deletionInfo
            [`${nameof<LocalAttributeDTO>((x) => x.deletionInfo)}`]: true,
            [`${nameof<LocalAttributeDTO>((x) => x.deletionInfo)}.${nameof<LocalAttributeDeletionInfoJSON>((x) => x.deletionStatus)}`]: true,
            [`${nameof<LocalAttributeDTO>((x) => x.deletionInfo)}.${nameof<LocalAttributeDeletionInfoJSON>((x) => x.deletionDate)}`]: true
        },
        alias: {
            [`${nameof<LocalAttributeDTO>}.@type`]: `${nameof<LocalAttributeDTO>}.@type`,
            [nameof<LocalAttributeDTO>((x) => x.createdAt)]: nameof<LocalAttribute>((x) => x.createdAt),
            [nameof<LocalAttributeDTO>((x) => x.succeeds)]: nameof<LocalAttribute>((x) => x.succeeds),
            [nameof<LocalAttributeDTO>((x) => x.succeededBy)]: nameof<LocalAttribute>((x) => x.succeededBy),
            [nameof<LocalAttributeDTO>((x) => x.isDefault)]: nameof<LocalAttribute>((x) => x.isDefault),
            [nameof<LocalAttributeDTO>((x) => x.wasViewedAt)]: nameof<LocalAttribute>((x) => x.wasViewedAt),

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

            // sharingInfos
            [`${nameof<LocalAttributeDTO>((x) => x.sharingInfos)}`]: `${nameof<LocalAttribute>((x) => x.sharingInfos)}`,

            // deletionInfo
            [`${nameof<LocalAttributeDTO>((x) => x.deletionInfo)}`]: `${nameof<LocalAttribute>((x) => x.deletionInfo)}`,
            [`${nameof<LocalAttributeDTO>((x) => x.deletionInfo)}.${nameof<LocalAttributeDeletionInfoJSON>((x) => x.deletionStatus)}`]: `${nameof<LocalAttribute>((x) => x.deletionInfo)}.${nameof<LocalAttributeDeletionInfoJSON>((x) => x.deletionStatus)}`,
            [`${nameof<LocalAttributeDTO>((x) => x.deletionInfo)}.${nameof<LocalAttributeDeletionInfoJSON>((x) => x.deletionDate)}`]: `${nameof<LocalAttribute>((x) => x.deletionInfo)}.${nameof<LocalAttributeDeletionInfoJSON>((x) => x.deletionDate)}`
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
            },

            // sharingInfos
            [`${nameof<LocalAttributeDTO>((x) => x.sharingInfos)}.${nameof<LocalAttributeShareInfoJSON>((x) => x.peer)}`]: (query: any, input: string | string[]) => {
                if (typeof input === "string") {
                    query["sharingInfos"] = { $elemMatch: { peer: input } };
                    return;
                }
                const allowedPeers = [];
                for (const peer of input) {
                    allowedPeers.push({ shareInfo: { $elemMatch: { peer } } });
                }
                query["$or"] = allowedPeers;
            },
            [`${nameof<LocalAttributeDTO>((x) => x.sharingInfos)}.${nameof<LocalAttributeShareInfoJSON>((x) => x.sourceReference)}`]: (query: any, input: string | string[]) => {
                if (typeof input === "string") {
                    query["sharingInfos"] = { $elemMatch: { sourceReference: input } };
                    return;
                }
                const allowedSourceReferences = [];
                for (const sourceReference of input) {
                    allowedSourceReferences.push({ shareInfo: { $elemMatch: { sourceReference } } });
                }
                query["$or"] = allowedSourceReferences;
            },
            [`${nameof<LocalAttributeDTO>((x) => x.sharingInfos)}.${nameof<LocalAttributeShareInfoJSON>((x) => x.sharedAt)}`]: (query: any, input: string | string[]) => {
                if (typeof input === "string") {
                    query["sharingInfos"] = { $elemMatch: { sharedAt: input } };
                    return;
                }
                const allowedSharedAts = [];
                for (const sharedAt of input) {
                    allowedSharedAts.push({ shareInfo: { $elemMatch: { sharedAt } } });
                }
                query["$or"] = allowedSharedAts;
            },
            [`${nameof<LocalAttributeDTO>((x) => x.sharingInfos)}.${nameof<LocalAttributeShareInfoJSON>((x) => x.thirdPartyAddress)}`]: (query: any, input: string | string[]) => {
                if (typeof input === "string") {
                    query["sharingInfos"] = { $elemMatch: { thirdPartyAddress: input } };
                    return;
                }
                const allowedThirdPartyAddresses = [];
                for (const thirdPartyAddress of input) {
                    allowedThirdPartyAddresses.push({ shareInfo: { $elemMatch: { thirdPartyAddress } } });
                }
                query["$or"] = allowedThirdPartyAddresses;
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

        return Result.ok(AttributeMapper.toAttributeDTOList(attributes));
    }
}
