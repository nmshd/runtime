import { QueryTranslator } from "@js-soft/docdb-querytranslator";
import { ApplicationError, Result } from "@js-soft/ts-utils";
import { IncomingRequestsController, LocalRequest, LocalRequestSource, LocalResponse, LocalResponseSource } from "@nmshd/consumption";
import { RequestItemGroupJSON, RequestJSON, ResponseItemGroupJSON, ResponseJSON } from "@nmshd/content";
import { LocalRequestDTO, LocalRequestSourceDTO, LocalResponseDTO, LocalResponseSourceDTO } from "@nmshd/runtime-types";
import { Inject } from "@nmshd/typescript-ioc";
import { nameof } from "ts-simple-nameof";
import { flattenObject } from "../../common/flattenObject.js";
import { UseCase } from "../../common/index.js";
import { RequestMapper } from "./RequestMapper.js";

export interface GetIncomingRequestsRequest {
    query?: GetIncomingRequestsRequestQuery;
}

export interface GetIncomingRequestsRequestQuery {
    id?: string | string[];
    peer?: string | string[];
    createdAt?: string | string[];
    status?: string | string[];
    wasAutomaticallyDecided?: string;
    "content.expiresAt"?: string | string[];
    "content.items.@type"?: string | string[];
    "source.type"?: string | string[];
    "source.reference"?: string | string[];
    "response.createdAt"?: string | string[];
    "response.source.type"?: string | string[];
    "response.source.reference"?: string | string[];
    "response.content.result"?: string | string[];
    "response.content.items.@type"?: string | string[];
    "response.content.items.items.@type"?: string | string[];
}

