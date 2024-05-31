import { Serializable, SerializableBase } from "@js-soft/ts-serval";
import { ConsumptionController, LocalRequestStatus } from "@nmshd/consumption";
import {
    AttributeAlreadySharedAcceptResponseItemJSON,
    AttributeSuccessionAcceptResponseItemJSON,
    AuthenticationRequestItemJSON,
    ConsentRequestItemJSON,
    CreateAttributeAcceptResponseItemJSON,
    CreateAttributeRequestItemJSON,
    DeleteAttributeAcceptResponseItemJSON,
    DeleteAttributeRequestItemJSON,
    DisplayNameJSON,
    ErrorResponseItemJSON,
    FreeTextAcceptResponseItemJSON,
    FreeTextRequestItemJSON,
    GivenNameJSON,
    IdentityAttribute,
    IdentityAttributeJSON,
    IdentityAttributeQueryJSON,
    IQLQueryJSON,
    MailJSON,
    MiddleNameJSON,
    ProposeAttributeAcceptResponseItemJSON,
    ProposeAttributeRequestItemJSON,
    ReadAttributeAcceptResponseItemJSON,
    ReadAttributeRequestItemJSON,
    RegisterAttributeListenerAcceptResponseItemJSON,
    RegisterAttributeListenerRequestItemJSON,
    RejectResponseItemJSON,
    RelationshipAttribute,
    RelationshipAttributeJSON,
    RelationshipAttributeQueryJSON,
    RelationshipTemplateContent,
    RenderHints,
    RenderHintsEditType,
    RenderHintsJSON,
    RenderHintsTechnicalType,
    RequestItemGroupJSON,
    RequestItemJSON,
    RequestJSON,
    ResponseItemGroupJSON,
    ResponseItemJSON,
    ResponseItemResult,
    ResponseJSON,
    SexJSON,
    ShareAttributeAcceptResponseItemJSON,
    ShareAttributeRequestItemJSON,
    SurnameJSON,
    ThirdPartyRelationshipAttributeQueryJSON,
    ValueHints,
    ValueHintsJSON
} from "@nmshd/content";
import { CoreAddress, CoreId, IdentityController, Realm, Relationship, RelationshipStatus } from "@nmshd/transport";
import _ from "lodash";
import { Inject } from "typescript-ioc";
import {
    AuthenticationRequestItemDVO,
    ConsentRequestItemDVO,
    CreateAttributeRequestItemDVO,
    DeleteAttributeRequestItemDVO,
    DVOError,
    FileDVO,
    FreeTextRequestItemDVO,
    IdentityDVO,
    ProposeAttributeRequestItemDVO,
    ReadAttributeRequestItemDVO,
    RegisterAttributeListenerRequestItemDVO,
    RelationshipTemplateDVO,
    RequestItemDVO,
    RequestItemGroupDVO,
    ResponseDVO,
    ShareAttributeRequestItemDVO
} from "..";
import { TransportServices } from "../extensibility";
import { ConsumptionServices } from "../extensibility/ConsumptionServices";
import {
    FileDTO,
    IdentityDTO,
    LocalAttributeDTO,
    LocalAttributeListenerDTO,
    LocalRequestDTO,
    LocalResponseDTO,
    MessageDTO,
    MessageWithAttachmentsDTO,
    RecipientDTO,
    RelationshipChangeDTO,
    RelationshipDTO,
    RelationshipTemplateDTO
} from "../types";
import { RuntimeErrors } from "../useCases";
import {
    LocalAttributeDVO,
    LocalAttributeListenerDVO,
    LocalRequestDVO,
    LocalResponseDVO,
    OwnRelationshipAttributeDVO,
    PeerAttributeDVO,
    PeerRelationshipAttributeDVO,
    ProcessedAttributeQueryDVO,
    ProcessedIdentityAttributeQueryDVO,
    ProcessedIQLQueryDVO,
    ProcessedRelationshipAttributeQueryDVO,
    ProcessedThirdPartyRelationshipAttributeQueryDVO,
    RelationshipSettingDVO,
    RepositoryAttributeDVO,
    SharedToPeerAttributeDVO
} from "./consumption";
import {
    DecidableAuthenticationRequestItemDVO,
    DecidableConsentRequestItemDVO,
    DecidableCreateAttributeRequestItemDVO,
    DecidableDeleteAttributeRequestItemDVO,
    DecidableFreeTextRequestItemDVO,
    DecidableProposeAttributeRequestItemDVO,
    DecidableReadAttributeRequestItemDVO,
    DecidableRegisterAttributeListenerRequestItemDVO,
    DecidableShareAttributeRequestItemDVO
} from "./consumption/DecidableRequestItemDVOs";
import { PeerRelationshipTemplateDVO } from "./consumption/PeerRelationshipTemplateDVO";
import {
    AttributeQueryDVO,
    DraftIdentityAttributeDVO,
    DraftRelationshipAttributeDVO,
    IdentityAttributeQueryDVO,
    IQLQueryDVO,
    RelationshipAttributeQueryDVO,
    ThirdPartyRelationshipAttributeQueryDVO
} from "./content/AttributeDVOs";
import { MailDVO, RequestMessageDVO } from "./content/MailDVOs";
import { RequestDVO } from "./content/RequestDVO";
import {
    AttributeAlreadySharedAcceptResponseItemDVO,
    AttributeSuccessionAcceptResponseItemDVO,
    CreateAttributeAcceptResponseItemDVO,
    DeleteAttributeAcceptResponseItemDVO,
    ErrorResponseItemDVO,
    FreeTextAcceptResponseItemDVO,
    ProposeAttributeAcceptResponseItemDVO,
    ReadAttributeAcceptResponseItemDVO,
    RegisterAttributeListenerAcceptResponseItemDVO,
    RejectResponseItemDVO,
    ResponseItemDVO,
    ResponseItemGroupDVO,
    ShareAttributeAcceptResponseItemDVO
} from "./content/ResponseItemDVOs";
import { DataViewObject } from "./DataViewObject";
import { DataViewTranslateable } from "./DataViewTranslateable";
import { MessageDVO, MessageStatus, RecipientDVO } from "./transport/MessageDVO";
import { RelationshipChangeDVO, RelationshipChangeResponseDVO, RelationshipDirection, RelationshipDVO } from "./transport/RelationshipDVO";

export class DataViewExpander {
    public constructor(
        @Inject private readonly transport: TransportServices,
        @Inject private readonly consumption: ConsumptionServices,
        @Inject private readonly consumptionController: ConsumptionController,
        @Inject private readonly identityController: IdentityController
    ) {}

    public async expand(content: any, expectedType?: string): Promise<DataViewObject | DataViewObject[]> {
        let type = expectedType;
        if (content["@type"]) {
            type = content["@type"];
        }

        if (Array.isArray(content)) {
            if (content.length > 0) {
                type = content[0]["@type"];
            } else return [];
        }

        if (!type) {
            throw RuntimeErrors.general.invalidPayload("No type found.");
        }
        switch (type) {
            case "Message":
                if (Array.isArray(content)) {
                    return await this.expandMessageDTOs(content as MessageDTO[]);
                }

                return await this.expandMessageDTO(content as MessageDTO);

            case "Attribute":
                if (Array.isArray(content)) {
                    return await this.expandAttributes(content);
                }

                return await this.expandAttribute(content);

            case "Address":
                if (Array.isArray(content)) {
                    return await this.expandAddresses(content as string[]);
                }

                return await this.expandAddress(content as string);

            case "FileId":
                if (Array.isArray(content)) {
                    return await this.expandFileIds(content as string[]);
                }

                return await this.expandFileId(content as string);

            case "File":
                if (Array.isArray(content)) {
                    return await this.expandFileDTOs(content as FileDTO[]);
                }

                return await this.expandFileDTO(content as FileDTO);

            case "Recipient":
                if (Array.isArray(content)) {
                    return await this.expandRecipientDTOs(content as RecipientDTO[]);
                }

                return await this.expandAddress(content as string);

            case "Relationship":
                if (Array.isArray(content)) {
                    return await this.expandRelationshipDTOs(content as RelationshipDTO[]);
                }

                return await this.expandRelationshipDTO(content as RelationshipDTO);

            case "LocalAttribute":
                if (Array.isArray(content)) {
                    return await this.expandLocalAttributeDTOs(content as LocalAttributeDTO[]);
                }

                return await this.expandLocalAttributeDTO(content as LocalAttributeDTO);

            default:
                throw RuntimeErrors.general.notSupported(`No expander is defined for the @type '${type}'.`);
        }
    }

