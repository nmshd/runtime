import { DatabasePaginationOptions } from "@js-soft/docdb-access-abstractions";
import { QueryTranslator } from "@js-soft/docdb-querytranslator";
import { Result } from "@js-soft/ts-utils";
import { CachedMessage, CachedMessageRecipient, Message, MessageController, MessageEnvelopeRecipient } from "@nmshd/transport";
import { Inject } from "@nmshd/typescript-ioc";
import { nameof } from "ts-simple-nameof";
import { MessageDTO, RecipientDTO } from "../../../types";
import { SchemaRepository, SchemaValidator, UseCase } from "../../common";
import { MessageMapper } from "./MessageMapper";

export interface GetMessagesQuery {
    createdBy?: string | string[];
    createdByDevice?: string | string[];
    createdAt?: string | string[];
    "content.@type"?: string | string[];
    "content.body"?: string | string[];
    "content.subject"?: string | string[];
    attachments?: string | string[];
    "recipients.address"?: string | string[];
    "recipients.relationshipId"?: string | string[];
    wasReadAt?: string | string[];
    participant?: string | string[];
}

export interface GetMessagesRequest {
    query?: GetMessagesQuery;
    paginationOptions?: DatabasePaginationOptions; // an upper bound for limit could be appropriate
}

export interface GetMessagesResponse {
    messages: MessageDTO[];
    messageCount: number;
}

class Validator extends SchemaValidator<GetMessagesRequest> {
    public constructor(@Inject schemaRepository: SchemaRepository) {
        super(schemaRepository.getSchema("GetMessagesRequest"));
    }
}

export class GetMessagesUseCase extends UseCase<GetMessagesRequest, GetMessagesResponse> {
    private static readonly queryTranslator = new QueryTranslator({
        whitelist: {
            [nameof<MessageDTO>((m) => m.createdBy)]: true,
            [nameof<MessageDTO>((m) => m.createdByDevice)]: true,
            [nameof<MessageDTO>((m) => m.createdAt)]: true,
            [`${nameof<MessageDTO>((m) => m.content)}.@type`]: true,
            [`${nameof<MessageDTO>((m) => m.content)}.body`]: true,
            [`${nameof<MessageDTO>((m) => m.content)}.subject`]: true,
            [nameof<MessageDTO>((m) => m.attachments)]: true,
            [`${nameof<MessageDTO>((m) => m.recipients)}.${nameof<RecipientDTO>((r) => r.address)}`]: true,
            [`${nameof<MessageDTO>((m) => m.recipients)}.${nameof<RecipientDTO>((r) => r.relationshipId)}`]: true,
            [nameof<MessageDTO>((m) => m.wasReadAt)]: true,
            participant: true
        },

        alias: {
            [nameof<MessageDTO>((m) => m.createdBy)]: `${nameof<Message>((m) => m.cache)}.${nameof<CachedMessage>((m) => m.createdBy)}`,
            [nameof<MessageDTO>((m) => m.createdByDevice)]: `${nameof<Message>((m) => m.cache)}.${nameof<CachedMessage>((m) => m.createdByDevice)}`,
            [nameof<MessageDTO>((m) => m.createdAt)]: `${nameof<Message>((m) => m.cache)}.${nameof<CachedMessage>((m) => m.createdAt)}`,
            [`${nameof<MessageDTO>((m) => m.recipients)}.${nameof<RecipientDTO>((r) => r.address)}`]: `${nameof<Message>((m) => m.cache)}.${nameof<CachedMessage>(
                (m) => m.recipients
            )}.${nameof<MessageEnvelopeRecipient>((r) => r.address)}`,
            [`${nameof<MessageDTO>((m) => m.recipients)}.${nameof<RecipientDTO>((r) => r.relationshipId)}`]: `${nameof<Message>((m) => m.cache)}.${nameof<CachedMessage>((m) => m.recipients)}.${nameof<CachedMessageRecipient>((m) => m.relationshipId)}`,
            [`${nameof<MessageDTO>((m) => m.content)}.@type`]: `${nameof<Message>((m) => m.cache)}.${nameof<CachedMessage>((m) => m.content)}.@type`,
            [`${nameof<MessageDTO>((m) => m.content)}.body`]: `${nameof<Message>((m) => m.cache)}.${nameof<CachedMessage>((m) => m.content)}.body`,
            [`${nameof<MessageDTO>((m) => m.content)}.subject`]: `${nameof<Message>((m) => m.cache)}.${nameof<CachedMessage>((m) => m.content)}.subject`,
            [nameof<MessageDTO>((m) => m.wasReadAt)]: nameof<Message>((m) => m.wasReadAt)
        },

        custom: {
            [nameof<MessageDTO>((m) => m.attachments)]: (query: any, input: any) => {
                if (input === "+") {
                    query[`${nameof<Message>((m) => m.cache)}.${nameof<CachedMessage>((m) => m.attachments)}`] = { $not: { $size: 0 } };
                    return;
                }

                query[`${nameof<Message>((m) => m.cache)}.${nameof<CachedMessage>((m) => m.attachments)}`] = {
                    $containsAny: Array.isArray(input) ? input : [input]
                };
            },
            participant: (query: any, input: any) => {
                let participantQuery: any;

                if (Array.isArray(input)) {
                    if (input.length === 0) {
                        return;
                    }

                    participantQuery = {};

                    for (const value of input) {
                        const parsed: { field: string; value: any } = GetMessagesUseCase.queryTranslator.parseString(value, true);

                        switch (parsed.field) {
                            case "$containsAny":
                            case "$containsNone":
                                participantQuery[parsed.field] = participantQuery[parsed.field] || [];
                                participantQuery[parsed.field].push(parsed.value);
                                break;
                            default:
                                participantQuery[parsed.field] = parsed.value;
                        }
                    }
                } else {
                    participantQuery = GetMessagesUseCase.queryTranslator.parseStringVal(input);
                }

                query["$or"] = [
                    {
                        [`${nameof<Message>((m) => m.cache)}.${nameof<CachedMessage>((m) => m.createdBy)}`]: participantQuery
                    },
                    {
                        [`${nameof<Message>((m) => m.cache)}.${nameof<CachedMessage>((m) => m.recipients)}.${nameof<MessageEnvelopeRecipient>((r) => r.address)}`]: participantQuery
                    }
                ];
            }
        }
    });

    public constructor(
        @Inject private readonly messageController: MessageController,
        @Inject validator: Validator
    ) {
        super(validator);
    }

    protected async executeInternal(request: GetMessagesRequest): Promise<Result<GetMessagesResponse>> {
        const query = GetMessagesUseCase.queryTranslator.parse(request.query);

        const getMessagesResult = await this.messageController.getMessages(query, request.paginationOptions);

        return Result.ok({
            messages: MessageMapper.toMessageDTOList(getMessagesResult.messages),
            messageCount: getMessagesResult.messageCount
        });
    }
}
