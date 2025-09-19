import { IResponse, RelationshipCreationContent, RelationshipTemplateContentJSON, ResponseWrapperJSON } from "@nmshd/content";
import { DateTime } from "luxon";
import { CreateOutgoingRequestRequest, LocalRequestDTO, MessageDTO, RelationshipDTO } from "../../src";
import { TestRuntimeServices } from "./RuntimeServiceProvider";
import { exchangeMessageWithRequest, exchangeTemplate, syncUntilHasMessageWithResponse } from "./testUtils";

export interface LocalRequestWithSource {
    request: LocalRequestDTO;
    source: string;
}

export interface ResponseMessagesForSenderAndRecipient {
    rResponseMessage: MessageDTO & { content: ResponseWrapperJSON };
    sResponseMessage: MessageDTO & { content: ResponseWrapperJSON };
}

export interface RelationshipRequestWithRelationshipIfAccepted {
    request: LocalRequestDTO;
    relationship: RelationshipDTO | undefined;
}

export async function exchangeMessageWithRequestAndRequireManualDecision(
    sRuntimeServices: TestRuntimeServices,
    rRuntimeServices: TestRuntimeServices,
    requestForCreate: CreateOutgoingRequestRequest
): Promise<LocalRequestWithSource> {
    const message = await exchangeMessageWithRequest(sRuntimeServices, rRuntimeServices, requestForCreate);
    await sRuntimeServices.consumption.outgoingRequests.sent({ requestId: message.content.id!, messageId: message.id });

    await rRuntimeServices.consumption.incomingRequests.received({
        receivedRequest: message.content,
        requestSourceId: message.id
    });
    await rRuntimeServices.consumption.incomingRequests.checkPrerequisites({
        requestId: message.content.id!
    });
    return {
        request: (
            await rRuntimeServices.consumption.incomingRequests.requireManualDecision({
                requestId: message.content.id!
            })
        ).value,
        source: message.id
    };
}

export async function exchangeMessageWithRequestAndSendResponse(
    sRuntimeServices: TestRuntimeServices,
    rRuntimeServices: TestRuntimeServices,
    requestForCreate: CreateOutgoingRequestRequest,
    action: string
): Promise<ResponseMessagesForSenderAndRecipient> {
    const { request, source } = await exchangeMessageWithRequestAndRequireManualDecision(sRuntimeServices, rRuntimeServices, requestForCreate);
    const acceptedRequest = await rRuntimeServices.consumption.incomingRequests.accept({
        requestId: request.id,
        items: [
            {
                accept: action === "Accept"
            }
        ] as any // bug in Runtime
    });

    const rResponseMessage = (
        await rRuntimeServices.transport.messages.sendMessage({
            content: {
                "@type": "ResponseWrapper",
                requestId: request.id,
                requestSourceReference: source,
                requestSourceType: "Message",
                response: acceptedRequest.value.response!.content
            },
            recipients: [(await sRuntimeServices.transport.account.getIdentityInfo()).value.address]
        })
    ).value as MessageDTO & { content: ResponseWrapperJSON };
    const sResponseMessage = await syncUntilHasMessageWithResponse(sRuntimeServices.transport, request.id);
    return { rResponseMessage, sResponseMessage };
}

export async function exchangeTemplateAndRecipientRequiresManualDecision(
    sRuntimeServices: TestRuntimeServices,
    rRuntimeServices: TestRuntimeServices,
    templateContent: any,
    templateExpiresAt?: DateTime
): Promise<LocalRequestWithSource> {
    const template = await exchangeTemplate(sRuntimeServices.transport, rRuntimeServices.transport, templateContent, templateExpiresAt);
    const request = (
        await rRuntimeServices.consumption.incomingRequests.received({
            receivedRequest: (template.content as RelationshipTemplateContentJSON).onNewRelationship,
            requestSourceId: template.id
        })
    ).value;
    await rRuntimeServices.consumption.incomingRequests.checkPrerequisites({
        requestId: request.id
    });
    return {
        request: (
            await rRuntimeServices.consumption.incomingRequests.requireManualDecision({
                requestId: request.id
            })
        ).value,
        source: template.id
    };
}

export async function exchangeTemplateAndRecipientSendsResponse(
    sRuntimeServices: TestRuntimeServices,
    rRuntimeServices: TestRuntimeServices,
    templateContent: any,
    actionLowerCase: "accept" | "reject"
): Promise<RelationshipRequestWithRelationshipIfAccepted> {
    const { request, source: templateId } = await exchangeTemplateAndRecipientRequiresManualDecision(sRuntimeServices, rRuntimeServices, templateContent);
    const decidedRequest = (
        await rRuntimeServices.consumption.incomingRequests[actionLowerCase]({
            requestId: request.id,
            items: [
                {
                    accept: actionLowerCase === "accept"
                }
            ]
        })
    ).value;

    if (actionLowerCase !== "accept") return { request, relationship: undefined };

    const creationContent = RelationshipCreationContent.from({ response: decidedRequest.response!.content as unknown as IResponse }).toJSON();
    const result = await rRuntimeServices.transport.relationships.createRelationship({ creationContent, templateId });

    expect(result).toBeSuccessful();

    const relationship = result.value;
    const receivedCreationContent = relationship.creationContent;

    expect(receivedCreationContent["@type"]).toBe("RelationshipCreationContent");

    return { request, relationship };
}