    public async expandMessageDTO(message: MessageDTO | MessageWithAttachmentsDTO): Promise<MessageDVO | MailDVO | RequestMessageDVO> {
        const recipientRelationships = await this.expandRecipientDTOs(message.recipients);
        const addressMap: Record<string, RecipientDVO> = {};
        recipientRelationships.forEach((value) => (addressMap[value.id] = value));
        const createdByRelationship = await this.expandAddress(message.createdBy);
        const fileIds = [];
        const filePromises = [];
        for (const attachment of message.attachments) {
            if (typeof attachment === "string") {
                filePromises.push(this.expandFileId(attachment));
                fileIds.push(attachment);
            } else {
                filePromises.push(this.expandFileDTO(attachment));
                fileIds.push(attachment.id);
            }
        }
        const files = await Promise.all(filePromises);

        const isOwn = message.isOwn;

        let peer: IdentityDVO;
        let status = MessageStatus.Received;
        if (isOwn) {
            const receivedByEveryone = message.recipients.every((r) => !!r.receivedAt);
            status = receivedByEveryone ? MessageStatus.Delivered : MessageStatus.Delivering;
            // Overwrite the RecipientDVO to be a IdentityDVO for this special case
            peer = { ...recipientRelationships[0], type: "IdentityDVO" };
        } else {
            peer = createdByRelationship;
        }

        const name = DataViewTranslateable.transport.messageName;
        const messageDVO: MessageDVO = {
            id: message.id,
            name: name,
            date: message.createdAt,
            type: "MessageDVO",
            createdByDevice: message.createdByDevice,
            createdAt: message.createdAt,
            createdBy: createdByRelationship,
            recipients: recipientRelationships,
            attachments: files,
            isOwn,
            recipientCount: message.recipients.length,
            attachmentCount: message.attachments.length,
            status,
            statusText: `i18n://dvo.message.${status}`,
            image: "",
            peer: peer,
            content: message.content,
            wasReadAt: message.wasReadAt
        };

        if (message.content["@type"] === "Mail" || message.content["@type"] === "RequestMail") {
            const mailContent = message.content as MailJSON;

            const to: RecipientDVO[] = mailContent.to.map((value) => addressMap[value]);

            let cc: RecipientDVO[] = [];
            if (mailContent.cc) {
                cc = mailContent.cc.map((value) => addressMap[value]);
            }

            const mailDVO: MailDVO = {
                ...messageDVO,
                type: "MailDVO",
                name: mailContent.subject ? mailContent.subject : DataViewTranslateable.consumption.mails.mailSubjectFallback,
                subject: mailContent.subject,
                body: mailContent.body,
                to: to,
                toCount: mailContent.to.length,
                cc: cc,
                ccCount: cc.length
            };

            return mailDVO;
        }

        if (message.content["@type"] === "Request") {
            let localRequest: LocalRequestDTO;
            if (isOwn) {
                const localRequestsResult = await this.consumption.outgoingRequests.getRequests({
                    query: { "source.reference": message.id }
                });
                if (localRequestsResult.value.length === 0) {
                    throw new Error("No LocalRequest has been found for this message id.");
                }
                if (localRequestsResult.value.length > 1) {
                    throw new Error("More than one LocalRequest has been found for this message id.");
                }
                localRequest = localRequestsResult.value[0];
            } else {
                const localRequestsResult = await this.consumption.incomingRequests.getRequests({
                    query: { "source.reference": message.id }
                });
                if (localRequestsResult.value.length === 0) {
                    throw new Error("No LocalRequest has been found for this message id.");
                }
                if (localRequestsResult.value.length > 1) {
                    throw new Error("More than one LocalRequest has been found for this message id.");
                }
                localRequest = localRequestsResult.value[0];
            }

            const requestMessageDVO: RequestMessageDVO = {
                ...messageDVO,
                type: "RequestMessageDVO",
                request: await this.expandLocalRequestDTO(localRequest)
            };
            return requestMessageDVO;
        }

        if (message.content["@type"] === "Response") {
            let localRequest: LocalRequestDTO;
            if (isOwn) {
                const localRequestsResult = await this.consumption.incomingRequests.getRequests({
                    query: { id: message.content.requestId }
                });

                if (localRequestsResult.value.length === 0) {
                    throw new Error("No LocalRequest has been found for this message id.");
                }
                if (localRequestsResult.value.length > 1) {
                    throw new Error("More than one LocalRequest has been found for this message id.");
                }
                localRequest = localRequestsResult.value[0];
            } else {
                const localRequestsResult = await this.consumption.outgoingRequests.getRequests({
                    query: { id: message.content.requestId }
                });
                if (localRequestsResult.value.length === 0) {
                    throw new Error("No LocalRequest has been found for this message id.");
                }
                if (localRequestsResult.value.length > 1) {
                    throw new Error("More than one LocalRequest has been found for this message id.");
                }
                localRequest = localRequestsResult.value[0];
            }

            const requestMessageDVO: RequestMessageDVO = {
                ...messageDVO,
                type: "RequestMessageDVO",
                request: await this.expandLocalRequestDTO(localRequest)
            };
            return requestMessageDVO;
        }

        return messageDVO;
    }

    public async expandMessageDTOs(messages: MessageDTO[]): Promise<(MessageDVO | MailDVO | RequestMessageDVO)[]> {
        const messagePromises = messages.map((message) => this.expandMessageDTO(message));
        return await Promise.all(messagePromises);
    }

    public async expandRelationshipTemplateDTO(template: RelationshipTemplateDTO): Promise<PeerRelationshipTemplateDVO | RelationshipTemplateDVO> {
        let onNewRelationship: RequestDVO | undefined;
        let onExistingRelationship: RequestDVO | undefined;
        const createdBy = await this.expandAddress(template.createdBy);

        const type = template.isOwn ? "RelationshipTemplateDVO" : "PeerRelationshipTemplateDVO";

        let name = template.isOwn ? "i18n://dvo.template.outgoing.name" : "i18n://dvo.template.incoming.name";
        const description = template.isOwn ? "i18n://dvo.template.outgoing.description" : "i18n://dvo.template.incoming.description";
        let expandedLocalRequest;

        if (template.content["@type"] === "RelationshipTemplateContent") {
            const templateContent = RelationshipTemplateContent.from(template.content).toJSON();
            if (templateContent.title) {
                name = templateContent.title;
            }
            let localRequest;

            if (!template.isOwn) {
                const incomingRequestResult = await this.consumption.incomingRequests.getRequests({
                    query: {
                        "source.reference": template.id,
                        status: LocalRequestStatus.ManualDecisionRequired
                    }
                });
                if (incomingRequestResult.value.length > 0) {
                    localRequest = incomingRequestResult.value[0];
                    expandedLocalRequest = await this.expandLocalRequestDTO(localRequest);
                } else {
                    const completedRequestResult = await this.consumption.incomingRequests.getRequests({
                        query: {
                            "source.reference": template.id,
                            status: [LocalRequestStatus.Decided, LocalRequestStatus.Completed]
                        }
                    });
                    if (completedRequestResult.value.length > 0) {
                        localRequest = completedRequestResult.value[0];
                        expandedLocalRequest = await this.expandLocalRequestDTO(localRequest);
                    }
                }
            }

            onNewRelationship = await this.expandRequest(templateContent.onNewRelationship);
            if (templateContent.onExistingRelationship) {
                onExistingRelationship = await this.expandRequest(templateContent.onExistingRelationship);
            }
        }
        return {
            name,
            description,
            type,
            date: template.createdAt,
            ...template,
            createdBy,
            request: expandedLocalRequest,
            onNewRelationship,
            onExistingRelationship
        };
    }

    public async expandRelationshipTemplateDTOs(templates: RelationshipTemplateDTO[]): Promise<(PeerRelationshipTemplateDVO | RelationshipTemplateDVO)[]> {
        const templatePromises = templates.map((template) => this.expandRelationshipTemplateDTO(template));
        return await Promise.all(templatePromises);
    }

    public async expandRequest(request: RequestJSON, localRequestDTO?: LocalRequestDTO, localResponseDVO?: LocalResponseDVO): Promise<RequestDVO> {
        const id = request.id ? request.id : "";
        const itemDVOs = [];
        for (let i = 0; i < request.items.length; i++) {
            const requestItem = request.items[i];
            const responseItem = localResponseDVO?.content.items[i];
            itemDVOs.push(await this.expandRequestGroupOrItem(requestItem, localRequestDTO, responseItem));
        }
        return {
            id: id,
            name: `${request["@type"]} ${id}`,
            type: "RequestDVO",
            date: request.expiresAt,
            ...request,
            items: itemDVOs,
            response: localResponseDVO?.content
        };
    }

    public async expandRequests(requests: RequestJSON[]): Promise<RequestDVO[]> {
        const requestPromises = requests.map((request) => this.expandRequest(request));
        return await Promise.all(requestPromises);
    }