export class GetIncomingRequestsUseCase extends UseCase<GetIncomingRequestsRequest, LocalRequestDTO[]> {
    private static readonly queryTranslator = new QueryTranslator({
        whitelist: {
            // id
            [nameof<LocalRequestDTO>((x) => x.id)]: true,

            // peer
            [nameof<LocalRequestDTO>((x) => x.peer)]: true,

            // createdAt
            [nameof<LocalRequestDTO>((x) => x.createdAt)]: true,

            // status
            [nameof<LocalRequestDTO>((x) => x.status)]: true,

            // wasAutomaticallyDecided
            [nameof<LocalRequestDTO>((x) => x.wasAutomaticallyDecided)]: true,

            // content.expiresAt
            [`${nameof<LocalRequestDTO>((x) => x.content)}.${nameof<RequestJSON>((x) => x.expiresAt)}`]: true,

            // content.items.@type
            [`${nameof<LocalRequestDTO>((x) => x.content)}.${nameof<RequestJSON>((x) => x.items)}.@type`]: true,

            // content.items.items.@type
            [`${nameof<LocalRequestDTO>((x) => x.content)}.${nameof<RequestJSON>((x) => x.items)}.${nameof<RequestItemGroupJSON>((x) => x.items)}.@type`]: true,

            // source.type
            [`${nameof<LocalRequestDTO>((x) => x.source)}.${nameof<LocalRequestSourceDTO>((x) => x.type)}`]: true,

            // source.reference
            [`${nameof<LocalRequestDTO>((x) => x.source)}.${nameof<LocalRequestSourceDTO>((x) => x.reference)}`]: true,

            // response.createdAt
            [`${nameof<LocalRequestDTO>((x) => x.response)}.${nameof<LocalResponseDTO>((x) => x.createdAt)}`]: true,

            // response.source.type
            [`${nameof<LocalRequestDTO>((x) => x.response)}.${nameof<LocalResponseDTO>((x) => x.source)}.${nameof<LocalResponseSourceDTO>((x) => x.type)}`]: true,

            // response.source.reference
            [`${nameof<LocalRequestDTO>((x) => x.response)}.${nameof<LocalResponseDTO>((x) => x.source)}.${nameof<LocalResponseSourceDTO>((x) => x.reference)}`]: true,

            // response.content.result
            [`${nameof<LocalRequestDTO>((x) => x.response)}.${nameof<LocalResponseDTO>((x) => x.content)}.${nameof<ResponseJSON>((x) => x.result)}`]: true,

            // response.content.items.@type
            [`${nameof<LocalRequestDTO>((x) => x.response)}.${nameof<LocalResponseDTO>((x) => x.content)}.${nameof<ResponseJSON>((x) => x.items)}.@type`]: true,

            // response.content.items.items.@type
            [`${nameof<LocalRequestDTO>((x) => x.response)}.${nameof<LocalResponseDTO>((x) => x.content)}.${nameof<ResponseJSON>((x) => x.items)}.${nameof<ResponseItemGroupJSON>(
                (x) => x.items
            )}.@type`]: true
        },
        alias: {
            // id
            [nameof<LocalRequestDTO>((x) => x.id)]: nameof<LocalRequest>((x) => x.id),

            // peer
            [nameof<LocalRequestDTO>((x) => x.peer)]: nameof<LocalRequest>((x) => x.peer),

            // createdAt
            [nameof<LocalRequestDTO>((x) => x.createdAt)]: nameof<LocalRequest>((x) => x.createdAt),

            // status
            [nameof<LocalRequestDTO>((x) => x.status)]: nameof<LocalRequest>((x) => x.status),

            // wasAutomaticallyDecided
            [nameof<LocalRequestDTO>((x) => x.wasAutomaticallyDecided)]: nameof<LocalRequest>((x) => x.wasAutomaticallyDecided),

            // content.expiresAt
            [`${nameof<LocalRequestDTO>((x) => x.content)}.${nameof<RequestJSON>((x) => x.expiresAt)}`]: `${nameof<LocalRequest>((x) => x.content)}.${nameof<RequestJSON>(
                (x) => x.expiresAt
            )}`,

            // content.items.@type
            [`${nameof<LocalRequestDTO>((x) => x.content)}.${nameof<RequestJSON>((x) => x.items)}.@type`]: `${nameof<LocalRequest>((x) => x.content)}.${nameof<RequestJSON>(
                (x) => x.items
            )}.@type`,

            // content.items.items.@type
            [`${nameof<LocalRequestDTO>((x) => x.content)}.${nameof<RequestJSON>((x) => x.items)}.${nameof<RequestItemGroupJSON>((x) => x.items)}.@type`]: `${nameof<LocalRequest>(
                (x) => x.content
            )}.${nameof<RequestJSON>((x) => x.items)}.${nameof<RequestItemGroupJSON>((x) => x.items)}.@type`,

            // source.type
            [`${nameof<LocalRequestDTO>((x) => x.source)}.${nameof<LocalRequestSourceDTO>((x) => x.type)}`]: `${nameof<LocalRequest>((x) => x.source)}.${nameof<LocalRequestSource>(
                (x) => x.type
            )}`,

            // source.reference
            [`${nameof<LocalRequestDTO>((x) => x.source)}.${nameof<LocalRequestSourceDTO>((x) => x.reference)}`]: `${nameof<LocalRequest>(
                (x) => x.source
            )}.${nameof<LocalRequestSource>((x) => x.reference)}`,

            // response.createdAt
            [`${nameof<LocalRequestDTO>((x) => x.response)}.${nameof<LocalResponseDTO>((x) => x.createdAt)}`]: `${nameof<LocalRequest>((x) => x.response)}.${nameof<LocalResponse>(
                (x) => x.createdAt
            )}`,

            // response.source.type
            [`${nameof<LocalRequestDTO>((x) => x.response)}.${nameof<LocalResponseDTO>((x) => x.source)}.${nameof<LocalResponseSourceDTO>((x) => x.type)}`]: `${nameof<LocalRequest>((x) => x.response)}.${nameof<LocalResponse>((x) => x.source)}.${nameof<LocalResponseSource>((x) => x.type)}`,

            // response.source.reference
            [`${nameof<LocalRequestDTO>((x) => x.response)}.${nameof<LocalResponseDTO>((x) => x.source)}.${nameof<LocalResponseSourceDTO>((x) => x.reference)}`]: true,

            // response.content.result
            [`${nameof<LocalRequestDTO>((x) => x.response)}.${nameof<LocalResponseDTO>((x) => x.content)}.${nameof<ResponseJSON>((x) => x.result)}`]: `${nameof<LocalRequest>(
                (x) => x.response
            )}.${nameof<LocalResponse>((x) => x.content)}.${nameof<ResponseJSON>((x) => x.result)}`,

            // response.content.items.@type
            [`${nameof<LocalRequestDTO>((x) => x.response)}.${nameof<LocalResponseDTO>((x) => x.content)}.${nameof<ResponseJSON>((x) => x.items)}.@type`]: `${nameof<LocalRequest>(
                (x) => x.response
            )}.${nameof<LocalResponse>((x) => x.content)}.${nameof<ResponseJSON>((x) => x.items)}.@type`,

            // response.content.items.items.@type
            [`${nameof<LocalRequestDTO>((x) => x.response)}.${nameof<LocalResponseDTO>((x) => x.content)}.${nameof<ResponseJSON>((x) => x.items)}.${nameof<ResponseItemGroupJSON>(
                (x) => x.items
            )}.@type`]: `${nameof<LocalRequest>((x) => x.response)}.${nameof<LocalResponse>((x) => x.content)}.${nameof<ResponseJSON>(
                (x) => x.items
            )}.${nameof<ResponseItemGroupJSON>((x) => x.items)}.@type`
        }
    });

    public constructor(@Inject private readonly incomingRequestsController: IncomingRequestsController) {
        super();
    }

    protected async executeInternal(request: GetIncomingRequestsRequest): Promise<Result<LocalRequestDTO[], ApplicationError>> {
        const flattenedQuery = flattenObject(request.query);
        const dbQuery = GetIncomingRequestsUseCase.queryTranslator.parse(flattenedQuery);
        const localRequest = await this.incomingRequestsController.getIncomingRequests(dbQuery);

        const dtos = RequestMapper.toLocalRequestDTOList(localRequest);

        return Result.ok(dtos);
    }
}