    public async expandRequestItem(requestItem: RequestItemJSON, localRequestDTO?: LocalRequestDTO, responseItemDVO?: ResponseItemDVO): Promise<RequestItemDVO> {
        let error: DVOError | undefined;
        let isDecidable = false;
        if (localRequestDTO && !localRequestDTO.isOwn && (localRequestDTO.status === "DecisionRequired" || localRequestDTO.status === "ManualDecisionRequired")) {
            isDecidable = true;
        }
        switch (requestItem["@type"]) {
            case "ReadAttributeRequestItem":
                const readAttributeRequestItem = requestItem as ReadAttributeRequestItemJSON;
                if (isDecidable) {
                    const processedQuery = await this.processAttributeQuery(readAttributeRequestItem.query);
                    // ThirdPartyAttributeQueries without results cannot be changed.
                    if (processedQuery.type === "ProcessedThirdPartyRelationshipAttributeQueryDVO" && processedQuery.results.length === 0) {
                        isDecidable = false;
                        error = {
                            code: "dvo.requestItem.error.noResultsForThirdPartyRelationshipAttributeQuery",
                            message: "There are no matching Attributes for this ThirdPartyRelationshipAttributeQuery."
                        };
                    }

                    // IQLQueries without results and attributeCreationHints cannot be changed.
                    if (
                        processedQuery.type === "ProcessedIQLQueryDVO" &&
                        processedQuery.results.length === 0 &&
                        !(readAttributeRequestItem.query as IQLQueryJSON).attributeCreationHints
                    ) {
                        isDecidable = false;
                        error = {
                            code: "dvo.requestItem.error.noResultsForIQLQueryDVO",
                            message: "There are no matching Attributes for this IQLQuery and no attributeCreationHint is set."
                        };
                    }

                    return {
                        ...readAttributeRequestItem,
                        type: "DecidableReadAttributeRequestItemDVO",
                        id: "",
                        name: requestItem.title ? requestItem.title : "i18n://dvo.requestItem.DecidableReadAttributeRequestItem.name",
                        query: processedQuery,
                        isDecidable,
                        error,
                        response: responseItemDVO
                    } as DecidableReadAttributeRequestItemDVO;
                }

                return {
                    ...readAttributeRequestItem,
                    type: "ReadAttributeRequestItemDVO",
                    id: "",
                    name: requestItem.title ? requestItem.title : "i18n://dvo.requestItem.ReadAttributeRequestItem.name",
                    query: await this.expandAttributeQuery(readAttributeRequestItem.query),
                    isDecidable,
                    response: responseItemDVO
                } as ReadAttributeRequestItemDVO;

            case "CreateAttributeRequestItem":
                const createAttributeRequestItem = requestItem as CreateAttributeRequestItemJSON;
                const attribute = await this.expandAttribute(createAttributeRequestItem.attribute);
                let isIdentityAttribute = false;
                if (attribute.type === "DraftIdentityAttributeDVO") {
                    isIdentityAttribute = true;
                }
                const name = requestItem.title;
                const description = requestItem.description;
                let fallbackName;

                if (isDecidable) {
                    fallbackName = "i18n://dvo.requestItem.DecidableCreateRelationshipAttributeRequestItem.name";
                    if (isIdentityAttribute) {
                        fallbackName = "i18n://dvo.requestItem.DecidableCreateIdentityAttributeRequestItem.name";
                    }
                    return {
                        ...createAttributeRequestItem,
                        type: "DecidableCreateAttributeRequestItemDVO",
                        id: "",
                        name: name ?? fallbackName,
                        description: description ?? fallbackName,
                        attribute,
                        isDecidable,
                        response: responseItemDVO
                    } as DecidableCreateAttributeRequestItemDVO;
                }
                fallbackName = "i18n://dvo.requestItem.CreateRelationshipAttributeRequestItem.name";
                if (isIdentityAttribute) {
                    fallbackName = "i18n://dvo.requestItem.CreateIdentityAttributeRequestItem.name";
                }
                return {
                    ...createAttributeRequestItem,
                    type: "CreateAttributeRequestItemDVO",
                    id: "",
                    name: name ?? fallbackName,
                    description: description ?? fallbackName,
                    attribute,
                    isDecidable,
                    response: responseItemDVO
                } as CreateAttributeRequestItemDVO;

            case "DeleteAttributeRequestItem":
                const deleteAttributeRequestItem = requestItem as DeleteAttributeRequestItemJSON;
                const localAttributeResultForDelete = await this.consumption.attributes.getAttribute({ id: deleteAttributeRequestItem.attributeId });
                const localAttributeDVOForDelete = await this.expandLocalAttributeDTO(localAttributeResultForDelete.value);

                if (isDecidable) {
                    return {
                        ...deleteAttributeRequestItem,
                        type: "DecidableDeleteAttributeRequestItemDVO",
                        id: "",
                        name: requestItem.title ? requestItem.title : "i18n://dvo.requestItem.DecidableDeleteAttributeRequestItem.name",
                        isDecidable,
                        response: responseItemDVO,
                        attribute: localAttributeDVOForDelete
                    } as DecidableDeleteAttributeRequestItemDVO;
                }
                return {
                    ...deleteAttributeRequestItem,
                    type: "DeleteAttributeRequestItemDVO",
                    id: "",
                    name: requestItem.title ? requestItem.title : "i18n://dvo.requestItem.DeleteAttributeRequestItem.name",
                    isDecidable,
                    response: responseItemDVO,
                    attribute: localAttributeDVOForDelete
                } as DeleteAttributeRequestItemDVO;

            case "ProposeAttributeRequestItem":
                const proposeAttributeRequestItem = requestItem as ProposeAttributeRequestItemJSON;
                if (localRequestDTO) {
                    proposeAttributeRequestItem.attribute.owner = localRequestDTO.isOwn ? localRequestDTO.peer : this.identityController.address.toString();
                }

                let proposedValueOverruled = false;
                if (responseItemDVO && responseItemDVO.result === ResponseItemResult.Accepted) {
                    if (responseItemDVO.type === "AttributeSuccessionAcceptResponseItemDVO") {
                        const attributeSuccessionResponseItem = responseItemDVO as AttributeSuccessionAcceptResponseItemDVO;
                        proposedValueOverruled = !_.isEqual(attributeSuccessionResponseItem.successor.content.value, proposeAttributeRequestItem.attribute.value);
                    } else if (responseItemDVO.type === "AttributeAlreadySharedAcceptResponseItemDVO") {
                        const attributeAlreadySharedResponseItem = responseItemDVO as AttributeAlreadySharedAcceptResponseItemDVO;
                        proposedValueOverruled = !_.isEqual(attributeAlreadySharedResponseItem.attribute.content.value, proposeAttributeRequestItem.attribute.value);
                    } else {
                        const proposeAttributeResponseItem = responseItemDVO as ProposeAttributeAcceptResponseItemDVO;
                        proposedValueOverruled = !_.isEqual(proposeAttributeResponseItem.attribute.content.value, proposeAttributeRequestItem.attribute.value);
                    }
                }

                if (isDecidable) {
                    return {
                        ...proposeAttributeRequestItem,
                        type: "DecidableProposeAttributeRequestItemDVO",
                        id: "",
                        name: requestItem.title ? requestItem.title : "i18n://dvo.requestItem.DecidableProposeAttributeRequestItem.name",
                        attribute: await this.expandAttribute(proposeAttributeRequestItem.attribute),
                        query: await this.processAttributeQuery(proposeAttributeRequestItem.query),
                        isDecidable,
                        response: responseItemDVO
                    } as DecidableProposeAttributeRequestItemDVO;
                }
                return {
                    ...proposeAttributeRequestItem,
                    type: "ProposeAttributeRequestItemDVO",
                    id: "",
                    name: requestItem.title ? requestItem.title : "i18n://dvo.requestItem.ProposeAttributeRequestItem.name",
                    attribute: await this.expandAttribute(proposeAttributeRequestItem.attribute),
                    query: await this.expandAttributeQuery(proposeAttributeRequestItem.query),
                    isDecidable,
                    response: responseItemDVO,
                    proposedValueOverruled
                } as ProposeAttributeRequestItemDVO;

            case "ShareAttributeRequestItem":
                const shareAttributeRequestItem = requestItem as ShareAttributeRequestItemJSON;
                const attributeDVO = await this.expandAttribute(shareAttributeRequestItem.attribute);
                if (isDecidable) {
                    return {
                        ...shareAttributeRequestItem,
                        type: "DecidableShareAttributeRequestItemDVO",
                        id: "",
                        name: requestItem.title ? requestItem.title : "i18n://dvo.requestItem.DecidableProposeAttributeRequestItem.name",
                        attribute: attributeDVO,
                        isDecidable,
                        response: responseItemDVO
                    } as DecidableShareAttributeRequestItemDVO;
                }
                // We have to manually copy the attribute id here, otherwise we could not link to the local attribute
                const shareAttributeResponseItem = responseItemDVO as ShareAttributeAcceptResponseItemDVO | undefined;
                if (shareAttributeResponseItem) {
                    attributeDVO.id = shareAttributeResponseItem.attributeId;
                }
                return {
                    ...shareAttributeRequestItem,
                    type: "ShareAttributeRequestItemDVO",
                    id: "",
                    name: requestItem.title ? requestItem.title : "i18n://dvo.requestItem.ProposeAttributeRequestItem.name",
                    attribute: attributeDVO,
                    isDecidable,
                    response: responseItemDVO
                } as ShareAttributeRequestItemDVO;

            case "AuthenticationRequestItem":
                const authenticationRequestItem = requestItem as AuthenticationRequestItemJSON;

                if (isDecidable) {
                    return {
                        ...authenticationRequestItem,
                        type: "DecidableAuthenticationRequestItemDVO",
                        id: "",
                        name: requestItem.title ? requestItem.title : "i18n://dvo.requestItem.DecidableAuthenticationRequestItem.name",
                        isDecidable,
                        response: responseItemDVO
                    } as DecidableAuthenticationRequestItemDVO;
                }
                return {
                    ...authenticationRequestItem,
                    type: "AuthenticationRequestItemDVO",
                    id: "",
                    name: requestItem.title ? requestItem.title : "i18n://dvo.requestItem.AuthenticationRequestItem.name",
                    isDecidable,
                    response: responseItemDVO
                } as AuthenticationRequestItemDVO;

            case "ConsentRequestItem":
                const consentRequestItem = requestItem as ConsentRequestItemJSON;

                if (isDecidable) {
                    return {
                        ...consentRequestItem,
                        type: "DecidableConsentRequestItemDVO",
                        id: "",
                        name: requestItem.title ? requestItem.title : "i18n://dvo.requestItem.DecidableConsentRequestItem.name",
                        isDecidable,
                        response: responseItemDVO
                    } as DecidableConsentRequestItemDVO;
                }
                return {
                    ...consentRequestItem,
                    type: "ConsentRequestItemDVO",
                    id: "",
                    name: requestItem.title ? requestItem.title : "i18n://dvo.requestItem.ConsentRequestItem.name",
                    isDecidable,
                    response: responseItemDVO
                } as ConsentRequestItemDVO;

            case "FreeTextRequestItem":
                const freeTextRequestItem = requestItem as FreeTextRequestItemJSON;

                if (isDecidable) {
                    return {
                        ...freeTextRequestItem,
                        type: "DecidableFreeTextRequestItemDVO",
                        id: "",
                        name: requestItem.title ? requestItem.title : "i18n://dvo.requestItem.DecidableFreeTextRequestItem.name",
                        isDecidable,
                        response: responseItemDVO
                    } as DecidableFreeTextRequestItemDVO;
                }
                return {
                    ...freeTextRequestItem,
                    type: "FreeTextRequestItemDVO",
                    id: "",
                    name: requestItem.title ? requestItem.title : "i18n://dvo.requestItem.FreeTextRequestItem.name",
                    isDecidable,
                    response: responseItemDVO
                } as FreeTextRequestItemDVO;

            case "RegisterAttributeListenerRequestItem":
                const registerAttributeListenerRequestItem = requestItem as RegisterAttributeListenerRequestItemJSON;
                const queryDVO = (await this.expandAttributeQuery(registerAttributeListenerRequestItem.query)) as
                    | IdentityAttributeQueryDVO
                    | ThirdPartyRelationshipAttributeQueryDVO;

                if (isDecidable) {
                    return {
                        ...registerAttributeListenerRequestItem,
                        type: "DecidableRegisterAttributeListenerRequestItemDVO",
                        id: "",
                        query: queryDVO,
                        name: requestItem.title ? requestItem.title : "i18n://dvo.requestItem.DecidableRegisterAttributeListenerRequestItem.name",
                        isDecidable,
                        response: responseItemDVO
                    } as DecidableRegisterAttributeListenerRequestItemDVO;
                }
                return {
                    ...registerAttributeListenerRequestItem,
                    type: "RegisterAttributeListenerRequestItemDVO",
                    id: "",
                    query: queryDVO,
                    name: requestItem.title ? requestItem.title : "i18n://dvo.requestItem.RegisterAttributeListenerRequestItem.name",
                    isDecidable,
                    response: responseItemDVO
                } as RegisterAttributeListenerRequestItemDVO;

            default:
                return {
                    ...requestItem,
                    type: "RequestItemDVO",
                    id: "",
                    name: requestItem.title ? requestItem.title : "i18n://dvo.requestItem.name",
                    isDecidable,
                    response: responseItemDVO
                };
        }
    }

    public async expandRequestGroupOrItem(
        requestGroupOrItem: RequestItemGroupJSON | RequestItemJSON,
        localRequestDTO?: LocalRequestDTO,
        responseGroupOrItemDVO?: ResponseItemDVO | ResponseItemGroupDVO
    ): Promise<RequestItemGroupDVO | RequestItemDVO> {
        if (requestGroupOrItem["@type"] === "RequestItemGroup") {
            let isDecidable = false;
            if (localRequestDTO && !localRequestDTO.isOwn && (localRequestDTO.status === "DecisionRequired" || localRequestDTO.status === "ManualDecisionRequired")) {
                isDecidable = true;
            }

            const requestGroup = requestGroupOrItem as RequestItemGroupJSON;
            const responseGroup = responseGroupOrItemDVO as ResponseItemGroupDVO | undefined;
            const itemDVOs = [];
            for (let i = 0; i < requestGroup.items.length; i++) {
                const requestItem = requestGroup.items[i];
                const responseItem = responseGroup?.items[i];
                itemDVOs.push(await this.expandRequestItem(requestItem, localRequestDTO, responseItem));
            }
            return {
                type: "RequestItemGroupDVO",
                items: itemDVOs,
                isDecidable,
                title: requestGroupOrItem.title,
                description: requestGroupOrItem.description,
                mustBeAccepted: requestGroupOrItem.mustBeAccepted,
                response: responseGroup
            };
        }
        return await this.expandRequestItem(requestGroupOrItem, localRequestDTO, responseGroupOrItemDVO as ResponseItemDVO);
    }

    public async expandResponseItem(responseItem: ResponseItemJSON): Promise<ResponseItemDVO> {
        if (responseItem.result === "Accepted") {
            const name = `i18n://dvo.responseItem.${responseItem["@type"]}.acceptedName`;

            switch (responseItem["@type"]) {
                case "ReadAttributeAcceptResponseItem":
                    const readAttributeResponseItem = responseItem as ReadAttributeAcceptResponseItemJSON;
                    const localAttributeResultForRead = await this.consumption.attributes.getAttribute({ id: readAttributeResponseItem.attributeId });
                    const localAttributeDVOForRead = await this.expandLocalAttributeDTO(localAttributeResultForRead.value);

                    return {
                        ...readAttributeResponseItem,
                        type: "ReadAttributeAcceptResponseItemDVO",
                        id: readAttributeResponseItem.attributeId,
                        name: name,
                        attribute: localAttributeDVOForRead
                    } as ReadAttributeAcceptResponseItemDVO;

                case "CreateAttributeAcceptResponseItem":
                    const createAttributeResponseItem = responseItem as CreateAttributeAcceptResponseItemJSON;
                    const localAttributeResultForCreate = await this.consumption.attributes.getAttribute({ id: createAttributeResponseItem.attributeId });
                    const localAttributeDVOForCreate = await this.expandLocalAttributeDTO(localAttributeResultForCreate.value);

                    return {
                        ...createAttributeResponseItem,
                        type: "CreateAttributeAcceptResponseItemDVO",
                        id: createAttributeResponseItem.attributeId,
                        name: name,
                        attribute: localAttributeDVOForCreate
                    } as CreateAttributeAcceptResponseItemDVO;

                case "DeleteAttributeAcceptResponseItem":
                    const deleteAttributeResponseItem = responseItem as DeleteAttributeAcceptResponseItemJSON;

                    return {
                        ...deleteAttributeResponseItem,
                        type: "DeleteAttributeAcceptResponseItemDVO",
                        id: "",
                        name: name
                    } as DeleteAttributeAcceptResponseItemDVO;

                case "ProposeAttributeAcceptResponseItem":
                    const proposeAttributeResponseItem = responseItem as ProposeAttributeAcceptResponseItemJSON;
                    const localAttributeResultForPropose = await this.consumption.attributes.getAttribute({ id: proposeAttributeResponseItem.attributeId });
                    const localAttributeDVOForPropose = await this.expandLocalAttributeDTO(localAttributeResultForPropose.value);

                    return {
                        ...proposeAttributeResponseItem,
                        type: "ProposeAttributeAcceptResponseItemDVO",
                        id: proposeAttributeResponseItem.attributeId,
                        name: name,
                        attribute: localAttributeDVOForPropose
                    } as ProposeAttributeAcceptResponseItemDVO;

                case "ShareAttributeAcceptResponseItem":
                    const shareAttributeResponseItem = responseItem as ShareAttributeAcceptResponseItemJSON;
                    const localAttributeResultForShare = await this.consumption.attributes.getAttribute({ id: shareAttributeResponseItem.attributeId });
                    const localAttributeDVOForShare = await this.expandLocalAttributeDTO(localAttributeResultForShare.value);

                    return {
                        ...shareAttributeResponseItem,
                        type: "ShareAttributeAcceptResponseItemDVO",
                        id: shareAttributeResponseItem.attributeId,
                        name: name,
                        attribute: localAttributeDVOForShare
                    } as ShareAttributeAcceptResponseItemDVO;

                case "FreeTextAcceptResponseItem":
                    const freeTextResponseItem = responseItem as FreeTextAcceptResponseItemJSON;

                    return {
                        ...freeTextResponseItem,
                        type: "FreeTextAcceptResponseItemDVO",
                        id: "",
                        name: name
                    } as FreeTextAcceptResponseItemDVO;

                case "RegisterAttributeListenerAcceptResponseItem":
                    const registerAttributeListenerResponseItem = responseItem as RegisterAttributeListenerAcceptResponseItemJSON;
                    const localAttributeListenerResult = await this.consumption.attributeListeners.getAttributeListener({ id: registerAttributeListenerResponseItem.listenerId });
                    const localAttributeListener = await this.expandLocalAttributeListenerDTO(localAttributeListenerResult.value);

                    return {
                        ...registerAttributeListenerResponseItem,
                        type: "RegisterAttributeListenerAcceptResponseItemDVO",
                        id: registerAttributeListenerResponseItem.listenerId,
                        name: name,
                        listener: localAttributeListener
                    } as RegisterAttributeListenerAcceptResponseItemDVO;

                case "AttributeSuccessionAcceptResponseItem":
                    const attributeSuccessionResponseItem = responseItem as AttributeSuccessionAcceptResponseItemJSON;
                    const localPredecessorResult = await this.consumption.attributes.getAttribute({ id: attributeSuccessionResponseItem.predecessorId });
                    const localPredecessorDVOResult = await this.expandLocalAttributeDTO(localPredecessorResult.value);
                    const localSuccessorResult = await this.consumption.attributes.getAttribute({ id: attributeSuccessionResponseItem.successorId });
                    const localSuccessorDVOResult = await this.expandLocalAttributeDTO(localSuccessorResult.value);

                    return {
                        ...attributeSuccessionResponseItem,
                        type: "AttributeSuccessionAcceptResponseItemDVO",
                        id: "",
                        name: name,
                        predecessor: localPredecessorDVOResult,
                        successor: localSuccessorDVOResult
                    } as AttributeSuccessionAcceptResponseItemDVO;

                case "AttributeAlreadySharedAcceptResponseItem":
                    const attributeAlreadySharedResponseItem = responseItem as AttributeAlreadySharedAcceptResponseItemJSON;
                    const localAttributeResult = await this.consumption.attributes.getAttribute({ id: attributeAlreadySharedResponseItem.attributeId });
                    const localAttributeDVOResult = await this.expandLocalAttributeDTO(localAttributeResult.value);

                    return {
                        ...attributeAlreadySharedResponseItem,
                        type: "AttributeAlreadySharedAcceptResponseItemDVO",
                        id: "",
                        name: name,
                        attribute: localAttributeDVOResult
                    } as AttributeAlreadySharedAcceptResponseItemDVO;

                default:
                    return {
                        ...responseItem,
                        type: "AcceptResponseItemDVO",
                        id: "",
                        name: name
                    };
            }
        } else if (responseItem.result === "Rejected") {
            const rejectResponseItem = responseItem as RejectResponseItemJSON;
            return {
                ...rejectResponseItem,
                type: "RejectResponseItemDVO",
                id: "",
                name: "i18n://dvo.responseItem.rejected"
            } as RejectResponseItemDVO;
        } else {
            const errorResponseItem = responseItem as ErrorResponseItemJSON;
            return {
                ...errorResponseItem,
                type: "ErrorResponseItemDVO",
                id: "",
                name: "i18n://dvo.responseItem.error"
            } as ErrorResponseItemDVO;
        }
    }

    public async expandLocalAttributeListenerDTO(attributeListener: LocalAttributeListenerDTO): Promise<LocalAttributeListenerDVO> {
        const query = (await this.expandAttributeQuery(attributeListener.query)) as IdentityAttributeQueryDVO | ThirdPartyRelationshipAttributeQueryDVO;
        const peer = await this.expandIdentityForAddress(attributeListener.peer);
        return {
            type: "LocalAttributeListenerDVO",
            name: "dvo.localAttributeListener.name",
            description: "dvo.localAttributeListener.description",
            ...attributeListener,
            query,
            peer
        };
    }

    public async expandResponseGroupOrItem(responseGroupOrItem: ResponseItemGroupJSON | ResponseItemJSON): Promise<ResponseItemGroupDVO | ResponseItemDVO> {
        if (responseGroupOrItem["@type"] === "ResponseItemGroup") {
            const group = responseGroupOrItem as ResponseItemGroupJSON;
            const itemDVOs = [];
            for (const requestItem of group.items) {
                itemDVOs.push(await this.expandResponseItem(requestItem));
            }
            return {
                type: "ResponseItemGroupDVO",
                items: itemDVOs
            };
        }
        return await this.expandResponseItem(responseGroupOrItem as ResponseItemJSON);
    }

    public async expandLocalRequestDTO(request: LocalRequestDTO): Promise<LocalRequestDVO> {
        const response = request.response ? await this.expandLocalResponseDTO(request.response, request) : undefined;
        const requestDVO = await this.expandRequest(request.content, request, response);
        const peerDVO = await this.expandAddress(request.peer);
        let isDecidable = false;
        if (!request.isOwn && (request.status === "DecisionRequired" || request.status === "ManualDecisionRequired")) {
            isDecidable = true;
        }
        const directionLabel = request.isOwn ? "outgoing" : "incoming";
        const statusText = `i18n://dvo.localRequest.status.${request.status}`;
        const sourceType = request.source?.type ?? "unknown";

        const requestIdOutOfResponse = request.response ? request.response.content.requestId : "";

        return {
            ...request,
            id: request.id ? request.id : requestIdOutOfResponse,
            content: requestDVO,
            items: requestDVO.items,
            name: `i18n://dvo.localRequest.${sourceType}.${directionLabel}.${request.status}.name`,
            directionText: `i18n://dvo.localRequest.direction.${directionLabel}`,
            description: `i18n://dvo.localRequest.${sourceType}.${directionLabel}.${request.status}.description`,
            sourceTypeText: `i18n://dvo.localRequest.sourceType.${sourceType}`,
            type: "LocalRequestDVO",
            date: request.createdAt,
            createdBy: request.isOwn ? this.expandSelf() : peerDVO,
            decider: request.isOwn ? peerDVO : this.expandSelf(),
            peer: peerDVO,
            response,
            statusText: statusText,
            isDecidable
        };
    }

    public async expandLocalRequestDTOs(localRequests: LocalRequestDTO[]): Promise<LocalRequestDVO[]> {
        const localRequestPromises = localRequests.map((localRequest) => this.expandLocalRequestDTO(localRequest));
        return await Promise.all(localRequestPromises);
    }

    public async expandResponse(response: ResponseJSON, request: LocalRequestDTO): Promise<ResponseDVO> {
        const itemDVOs = [];
        for (const responseItem of response.items) {
            itemDVOs.push(await this.expandResponseGroupOrItem(responseItem));
        }
        return {
            id: request.id,
            name: "i18n://dvo.response.name",
            type: "ResponseDVO",
            ...response,
            items: itemDVOs
        };
    }

    public async expandLocalResponseDTO(response: LocalResponseDTO, request: LocalRequestDTO): Promise<LocalResponseDVO> {
        const responseDVO = await this.expandResponse(response.content, request);
        return {
            ...response,
            id: request.id,
            name: "i18n://dvo.localResponse.name",
            type: "LocalResponseDVO",
            date: response.createdAt,
            content: responseDVO,
            items: response.content.items
        };
    }

    public async expandLocalAttributeDTO(
        attribute: LocalAttributeDTO
    ): Promise<RepositoryAttributeDVO | SharedToPeerAttributeDVO | PeerAttributeDVO | PeerRelationshipAttributeDVO | OwnRelationshipAttributeDVO> {
        const valueType = attribute.content.value["@type"];
        const localAttribute = await this.consumptionController.attributes.getLocalAttribute(CoreId.from(attribute.id));
        if (!localAttribute) {
            throw new Error("Attribute not found");
        }
        const owner = attribute.content.owner;

        let name = `i18n://dvo.attribute.name.${valueType}`;
        let description = `i18n://dvo.attribute.description.${valueType}`;
        const renderHints = localAttribute.content.value.renderHints.toJSON();
        const valueHints = localAttribute.content.value.valueHints.toJSON();

        if (localAttribute.shareInfo) {
            const peer = localAttribute.shareInfo.peer.toString();
            if (localAttribute.content instanceof RelationshipAttribute) {
                const relationshipAttribute = localAttribute.content;
                const value = relationshipAttribute.value;
                if ("title" in value) {
                    name = value.title;
                }
                if ("description" in value && !!value.description) {
                    description = value.description;
                }

                // Peer Relationship Attribute
                if (relationshipAttribute.owner.toString() === peer) {
                    return {
                        type: "PeerRelationshipAttributeDVO",
                        id: attribute.id,
                        name,
                        key: relationshipAttribute.key,
                        confidentiality: relationshipAttribute.confidentiality,
                        description,
                        content: attribute.content,
                        value: attribute.content.value,
                        date: attribute.createdAt,
                        owner,
                        renderHints,
                        valueHints,
                        isValid: true,
                        createdAt: attribute.createdAt,
                        isOwn: false,
                        peer: peer,
                        isDraft: false,
                        requestReference: localAttribute.shareInfo.requestReference?.toString(),
                        notificationReference: localAttribute.shareInfo.notificationReference?.toString(),
                        valueType,
                        isTechnical: relationshipAttribute.isTechnical,
                        deletionStatus: localAttribute.deletionInfo?.deletionStatus,
                        deletionDate: localAttribute.deletionInfo?.deletionDate.toString()
                    };
                }
                // Own Relationship Attribute
                return {
                    type: "OwnRelationshipAttributeDVO",
                    id: attribute.id,
                    name,
                    key: relationshipAttribute.key,
                    confidentiality: relationshipAttribute.confidentiality,
                    description,
                    content: attribute.content,
                    value: attribute.content.value,
                    date: attribute.createdAt,
                    owner,
                    renderHints,
                    valueHints,
                    isValid: true,
                    createdAt: attribute.createdAt,
                    isOwn: true,
                    peer: peer,
                    isDraft: false,
                    requestReference: localAttribute.shareInfo.requestReference?.toString(),
                    notificationReference: localAttribute.shareInfo.notificationReference?.toString(),
                    valueType,
                    isTechnical: relationshipAttribute.isTechnical,
                    deletionStatus: localAttribute.deletionInfo?.deletionStatus,
                    deletionDate: localAttribute.deletionInfo?.deletionDate.toString()
                };
            }
            const identityAttribute = localAttribute.content;

            if (identityAttribute.owner.toString() === peer) {
                // Peer Attribute
                return {
                    type: "PeerAttributeDVO",
                    id: attribute.id,
                    name,
                    description,
                    content: attribute.content,
                    value: attribute.content.value,
                    date: attribute.createdAt,
                    owner: owner,
                    renderHints,
                    valueHints,
                    isValid: true,
                    createdAt: attribute.createdAt,
                    isOwn: false,
                    peer: peer,
                    isDraft: false,
                    requestReference: localAttribute.shareInfo.requestReference?.toString(),
                    notificationReference: localAttribute.shareInfo.notificationReference?.toString(),
                    tags: identityAttribute.tags,
                    valueType,
                    deletionStatus: localAttribute.deletionInfo?.deletionStatus,
                    deletionDate: localAttribute.deletionInfo?.deletionDate.toString()
                };
            }
            // Own Shared Attribute
            return {
                type: "SharedToPeerAttributeDVO",
                id: attribute.id,
                name,
                description,
                content: attribute.content,
                value: attribute.content.value,
                date: attribute.createdAt,
                owner: owner,
                renderHints,
                valueHints,
                isValid: true,
                createdAt: attribute.createdAt,
                isOwn: true,
                peer: peer,
                isDraft: false,
                requestReference: localAttribute.shareInfo.requestReference?.toString(),
                notificationReference: localAttribute.shareInfo.notificationReference?.toString(),
                sourceAttribute: localAttribute.shareInfo.sourceAttribute?.toString(),
                tags: identityAttribute.tags,
                valueType,
                deletionStatus: localAttribute.deletionInfo?.deletionStatus,
                deletionDate: localAttribute.deletionInfo?.deletionDate.toString()
            };
        }
        const identityAttribute = localAttribute.content as IdentityAttribute;

        const sharedToPeerAttributes = await this.consumption.attributes.getAttributes({ query: { "shareInfo.sourceAttribute": attribute.id } });
        const sharedToPeerDVOs = await this.expandLocalAttributeDTOs(sharedToPeerAttributes.value);

        // Own Source Attribute
        return {
            type: "RepositoryAttributeDVO",
            id: attribute.id,
            name,
            description,
            content: attribute.content,
            value: attribute.content.value,
            date: attribute.createdAt,
            owner: owner,
            renderHints,
            valueHints,
            isValid: true,
            createdAt: attribute.createdAt,
            isOwn: true,
            isDraft: false,
            sharedWith: sharedToPeerDVOs as SharedToPeerAttributeDVO[],
            tags: identityAttribute.tags,
            valueType
        };
    }

    public async expandLocalAttributeDTOs(
        attributes: LocalAttributeDTO[]
    ): Promise<(RepositoryAttributeDVO | SharedToPeerAttributeDVO | PeerAttributeDVO | PeerRelationshipAttributeDVO | OwnRelationshipAttributeDVO)[]> {
        const attributesPromise = attributes.map((attribute) => this.expandLocalAttributeDTO(attribute));
        return await Promise.all(attributesPromise);
    }

    public async expandAttributeQuery(
        query: IdentityAttributeQueryJSON | RelationshipAttributeQueryJSON | ThirdPartyRelationshipAttributeQueryJSON | IQLQueryJSON
    ): Promise<AttributeQueryDVO> {
        switch (query["@type"]) {
            case "IdentityAttributeQuery":
                return this.expandIdentityAttributeQuery(query);
            case "RelationshipAttributeQuery":
                return await this.expandRelationshipAttributeQuery(query);
            case "ThirdPartyRelationshipAttributeQuery":
                return await this.expandThirdPartyRelationshipAttributeQuery(query);
            case "IQLQuery":
                return this.expandIQLQuery(query);
            default:
                throw new Error("Wrong attribute query");
        }
    }

    public expandIdentityAttributeQuery(query: IdentityAttributeQueryJSON): IdentityAttributeQueryDVO {
        const valueType = query.valueType;
        const name = `i18n://dvo.attribute.name.${valueType}`;
        const description = `i18n://dvo.attribute.description.${valueType}`;

        const hints = this.getHintsForValueType(valueType);

        return {
            type: "IdentityAttributeQueryDVO",
            id: "",
            name,
            description,
            valueType,
            validFrom: query.validFrom,
            validTo: query.validTo,
            renderHints: hints.renderHints,
            valueHints: hints.valueHints,
            isProcessed: false
        };
    }

    public async expandRelationshipAttributeQuery(query: RelationshipAttributeQueryJSON): Promise<RelationshipAttributeQueryDVO> {
        const valueType = query.attributeCreationHints.valueType;
        let name = "i18n://dvo.attributeQuery.name.RelationshipAttributeQuery";
        let description = "i18n://dvo.attributeQuery.description.RelationshipAttributeQuery";
        if (query.attributeCreationHints.title) {
            name = query.attributeCreationHints.title;
        }
        if (query.attributeCreationHints.description) {
            description = query.attributeCreationHints.description;
        }

        const hints = this.getHintsForValueType(valueType);
        if (query.attributeCreationHints.valueHints) {
            hints.valueHints = query.attributeCreationHints.valueHints;
        }

        return {
            type: "RelationshipAttributeQueryDVO",
            id: "",
            name,
            description,
            validFrom: query.validFrom,
            validTo: query.validTo,
            owner: await this.expandAddress(query.owner),
            key: query.key,
            attributeCreationHints: query.attributeCreationHints,
            renderHints: hints.renderHints,
            valueHints: hints.valueHints,
            isProcessed: false,
            valueType
        };
    }

    public async expandThirdPartyRelationshipAttributeQuery(query: ThirdPartyRelationshipAttributeQueryJSON): Promise<ThirdPartyRelationshipAttributeQueryDVO> {
        const name = "i18n://dvo.attributeQuery.name.ThirdPartyRelationshipAttributeQuery";
        const description = "i18n://dvo.attributeQuery.description.ThirdPartyRelationshipAttributeQuery";

        const thirdParty = await Promise.all(query.thirdParty.map((tp) => this.expandAddress(tp)));
        return {
            type: "ThirdPartyRelationshipAttributeQueryDVO",
            id: "",
            name,
            description,
            validFrom: query.validFrom,
            validTo: query.validTo,
            owner: await this.expandAddress(query.owner),
            thirdParty,
            key: query.key,
            isProcessed: false
        };
    }

    public expandIQLQuery(query: IQLQueryJSON): IQLQueryDVO {
        const name = "i18n://dvo.attributeQuery.name.IQLQuery";
        const description = "i18n://dvo.attributeQuery.description.IQLQuery";

        let renderHints;
        let valueHints;
        let valueType;
        let tags: string[] | undefined;
        if (query.attributeCreationHints?.valueType) {
            valueType = query.attributeCreationHints.valueType;
        }

        if (valueType) {
            const hints = this.getHintsForValueType(valueType);
            renderHints = hints.renderHints;
            valueHints = hints.valueHints;
        }

        if (query.attributeCreationHints?.tags) {
            tags = query.attributeCreationHints.tags;
        }

        return {
            type: "IQLQueryDVO",
            id: "",
            name,
            description,
            queryString: query.queryString,
            isProcessed: false,
            attributeCreationHints: query.attributeCreationHints,
            valueType,
            renderHints,
            valueHints,
            tags
        };
    }

    private getHintsForValueType(valueType: string): { renderHints: RenderHintsJSON; valueHints: ValueHintsJSON } {
        const valueTypeClass = SerializableBase.getModule(valueType, 1);
        if (!valueTypeClass) {
            throw new Error(`No class implementation found for ${valueType}`);
        }
        let renderHints: RenderHintsJSON = {
            "@type": "RenderHints",
            editType: RenderHintsEditType.InputLike,
            technicalType: RenderHintsTechnicalType.String
        };
        let valueHints: ValueHintsJSON = {
            "@type": "ValueHints",
            max: 200
        };
        if (valueTypeClass.renderHints && valueTypeClass.renderHints instanceof RenderHints) {
            renderHints = valueTypeClass.renderHints.toJSON();
        }
        if (valueTypeClass.valueHints && valueTypeClass.valueHints instanceof ValueHints) {
            valueHints = valueTypeClass.valueHints.toJSON();
        }

        return { renderHints, valueHints };
    }

    public async processAttributeQuery(
        attributeQuery: IdentityAttributeQueryJSON | RelationshipAttributeQueryJSON | ThirdPartyRelationshipAttributeQueryJSON | IQLQueryJSON
    ): Promise<ProcessedAttributeQueryDVO> {
        switch (attributeQuery["@type"]) {
            case "IdentityAttributeQuery":
                return await this.processIdentityAttributeQuery(attributeQuery);
            case "RelationshipAttributeQuery":
                return await this.processRelationshipAttributeQuery(attributeQuery);
            case "ThirdPartyRelationshipAttributeQuery":
                return await this.processThirdPartyRelationshipAttributeQuery(attributeQuery);
            case "IQLQuery":
                return await this.processIQLQuery(attributeQuery);
            default:
                throw new Error("Wrong attribute query");
        }
    }

    public async processIdentityAttributeQuery(query: IdentityAttributeQueryJSON): Promise<ProcessedIdentityAttributeQueryDVO> {
        const matchedAttributeDTOs = await this.consumption.attributes.executeIdentityAttributeQuery({
            query
        });
        const matchedAttributeDVOs = await this.expandLocalAttributeDTOs(matchedAttributeDTOs.value);

        return {
            ...this.expandIdentityAttributeQuery(query),
            type: "ProcessedIdentityAttributeQueryDVO",
            results: matchedAttributeDVOs as (RepositoryAttributeDVO | SharedToPeerAttributeDVO)[],
            isProcessed: true
        };
    }

    public async processRelationshipAttributeQuery(query: RelationshipAttributeQueryJSON): Promise<ProcessedRelationshipAttributeQueryDVO> {
        const matchedAttributeDTOResult = await this.consumption.attributes.executeRelationshipAttributeQuery({
            query
        });
        if (matchedAttributeDTOResult.isError) {
            if (matchedAttributeDTOResult.error.code !== "error.runtime.recordNotFound") throw matchedAttributeDTOResult.error;

            return {
                ...(await this.expandRelationshipAttributeQuery(query)),
                type: "ProcessedRelationshipAttributeQueryDVO",
                results: [],
                isProcessed: true
            };
        }
        const matchedAttributeDVOs = await this.expandLocalAttributeDTO(matchedAttributeDTOResult.value);

        return {
            ...(await this.expandRelationshipAttributeQuery(query)),
            type: "ProcessedRelationshipAttributeQueryDVO",
            results: [matchedAttributeDVOs as OwnRelationshipAttributeDVO | PeerRelationshipAttributeDVO],
            isProcessed: true
        };
    }

    public async processThirdPartyRelationshipAttributeQuery(query: ThirdPartyRelationshipAttributeQueryJSON): Promise<ProcessedThirdPartyRelationshipAttributeQueryDVO> {
        const matchedAttributeDTOResult = await this.consumption.attributes.executeThirdPartyRelationshipAttributeQuery({ query });
        const matchedAttributeDVOs = await this.expandLocalAttributeDTOs(matchedAttributeDTOResult.value);

        return {
            ...(await this.expandThirdPartyRelationshipAttributeQuery(query)),
            type: "ProcessedThirdPartyRelationshipAttributeQueryDVO",
            results: matchedAttributeDVOs as (OwnRelationshipAttributeDVO | PeerRelationshipAttributeDVO)[],
            isProcessed: true
        };
    }

    public async processIQLQuery(query: IQLQueryJSON): Promise<ProcessedIQLQueryDVO> {
        const matchedAttributeDTOResult = await this.consumption.attributes.executeIQLQuery({ query });
        const matchedAttributeDVOs = await this.expandLocalAttributeDTOs(matchedAttributeDTOResult.value);

        let valueType: string | undefined;
        let renderHints: RenderHintsJSON | undefined;
        let valueHints: ValueHintsJSON | undefined;

        if (matchedAttributeDVOs.length > 0 && matchedAttributeDVOs.every((dvo) => dvo.valueType === matchedAttributeDVOs[0].valueType)) {
            valueType = matchedAttributeDVOs[0].valueType;
            renderHints = matchedAttributeDVOs[0].renderHints;
            valueHints = matchedAttributeDVOs[0].valueHints;
        } else {
            if (query.attributeCreationHints?.valueType) {
                valueType = query.attributeCreationHints.valueType;
            }

            if (valueType) {
                const hints = this.getHintsForValueType(valueType);
                renderHints = hints.renderHints;
                valueHints = hints.valueHints;
            }
        }

        return {
            ...this.expandIQLQuery(query),
            type: "ProcessedIQLQueryDVO",
            results: matchedAttributeDVOs as RepositoryAttributeDVO[],
            isProcessed: true,
            valueType,
            renderHints,
            valueHints
        };
    }

    private async expandIdentityAttribute(attribute: IdentityAttributeJSON, attributeInstance: IdentityAttribute): Promise<DraftIdentityAttributeDVO> {
        const valueType = attribute.value["@type"];
        const name = `i18n://dvo.attribute.name.${valueType}`;
        const description = `i18n://dvo.attribute.description.${valueType}`;
        const renderHints = attributeInstance.value.renderHints.toJSON();
        const valueHints = attributeInstance.value.valueHints.toJSON();

        const owner = await this.expandAddress(attribute.owner);
        return {
            type: "DraftIdentityAttributeDVO",
            content: attribute,
            name,
            description,
            id: "",
            owner: owner,
            renderHints,
            valueHints,
            value: attribute.value,
            isDraft: true,
            isOwn: owner.isSelf,
            valueType,
            tags: attributeInstance.tags ? attributeInstance.tags : []
        };
    }

    private async expandRelationshipAttribute(attribute: RelationshipAttributeJSON, attributeInstance: RelationshipAttribute): Promise<DraftRelationshipAttributeDVO> {
        const valueType = attribute.value["@type"];
        let name = `i18n://dvo.attribute.name.${valueType}`;
        let description = `i18n://dvo.attribute.description.${valueType}`;
        const renderHints = attributeInstance.value.renderHints.toJSON();
        const valueHints = attributeInstance.value.valueHints.toJSON();

        const value = attributeInstance.value;
        if ("title" in value) {
            name = value.title;
        }
        if ("description" in value && !!value.description) {
            description = value.description;
        }

        const owner = await this.expandAddress(attribute.owner);
        return {
            type: "DraftRelationshipAttributeDVO",
            content: attribute,
            name,
            description,
            key: attribute.key,
            confidentiality: attribute.confidentiality,
            isTechnical: !!attribute.isTechnical,
            id: "",
            owner: owner,
            renderHints,
            valueHints,
            value: attribute.value,
            isDraft: true,
            isOwn: owner.isSelf,
            valueType
        };
    }

    public async expandAttribute(attribute: IdentityAttributeJSON | RelationshipAttributeJSON): Promise<DraftIdentityAttributeDVO | DraftRelationshipAttributeDVO> {
        const attributeInstance = Serializable.fromUnknown(attribute);
        if (attributeInstance instanceof IdentityAttribute) {
            return await this.expandIdentityAttribute(attribute as IdentityAttributeJSON, attributeInstance);
        } else if (attributeInstance instanceof RelationshipAttribute) {
            return await this.expandRelationshipAttribute(attribute as RelationshipAttributeJSON, attributeInstance);
        }
        throw new Error("Wrong attribute instance");
    }

    public async expandAttributes(attributes: (IdentityAttributeJSON | RelationshipAttributeJSON)[]): Promise<(DraftIdentityAttributeDVO | DraftRelationshipAttributeDVO)[]> {
        const attributesPromise = attributes.map((attribute) => this.expandAttribute(attribute));
        return await Promise.all(attributesPromise);
    }

    public expandSelf(): IdentityDVO {
        const name = "i18n://dvo.identity.self.name";
        const initials = "i18n://dvo.identity.self.initials";

        return {
            id: this.identityController.address.toString(),
            type: "IdentityDVO",
            name: name,
            initials: initials,
            realm: Realm.Prod,
            description: "i18n://dvo.identity.self.description",
            isSelf: true,
            hasRelationship: false
        };
    }

    public expandUnknown(address: string): IdentityDVO {
        const name = address.substring(3, 9);
        const initials = (name.match(/\b\w/g) ?? []).join("");

        return {
            id: address,
            type: "IdentityDVO",
            name: name,
            initials: initials,
            realm: Realm.Prod,
            description: "i18n://dvo.identity.unknown.description",
            isSelf: false,
            hasRelationship: false
        };
    }

    public async expandAddress(address: string): Promise<IdentityDVO> {
        if (this.identityController.isMe(CoreAddress.from(address))) {
            return this.expandSelf();
        }

        const result = await this.transport.relationships.getRelationshipByAddress({ address });
        if (result.isError) {
            return this.expandUnknown(address);
        }

        return await this.expandRelationshipDTO(result.value);
    }

    public async expandAddresses(addresses: string[]): Promise<IdentityDVO[]> {
        const relationshipPromises = addresses.map((address) => this.expandAddress(address));
        return await Promise.all(relationshipPromises);
    }

    public async expandRecipientDTO(recipient: RecipientDTO): Promise<RecipientDVO> {
        const identity = await this.expandAddress(recipient.address);
        return {
            ...identity,
            type: "RecipientDVO",
            receivedAt: recipient.receivedAt,
            receivedByDevice: recipient.receivedByDevice
        };
    }

    public async expandRecipientDTOs(recipients: RecipientDTO[]): Promise<RecipientDVO[]> {
        const relationshipPromises = recipients.map((recipient) => this.expandRecipientDTO(recipient));
        return await Promise.all(relationshipPromises);
    }

    public expandRelationshipChangeDTO(relationship: RelationshipDTO, change: RelationshipChangeDTO): Promise<RelationshipChangeDVO> {
        const date = change.response ? change.response.createdAt : change.request.createdAt;
        let isOwn = false;
        if (this.identityController.isMe(CoreAddress.from(change.request.createdBy))) {
            isOwn = true;
        }

        let response: RelationshipChangeResponseDVO | undefined;
        if (change.response) {
            response = {
                ...change.response,
                id: `${change.id}_response`,
                name: "i18n://dvo.relationshipChange.response.name",
                type: "RelationshipChangeResponseDVO"
            };
        }

        return Promise.resolve({
            type: "RelationshipChangeDVO",
            id: change.id,
            name: "",
            date: date,
            status: change.status,
            statusText: `i18n://dvo.relationshipChange.${change.status}`,
            changeType: change.type,
            changeTypeText: `i18n://dvo.relationshipChange.${change.type}`,
            isOwn: isOwn,
            request: {
                ...change.request,
                id: `${change.id}_request`,
                name: "i18n://dvo.relationshipChange.request.name",
                type: "RelationshipChangeRequestDVO"
            },
            response: response
        });
    }

    public async expandRelationshipChangeDTOs(relationship: RelationshipDTO): Promise<RelationshipChangeDVO[]> {
        const changePromises = relationship.changes.map((change) => this.expandRelationshipChangeDTO(relationship, change));
        return await Promise.all(changePromises);
    }

    private async createRelationshipDVO(relationship: RelationshipDTO): Promise<RelationshipDVO> {
        let relationshipSetting: RelationshipSettingDVO;
        const settingResult = await this.consumption.settings.getSettings({ query: { reference: relationship.id } });
        if (settingResult.value.length > 0) {
            relationshipSetting = settingResult.value[0].value;
        } else {
            relationshipSetting = {
                isPinned: false
            };
        }

        const stringByType: Record<string, undefined | string> = {};
        const relationshipAttributesResult = await this.consumption.attributes.getPeerSharedAttributes({ onlyValid: true, peer: relationship.peer });
        const expandedAttributes = await this.expandLocalAttributeDTOs(relationshipAttributesResult.value);
        const attributesByType: Record<string, undefined | LocalAttributeDVO[]> = {};
        for (const attribute of expandedAttributes) {
            const valueType = attribute.content.value["@type"];
            const item = attributesByType[valueType];
            if (item) {
                item.push(attribute);
            } else {
                attributesByType[valueType] = [attribute];
            }

            const nameRelevantAttributeTypes = ["DisplayName", "GivenName", "MiddleName", "Surname", "Sex"];
            if (nameRelevantAttributeTypes.includes(valueType)) {
                const attributeValue = attribute.content.value as DisplayNameJSON | GivenNameJSON | MiddleNameJSON | SurnameJSON | SexJSON;

                if (stringByType[valueType] && valueType === "GivenName") {
                    stringByType[valueType] += ` ${attributeValue.value}`;
                } else {
                    stringByType[valueType] = attributeValue.value;
                }
            }
        }

        let direction = RelationshipDirection.Incoming;
        if (this.identityController.isMe(CoreAddress.from(relationship.changes[0].request.createdBy))) {
            direction = RelationshipDirection.Outgoing;
        }

        let statusText = "";
        if (relationship.status === RelationshipStatus.Pending && direction === RelationshipDirection.Outgoing) {
            statusText = DataViewTranslateable.transport.relationshipOutgoing;
        } else if (relationship.status === RelationshipStatus.Pending) {
            statusText = DataViewTranslateable.transport.relationshipIncoming;
        } else if (relationship.status === RelationshipStatus.Rejected) {
            statusText = DataViewTranslateable.transport.relationshipRejected;
        } else if (relationship.status === RelationshipStatus.Revoked) {
            statusText = DataViewTranslateable.transport.relationshipRevoked;
        } else if (relationship.status === RelationshipStatus.Active) {
            statusText = DataViewTranslateable.transport.relationshipActive;
        }

        const changes = await this.expandRelationshipChangeDTOs(relationship);

        let name;
        if (stringByType["DisplayName"]) {
            name = stringByType["DisplayName"];
        } else if (stringByType["MiddleName"] && stringByType["GivenName"] && stringByType["Surname"]) {
            name = `${stringByType["GivenName"]} ${stringByType["MiddleName"]} ${stringByType["Surname"]}`;
        } else if (stringByType["GivenName"] && stringByType["Surname"]) {
            name = `${stringByType["GivenName"]} ${stringByType["Surname"]}`;
        } else if (stringByType["Sex"] && stringByType["Surname"]) {
            name = `i18n://dvo.identity.Salutation.${stringByType["Sex"]} ${stringByType["Surname"]}`;
        } else if (stringByType["Surname"]) {
            name = `${stringByType["Surname"]}`;
        } else {
            name = relationship.peer.substring(3, 9);
        }

        return {
            id: relationship.id,
            name: relationshipSetting.userTitle ?? name,
            description: relationshipSetting.userDescription ?? statusText,
            date: relationship.changes[0].request.createdAt,
            image: "",
            type: "RelationshipDVO",
            status: relationship.status,
            statusText: statusText,
            direction: direction,
            isPinned: relationshipSetting.isPinned,
            attributeMap: attributesByType,
            items: expandedAttributes,
            nameMap: stringByType,
            changes: changes,
            changeCount: changes.length,
            templateId: relationship.template.id
        };
    }

    public async expandRelationshipDTO(relationship: RelationshipDTO): Promise<IdentityDVO> {
        const relationshipDVO = await this.createRelationshipDVO(relationship);
        const initials = (relationshipDVO.name.match(/\b\w/g) ?? []).join("");

        return {
            type: "IdentityDVO",
            id: relationship.peer,
            name: relationshipDVO.name,
            date: relationshipDVO.date,
            description: relationshipDVO.description,
            publicKey: relationship.peerIdentity.publicKey,
            realm: relationship.peerIdentity.realm,
            initials,
            isSelf: false,
            hasRelationship: true,
            relationship: relationshipDVO,
            items: relationshipDVO.items
        };
    }

    public async expandIdentityForAddress(address: string): Promise<IdentityDVO> {
        if (address === this.identityController.address.toString()) {
            return this.expandSelf();
        }

        const relationshipResult = await this.transport.relationships.getRelationshipByAddress({
            address: address
        });
        if (relationshipResult.isSuccess) {
            return await this.expandRelationshipDTO(relationshipResult.value);
        }

        if (relationshipResult.error.code !== RuntimeErrors.general.recordNotFound(Relationship).code) throw relationshipResult.error;

        const name = address.substring(3, 9);
        const initials = (name.match(/\b\w/g) ?? []).join("");

        return {
            id: address,
            type: "IdentityDVO",
            name: name,
            initials: initials,
            publicKey: "i18n://dvo.identity.publicKey.unknown",
            realm: this.identityController.realm.toString(),
            description: "i18n://dvo.identity.unknown",
            isSelf: false,
            hasRelationship: false
        };
    }

    public async expandIdentityDTO(identity: IdentityDTO): Promise<IdentityDVO> {
        return await this.expandIdentityForAddress(identity.address);
    }

    public async expandRelationshipDTOs(relationships: RelationshipDTO[]): Promise<IdentityDVO[]> {
        const relationshipPromises = relationships.map((relationship) => this.expandRelationshipDTO(relationship));
        return await Promise.all(relationshipPromises);
    }

    public async expandFileId(id: string): Promise<FileDVO> {
        const result = await this.transport.files.getFile({ id });
        if (result.isError) {
            throw result.error;
        }

        return await this.expandFileDTO(result.value);
    }

    public async expandFileIds(ids: string[]): Promise<FileDVO[]> {
        const filePromises = ids.map((id) => this.expandFileId(id));
        return await Promise.all(filePromises);
    }

    public async expandFileDTO(file: FileDTO): Promise<FileDVO> {
        return {
            ...file,
            type: "FileDVO",
            id: file.id,
            name: file.title ? file.title : file.filename,
            date: file.createdAt,
            image: "",
            filename: file.filename,
            filesize: file.filesize,
            createdBy: await this.expandAddress(file.createdBy),
            truncatedReference: file.truncatedReference
        };
    }

    public async expandFileDTOs(files: FileDTO[]): Promise<FileDVO[]> {
        const filePromises = files.map((file) => this.expandFileDTO(file));
        return await Promise.all(filePromises);
    }
}
