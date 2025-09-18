/* eslint-disable jest/no-standalone-expect */
import { IDatabaseCollection, IDatabaseConnection } from "@js-soft/docdb-access-abstractions";
import { DataEvent, EventEmitter2EventBus } from "@js-soft/ts-utils";
import {
    AcceptResponseItem,
    CreateAttributeRequestItem,
    DeleteAttributeRequestItem,
    IRequest,
    IResponse,
    IdentityAttribute,
    ProposeAttributeRequestItem,
    ReadAttributeRequestItem,
    RelationshipTemplateContent,
    Request,
    RequestItemGroup,
    Response,
    ResponseItemResult,
    ResponseResult
} from "@nmshd/content";
import { CoreAddress, CoreDate, CoreId, CoreIdHelper, ICoreId } from "@nmshd/core-types";
import { IConfigOverwrite, IMessage, IRelationshipTemplate, Relationship, SynchronizedCollection, Transport } from "@nmshd/transport";
import {
    ConsumptionController,
    ConsumptionIds,
    CreateAttributeRequestItemProcessor,
    DecideRequestParametersJSON,
    DeleteAttributeRequestItemProcessor,
    EmittedAttributeDeletionStatus,
    ICheckPrerequisitesOfIncomingRequestParameters,
    ICompleteIncomingRequestParameters,
    ICompleteOutgoingRequestParameters,
    ICreateAndCompleteOutgoingRequestFromRelationshipTemplateResponseParameters,
    ICreateOutgoingRequestParameters,
    ILocalRequestSource,
    IReceivedIncomingRequestParameters,
    IRequireManualDecisionOfIncomingRequestParameters,
    ISentOutgoingRequestParameters,
    IncomingRequestsController,
    LocalRequest,
    LocalRequestSource,
    LocalRequestStatus,
    LocalResponse,
    OutgoingRequestsController,
    ProposeAttributeRequestItemProcessor,
    ReadAttributeRequestItemProcessor,
    ReceivedIncomingRequestParameters,
    RequestItemConstructor,
    RequestItemProcessorConstructor,
    RequestItemProcessorRegistry,
    ValidationResult
} from "../../../src";

import { OwnIdentityAttribute } from "src/modules/attributes/local/attributeTypes/OwnIdentityAttribute";
import { TestUtil } from "../../core/TestUtil";
import { MockEventBus } from "../MockEventBus";
import { TestObjectFactory } from "./testHelpers/TestObjectFactory";
import { TestRequestItem } from "./testHelpers/TestRequestItem";
import { TestRequestItemProcessor } from "./testHelpers/TestRequestItemProcessor";

export class RequestsTestsContext {
    public requestsCollection: IDatabaseCollection;
    public incomingRequestsController: IncomingRequestsController;
    public outgoingRequestsController: OutgoingRequestsController;
    public currentIdentity: CoreAddress;
    public mockEventBus = new MockEventBus();
    public relationshipToReturnFromGetRelationshipToIdentity: Relationship | undefined;
    public relationshipToReturnFromGetExistingRelationshipToIdentity: Relationship | undefined;

    public consumptionController: ConsumptionController;

    private constructor() {
        // hide constructor
    }

    public static async create(dbConnection: IDatabaseConnection, config: IConfigOverwrite): Promise<RequestsTestsContext> {
        const context = new RequestsTestsContext();

        const transport = await new Transport(
            config,
            new EventEmitter2EventBus(() => {
                // noop
            })
        ).init();

        const database = await dbConnection.getDatabase(`x${Math.random().toString(36).substring(7)}`);
        const collection = new SynchronizedCollection(await database.getCollection("Requests"), 0);

        const account = (await TestUtil.provideAccounts(transport, dbConnection, 1))[0];
        context.consumptionController = account.consumptionController;

        const processorRegistry = new RequestItemProcessorRegistry(
            context.consumptionController,
            new Map<RequestItemConstructor, RequestItemProcessorConstructor>([
                [TestRequestItem, TestRequestItemProcessor],
                [CreateAttributeRequestItem, CreateAttributeRequestItemProcessor],
                [ReadAttributeRequestItem, ReadAttributeRequestItemProcessor],
                [ProposeAttributeRequestItem, ProposeAttributeRequestItemProcessor],
                [DeleteAttributeRequestItem, DeleteAttributeRequestItemProcessor]
            ])
        );

        context.currentIdentity = account.accountController.identity.address;

        context.outgoingRequestsController = new OutgoingRequestsController(
            collection,
            processorRegistry,
            context.consumptionController,
            context.mockEventBus,
            { address: account.accountController.identity.address },
            {
                getRelationshipToIdentity: () => Promise.resolve(context.relationshipToReturnFromGetRelationshipToIdentity)
            }
        );

        context.incomingRequestsController = new IncomingRequestsController(
            collection,
            processorRegistry,
            context.consumptionController,
            context.mockEventBus,
            {
                address: account.accountController.identity.address
            },
            {
                getRelationshipToIdentity: () => Promise.resolve(context.relationshipToReturnFromGetRelationshipToIdentity),
                getExistingRelationshipToIdentity: () => Promise.resolve(context.relationshipToReturnFromGetExistingRelationshipToIdentity)
            }
        );

        context.requestsCollection = context.incomingRequestsController["localRequests"];

        const originalCanCreate = context.outgoingRequestsController.canCreate;
        context.outgoingRequestsController.canCreate = (params: ICreateOutgoingRequestParameters) => {
            context.canCreateWasCalled = true;
            return originalCanCreate.call(context.outgoingRequestsController, params);
        };

        return context;
    }

    public reset(): void {
        this.canCreateWasCalled = false;
        this.givenLocalRequest = undefined;
        this.localRequestAfterAction = undefined;
        this.validationResult = undefined;
        this.actionToTry = undefined;
        this.relationshipToReturnFromGetRelationshipToIdentity = undefined;
        this.relationshipToReturnFromGetExistingRelationshipToIdentity = undefined;

        TestRequestItemProcessor.numberOfApplyIncomingResponseItemCalls = 0;

        this.mockEventBus.clearPublishedEvents();
        this.mockEventBus.close();
    }

    public givenLocalRequest?: LocalRequest;
    public localRequestAfterAction?: LocalRequest;
    public localRequestsAfterAction?: LocalRequest[];
    public validationResult?: ValidationResult;
    public canCreateWasCalled = false;
    public actionToTry?: () => Promise<void>;
}

export class RequestsGiven {
    public constructor(private readonly context: RequestsTestsContext) {}

    public async anIncomingRequest(): Promise<LocalRequest> {
        return await this.anIncomingRequestWith({});
    }

    public anActiveRelationshipToIdentity(): Promise<void> {
        this.context.relationshipToReturnFromGetRelationshipToIdentity = TestObjectFactory.createActiveRelationship();

        return Promise.resolve();
    }

    public aPendingRelationshipToIdentity(): Promise<void> {
        this.context.relationshipToReturnFromGetRelationshipToIdentity = TestObjectFactory.createPendingRelationship();

        return Promise.resolve();
    }

    public aTerminatedRelationshipToIdentity(): Promise<void> {
        this.context.relationshipToReturnFromGetRelationshipToIdentity = TestObjectFactory.createTerminatedRelationship();

        return Promise.resolve();
    }

    public aRelationshipToPeerInDeletion(): Promise<void> {
        this.context.relationshipToReturnFromGetRelationshipToIdentity = TestObjectFactory.createRelationshipToPeerInDeletion();

        return Promise.resolve();
    }

    public aRelationshipToDeletedPeer(): Promise<void> {
        this.context.relationshipToReturnFromGetRelationshipToIdentity = TestObjectFactory.createRelationshipToDeletedPeer();

        return Promise.resolve();
    }

    public aDeletionProposedRelationshipToIdentity(): Promise<void> {
        this.context.relationshipToReturnFromGetRelationshipToIdentity = TestObjectFactory.createDeletionProposedRelationship();

        return Promise.resolve();
    }

    public async anIncomingRequestWithAnItemAndAGroupInStatus(status: LocalRequestStatus): Promise<void> {
        const content = Request.from({
            items: [
                TestRequestItem.from({
                    mustBeAccepted: false,
                    metadata: {
                        outerItemMetaKey: "outerItemMetaValue"
                    }
                }),
                RequestItemGroup.from({
                    metadata: {
                        groupMetaKey: "groupMetaValue"
                    },
                    items: [
                        TestRequestItem.from({
                            metadata: {
                                innerItemMetaKey: "innerItemMetaValue"
                            },
                            mustBeAccepted: false
                        })
                    ]
                })
            ]
        });

        await this.anIncomingRequestWith({ content, status });
    }

    public async anIncomingRequestWith(params: {
        id?: CoreId;
        content?: IRequest;
        status?: LocalRequestStatus;
        requestSource?: IMessage | IRelationshipTemplate;
    }): Promise<LocalRequest> {
        params.id ??= await ConsumptionIds.request.generate();
        params.content ??= TestObjectFactory.createRequestWithOneItem({ id: params.id });
        params.status ??= LocalRequestStatus.Open;
        params.requestSource ??= TestObjectFactory.createIncomingMessage(this.context.currentIdentity);

        const localRequest = await this.context.incomingRequestsController.received({
            receivedRequest: params.content,
            requestSourceObject: params.requestSource
        });

        await this.moveIncomingRequestToStatus(localRequest, params.status);

        this.context.givenLocalRequest = localRequest;

        return localRequest;
    }

    public async anIncomingRequestInStatus(status: LocalRequestStatus): Promise<void> {
        await this.anIncomingRequestWith({ status });
    }

    public async aRejectedIncomingRequestFromARelationshipTemplate(): Promise<void> {
        await this.anIncomingRequestWith({
            status: LocalRequestStatus.DecisionRequired,
            requestSource: TestObjectFactory.createIncomingRelationshipTemplate()
        });

        this.context.localRequestAfterAction = await this.context.incomingRequestsController.reject({
            requestId: this.context.givenLocalRequest!.id.toString(),
            items: [
                {
                    accept: false
                }
            ]
        });
    }

    private async moveIncomingRequestToStatus(localRequest: LocalRequest, status: LocalRequestStatus) {
        if (localRequest.status === status) return;

        if (isStatusAAfterStatusB(status, localRequest.status)) {
            localRequest = await this.context.incomingRequestsController.checkPrerequisites({
                requestId: localRequest.id
            });
        }

        if (isStatusAAfterStatusB(status, localRequest.status)) {
            localRequest = await this.context.incomingRequestsController.accept({
                requestId: localRequest.id.toString(),
                items: [
                    {
                        accept: true
                    }
                ]
            });
        }

        if (isStatusAAfterStatusB(status, localRequest.status)) {
            localRequest = await this.context.incomingRequestsController.complete({
                requestId: localRequest.id,
                responseSourceObject: TestObjectFactory.createOutgoingIMessage(this.context.currentIdentity)
            });
        }
    }

    public async anOutgoingRequest(): Promise<LocalRequest> {
        return await this.anOutgoingRequestWith({});
    }

    public async anOutgoingRequestInStatus(status: LocalRequestStatus): Promise<void> {
        await this.anOutgoingRequestWith({ status });
    }

    public async anOutgoingRequestWith(params: { status?: LocalRequestStatus; content?: IRequest }): Promise<LocalRequest> {
        params.status ??= LocalRequestStatus.Open;
        params.content ??= {
            items: [
                TestRequestItem.from({
                    mustBeAccepted: false
                })
            ]
        };

        this.context.givenLocalRequest = await this.context.outgoingRequestsController.create({
            content: params.content,
            peer: CoreAddress.from("did:e:a-domain:dids:anidentity")
        });

        await this.moveOutgoingRequestToStatus(this.context.givenLocalRequest, params.status);

        return this.context.givenLocalRequest;
    }

    private async moveOutgoingRequestToStatus(localRequest: LocalRequest, status: LocalRequestStatus) {
        const updatedRequest = await this.context.outgoingRequestsController.getOutgoingRequest(localRequest.id);

        if (updatedRequest!.status === status) return;

        if (isStatusAAfterStatusB(status, LocalRequestStatus.Draft)) {
            await this.context.outgoingRequestsController.sent({
                requestId: updatedRequest!.id,
                requestSourceObject: TestObjectFactory.createOutgoingIMessage(this.context.currentIdentity)
            });
        }
    }
}

export class RequestsWhen {
    public async iCallCanAccept(): Promise<ValidationResult> {
        return await this.iCallCanAcceptWith({});
    }

    public async iTryToCallCanAccept(): Promise<void> {
        await this.iTryToCallCanAcceptWith({});
    }

    public iTryToCallCanAcceptWithoutARequestId(): Promise<void> {
        this.context.actionToTry = async () => {
            await this.context.incomingRequestsController.canAccept({} as DecideRequestParametersJSON);
        };
        return Promise.resolve();
    }

    public iTryToCallCanAcceptWith(params: Partial<DecideRequestParametersJSON>): Promise<void> {
        this.context.actionToTry = async () => {
            await this.iCallCanAcceptWith(params);
        };
        return Promise.resolve();
    }

    public async iCallCanAcceptWith(params: Partial<DecideRequestParametersJSON>): Promise<ValidationResult> {
        params.items ??= [
            {
                accept: true
            }
        ];
        params.requestId ??= this.context.givenLocalRequest!.id.toString();

        this.context.validationResult = await this.context.incomingRequestsController.canAccept(params as DecideRequestParametersJSON);

        return this.context.validationResult;
    }

    public async iCallCanReject(): Promise<ValidationResult> {
        return await this.iCallCanRejectWith({});
    }

    public async iTryToCallCanReject(): Promise<void> {
        await this.iTryToCallCanRejectWith({});
    }

    public iTryToCallCanRejectWithoutARequestId(): Promise<void> {
        this.context.actionToTry = async () => {
            await this.context.incomingRequestsController.canReject({} as DecideRequestParametersJSON);
        };
        return Promise.resolve();
    }

    public iTryToCallCanRejectWith(params: Partial<DecideRequestParametersJSON>): Promise<void> {
        this.context.actionToTry = async () => {
            await this.iCallCanRejectWith(params);
        };
        return Promise.resolve();
    }

    public async iCallCanRejectWith(params: Partial<DecideRequestParametersJSON>): Promise<ValidationResult> {
        params.items ??= [
            {
                accept: false
            }
        ];
        params.requestId ??= this.context.givenLocalRequest!.id.toString();

        this.context.validationResult = await this.context.incomingRequestsController.canReject(params as DecideRequestParametersJSON);

        return this.context.validationResult;
    }

    public async iRequireManualDecision(): Promise<void> {
        await this.iRequireManualDecisionWith({});
    }

    public async iTryToRequireManualDecision(): Promise<void> {
        await this.iTryToRequireManualDecisionWith({});
    }

    public iTryToRequireManualDecisionWithoutRequestId(): Promise<void> {
        this.context.actionToTry = async () => {
            await this.context.incomingRequestsController.requireManualDecision({} as IRequireManualDecisionOfIncomingRequestParameters);
        };

        return Promise.resolve();
    }

    public iTryToRequireManualDecisionWith(params: Partial<IRequireManualDecisionOfIncomingRequestParameters>): Promise<void> {
        this.context.actionToTry = async () => {
            await this.iRequireManualDecisionWith(params);
        };

        return Promise.resolve();
    }

    public async iRequireManualDecisionWith(params: Partial<IRequireManualDecisionOfIncomingRequestParameters>): Promise<void> {
        params.requestId ??= this.context.givenLocalRequest!.id;
        this.context.localRequestAfterAction = await this.context.incomingRequestsController.requireManualDecision(params as IRequireManualDecisionOfIncomingRequestParameters);
    }

    public iTryToAccept(): Promise<void> {
        this.context.actionToTry = async () => {
            await this.context.incomingRequestsController.accept({
                requestId: this.context.givenLocalRequest!.id.toString(),
                items: [
                    {
                        accept: true
                    }
                ]
            });
        };
        return Promise.resolve();
    }

    public iTryToAcceptWith(params: Partial<DecideRequestParametersJSON>): Promise<void> {
        params.requestId ??= this.context.givenLocalRequest!.id.toString();
        params.items ??= [
            {
                accept: true
            }
        ];

        this.context.actionToTry = async () => {
            await this.context.incomingRequestsController.accept(params as DecideRequestParametersJSON);
        };

        return Promise.resolve();
    }

    public iTryToCallReceivedWithoutSource(): Promise<void> {
        this.context.actionToTry = async () => {
            await this.context.incomingRequestsController.received({
                receivedRequest: TestObjectFactory.createRequestWithOneItem()
            } as ReceivedIncomingRequestParameters);
        };

        return Promise.resolve();
    }

    public iTryToReject(): Promise<void> {
        this.context.actionToTry = async () => {
            await this.context.incomingRequestsController.reject({
                requestId: this.context.givenLocalRequest!.id.toString(),
                items: [
                    {
                        accept: false
                    }
                ]
            });
        };
        return Promise.resolve();
    }

    public iTryToRejectWith(params: Partial<DecideRequestParametersJSON>): Promise<void> {
        params.requestId ??= this.context.givenLocalRequest!.id.toString();
        params.items ??= [
            {
                accept: false
            }
        ];

        this.context.actionToTry = async () => {
            await this.context.incomingRequestsController.reject(params as DecideRequestParametersJSON);
        };

        return Promise.resolve();
    }

    public async iCheckPrerequisites(): Promise<void> {
        await this.iCheckPrerequisitesWith({});
    }

    public async iTryToCheckPrerequisites(): Promise<void> {
        await this.iTryToCheckPrerequisitesWith({});
    }

    public iTryToCheckPrerequisitesWith(params: Partial<ICheckPrerequisitesOfIncomingRequestParameters>): Promise<void> {
        this.context.actionToTry = async () => {
            await this.iCheckPrerequisitesWith(params as ICheckPrerequisitesOfIncomingRequestParameters);
        };
        return Promise.resolve();
    }

    public iTryToCheckPrerequisitesWithoutARequestId(): Promise<void> {
        this.context.actionToTry = async () => {
            await this.context.incomingRequestsController.checkPrerequisites({} as any);
        };
        return Promise.resolve();
    }

    public async iCheckPrerequisitesWith(params: Partial<ICheckPrerequisitesOfIncomingRequestParameters>): Promise<void> {
        params.requestId ??= this.context.givenLocalRequest?.id;

        this.context.localRequestAfterAction = await this.context.incomingRequestsController.checkPrerequisites(params as ICheckPrerequisitesOfIncomingRequestParameters);
    }

    public iTryToCallSentWithoutSourceObject(): Promise<void> {
        this.context.actionToTry = async () => {
            await this.context.outgoingRequestsController.sent({
                requestId: this.context.givenLocalRequest!.id,
                requestSourceObject: undefined
            } as any);
        };
        return Promise.resolve();
    }

    public async iCallSent(): Promise<void> {
        await this.iCallSentWith({});
    }

    public async iCallSentWith(params: Partial<ISentOutgoingRequestParameters>): Promise<void> {
        params.requestId ??= this.context.givenLocalRequest!.id;
        params.requestSourceObject ??= TestObjectFactory.createOutgoingMessage(this.context.currentIdentity);

        this.context.localRequestAfterAction = await this.context.outgoingRequestsController.sent({
            requestId: params.requestId,
            requestSourceObject: params.requestSourceObject
        });
    }

    public iTryToCompleteTheOutgoingRequest(): Promise<void> {
        return this.iTryToCompleteTheOutgoingRequestWith({});
    }

    public iTryToCompleteTheOutgoingRequestWith(params: { requestId?: ICoreId; responseSourceObject?: IMessage; receivedResponse?: Omit<IResponse, "id"> }): Promise<void> {
        params.requestId ??= this.context.givenLocalRequest!.id;
        params.responseSourceObject ??= TestObjectFactory.createIncomingIMessage(this.context.currentIdentity);
        params.receivedResponse ??= TestObjectFactory.createResponse();

        params.receivedResponse.requestId = params.requestId;

        this.context.actionToTry = async () => {
            await this.context.outgoingRequestsController.complete(params as ICompleteOutgoingRequestParameters);
        };

        return Promise.resolve();
    }

    public iTryToCallCompleteWithoutSourceObject(): Promise<void> {
        this.context.actionToTry = async () => {
            await this.context.outgoingRequestsController.complete({
                requestId: this.context.givenLocalRequest!.id,
                receivedResponse: TestObjectFactory.createResponse()
            } as any);
        };

        return Promise.resolve();
    }

    public iTryToCallSent(): Promise<void> {
        return this.iTryToCallSentWith({});
    }

    public iTryToCallSentWith(params: Partial<ISentOutgoingRequestParameters>): Promise<void> {
        params.requestId ??= this.context.givenLocalRequest!.id;
        params.requestSourceObject ??= TestObjectFactory.createOutgoingMessage(this.context.currentIdentity);

        this.context.actionToTry = async () => {
            await this.context.outgoingRequestsController.sent(params as ISentOutgoingRequestParameters);
        };

        return Promise.resolve();
    }

    public async iCallCanCreateForAnOutgoingRequest(params?: Partial<ICreateOutgoingRequestParameters>): Promise<ValidationResult> {
        const realParams: ICreateOutgoingRequestParameters = {
            content: params?.content ?? {
                items: [
                    TestRequestItem.from({
                        mustBeAccepted: false
                    })
                ]
            },
            peer: params?.peer ?? CoreAddress.from("did:e:a-domain:dids:anidentity")
        };

        this.context.validationResult = await this.context.outgoingRequestsController.canCreate(realParams);

        return this.context.validationResult;
    }

    public constructor(private readonly context: RequestsTestsContext) {}

    public async iCreateAnOutgoingRequest(): Promise<void> {
        const params: ICreateOutgoingRequestParameters = {
            content: {
                items: [
                    TestRequestItem.from({
                        mustBeAccepted: false
                    })
                ]
            },
            peer: CoreAddress.from("did:e:a-domain:dids:anidentity")
        };

        this.context.localRequestAfterAction = await this.context.outgoingRequestsController.create(params);
    }

    public async iCreateAnOutgoingRequestFromRelationshipCreation(): Promise<void> {
        await this.iCreateAnOutgoingRequestFromRelationshipCreationWith({});
    }

    public async iCreateAnOutgoingRequestFromRelationshipCreationWhenRelationshipExistsWith(
        params: Partial<ICreateAndCompleteOutgoingRequestFromRelationshipTemplateResponseParameters>
    ): Promise<void> {
        this.context.relationshipToReturnFromGetRelationshipToIdentity = TestObjectFactory.createActiveRelationship();
        await this.iCreateAnOutgoingRequestFromRelationshipCreationWith(params);
    }

    public async iCreateAnOutgoingRequestFromRelationshipCreationWith(params: Partial<ICreateAndCompleteOutgoingRequestFromRelationshipTemplateResponseParameters>): Promise<void> {
        params.template ??= TestObjectFactory.createOutgoingIRelationshipTemplate(
            this.context.currentIdentity,
            RelationshipTemplateContent.from({
                onNewRelationship: TestObjectFactory.createRequestWithOneItem(),
                onExistingRelationship: TestObjectFactory.createRequestWithTwoItems()
            })
        );
        const relationship = TestObjectFactory.createPendingRelationship();
        params.responseSource ??= relationship;
        params.response ??= TestObjectFactory.createResponse();

        this.context.relationshipToReturnFromGetRelationshipToIdentity = relationship;
        this.context.localRequestAfterAction = await this.context.outgoingRequestsController.createAndCompleteFromRelationshipTemplateResponse(
            params as ICreateAndCompleteOutgoingRequestFromRelationshipTemplateResponseParameters
        );
    }

    public async iCreateAnOutgoingRequestFromMessage(): Promise<void> {
        await this.iCreateAnOutgoingRequestFromMessageWith({});
    }

    public async iCreateAnOutgoingRequestFromMessageWith(params: Partial<ICreateAndCompleteOutgoingRequestFromRelationshipTemplateResponseParameters>): Promise<void> {
        params.template ??= TestObjectFactory.createOutgoingIRelationshipTemplate(
            this.context.currentIdentity,
            RelationshipTemplateContent.from({
                onNewRelationship: TestObjectFactory.createRequestWithOneItem(),
                onExistingRelationship: TestObjectFactory.createRequestWithOneItem()
            })
        );
        params.responseSource ??= TestObjectFactory.createIncomingIMessageWithResponse(CoreAddress.from("did:e:a-domain:dids:anidentity"), CoreId.from("REQ1"));
        params.response ??= TestObjectFactory.createResponse();

        this.context.localRequestAfterAction = await this.context.outgoingRequestsController.createAndCompleteFromRelationshipTemplateResponse(
            params as ICreateAndCompleteOutgoingRequestFromRelationshipTemplateResponseParameters
        );
    }

    public async iSentAnOutgoingRequestWithDeleteAttributeRequestItems(): Promise<void> {
        const sOwnIdentityAttribute1 = await this.context.consumptionController.attributes.createOwnIdentityAttribute({
            content: IdentityAttribute.from({
                value: {
                    "@type": "BirthName",
                    value: "A first name"
                },
                owner: this.context.currentIdentity
            })
        });
        await this.context.consumptionController.attributes.addForwardedSharingDetailsToAttribute(
            sOwnIdentityAttribute1,
            CoreAddress.from("did:e:a-domain:dids:anidentity"),
            CoreId.from("shareSourceReference1")
        );

        const sOwnIdentityAttribute2 = await this.context.consumptionController.attributes.createOwnIdentityAttribute({
            content: IdentityAttribute.from({
                value: {
                    "@type": "BirthName",
                    value: "A former second name"
                },
                owner: this.context.currentIdentity
            })
        });
        await this.context.consumptionController.attributes.addForwardedSharingDetailsToAttribute(
            sOwnIdentityAttribute2,
            CoreAddress.from("did:e:a-domain:dids:anidentity"),
            CoreId.from("shareSourceReference2")
        );

        const { successor: sSucceededOwnIdentityAttribute2 } = await this.context.consumptionController.attributes.succeedOwnIdentityAttribute(sOwnIdentityAttribute2, {
            content: IdentityAttribute.from({
                value: {
                    "@type": "BirthName",
                    value: "A second name"
                },
                owner: this.context.currentIdentity
            })
        });
        await this.context.consumptionController.attributes.addForwardedSharingDetailsToAttribute(
            sSucceededOwnIdentityAttribute2,
            CoreAddress.from("did:e:a-domain:dids:anidentity"),
            CoreId.from("shareSourceReference3")
        );

        const createParams: ICreateOutgoingRequestParameters = {
            content: {
                items: [
                    RequestItemGroup.from({
                        items: [
                            DeleteAttributeRequestItem.from({
                                attributeId: sOwnIdentityAttribute1.id.toString(),
                                mustBeAccepted: false
                            }),
                            TestRequestItem.from({
                                mustBeAccepted: false
                            })
                        ]
                    }),
                    DeleteAttributeRequestItem.from({
                        attributeId: sSucceededOwnIdentityAttribute2.id.toString(),
                        mustBeAccepted: false
                    }),
                    TestRequestItem.from({
                        mustBeAccepted: false
                    })
                ]
            },
            peer: CoreAddress.from("did:e:a-domain:dids:anidentity")
        };
        const localRequest = await this.context.outgoingRequestsController.create(createParams);

        const sentParams: ISentOutgoingRequestParameters = {
            requestId: localRequest.id,
            requestSourceObject: TestObjectFactory.createOutgoingMessage(this.context.currentIdentity)
        };
        this.context.localRequestAfterAction = await this.context.outgoingRequestsController.sent(sentParams);
    }

    public async iCreateAnIncomingRequestWith(params: Partial<IReceivedIncomingRequestParameters>): Promise<void> {
        params.receivedRequest ??= TestObjectFactory.createRequestWithOneItem();
        params.requestSourceObject ??= TestObjectFactory.createIncomingMessage(this.context.currentIdentity);

        this.context.localRequestAfterAction = await this.context.incomingRequestsController.received({
            receivedRequest: params.receivedRequest,
            requestSourceObject: params.requestSourceObject
        });
    }

    public iTryToCreateAnIncomingRequestWith(params: Partial<IReceivedIncomingRequestParameters>): Promise<void> {
        this.context.actionToTry = async () => await this.iCreateAnIncomingRequestWith(params);
        return Promise.resolve();
    }

    public async iCompleteTheIncomingRequest(): Promise<void> {
        await this.iCompleteTheIncomingRequestWith({});
    }

    public async iCompleteTheIncomingRequestWith(params: Partial<ICompleteIncomingRequestParameters>): Promise<void> {
        params.requestId ??= this.context.givenLocalRequest!.id;
        this.context.localRequestAfterAction = await this.context.incomingRequestsController.complete(params as ICompleteIncomingRequestParameters);
    }

    public async iAcceptTheRequest(params?: Omit<DecideRequestParametersJSON, "requestId">): Promise<void> {
        params ??= {
            items: [
                {
                    accept: true
                }
            ]
        };

        this.context.localRequestAfterAction = await this.context.incomingRequestsController.accept({
            requestId: this.context.givenLocalRequest!.id.toString(),
            ...params
        });
    }

    public async iRejectTheRequest(params?: Omit<DecideRequestParametersJSON, "requestId">): Promise<void> {
        params ??= {
            items: [
                {
                    accept: false
                }
            ]
        };

        this.context.localRequestAfterAction = await this.context.incomingRequestsController.reject({
            requestId: this.context.givenLocalRequest!.id.toString(),
            ...params
        });
    }

    public async iCompleteTheOutgoingRequest(): Promise<void> {
        const responseSource = TestObjectFactory.createIncomingMessage(this.context.currentIdentity);
        const responseContent = {
            result: ResponseResult.Accepted,
            requestId: this.context.givenLocalRequest!.id,
            items: [AcceptResponseItem.from({ result: ResponseItemResult.Accepted })]
        } as IResponse;

        this.context.localRequestAfterAction = await this.context.outgoingRequestsController.complete({
            requestId: this.context.givenLocalRequest!.id,
            responseSourceObject: responseSource,
            receivedResponse: responseContent
        });
    }

    public async iCompleteTheOutgoingRequestWith(params: { requestId?: ICoreId; responseSourceObject?: IMessage; receivedResponse?: Omit<IResponse, "id"> }): Promise<void> {
        params.requestId ??= this.context.givenLocalRequest!.id;
        params.responseSourceObject ??= TestObjectFactory.createIncomingIMessage(this.context.currentIdentity);
        params.receivedResponse ??= TestObjectFactory.createResponse();

        params.receivedResponse.requestId = params.requestId;

        this.context.localRequestAfterAction = await this.context.outgoingRequestsController.complete(params as ICompleteOutgoingRequestParameters);
    }

    public async iGetIncomingRequestsWithTheQuery(query?: any): Promise<void> {
        this.context.localRequestsAfterAction = await this.context.incomingRequestsController.getIncomingRequests(query);
    }

    public async iGetOutgoingRequestsWithTheQuery(query?: any): Promise<void> {
        this.context.localRequestsAfterAction = await this.context.outgoingRequestsController.getOutgoingRequests(query);
    }

    public async iGetTheIncomingRequestWith(id: CoreId): Promise<void> {
        this.context.localRequestAfterAction = await this.context.incomingRequestsController.getIncomingRequest(id);
    }

    public async iGetTheOutgoingRequest(): Promise<void> {
        await this.iGetTheOutgoingRequestWith(this.context.givenLocalRequest!.id);
    }

    public async iGetTheOutgoingRequestWith(id: CoreId): Promise<void> {
        this.context.localRequestAfterAction = await this.context.outgoingRequestsController.getOutgoingRequest(id);
    }

    public async iTryToGetARequestWithANonExistentId(): Promise<void> {
        this.context.localRequestAfterAction = (await this.context.incomingRequestsController.getIncomingRequest(await CoreIdHelper.notPrefixed.generate()))!;
    }

    public iTryToCompleteTheIncomingRequestWith(params: Partial<ICompleteIncomingRequestParameters>): Promise<void> {
        this.context.actionToTry = async () => {
            await this.iCompleteTheIncomingRequestWith(params);
        };

        return Promise.resolve();
    }

    public iTryToCompleteTheIncomingRequest(): Promise<void> {
        this.context.actionToTry = async () => {
            await this.iCompleteTheIncomingRequest();
        };

        return Promise.resolve();
    }

    public iTryToCallCanCreateForAnOutgoingRequest(params: ICreateOutgoingRequestParameters): Promise<void> {
        this.context.actionToTry = async () => {
            await this.context.outgoingRequestsController.canCreate(params);
        };

        return Promise.resolve();
    }

    public iTryToAcceptARequestWithoutItemsParameters(): Promise<void> {
        const paramsWithoutItems: Omit<DecideRequestParametersJSON, "items"> = {
            requestId: "REQ1"
        };

        this.context.actionToTry = async () => {
            await this.context.incomingRequestsController.accept(paramsWithoutItems as any);
        };

        return Promise.resolve();
    }

    public iTryToRejectARequestWithoutItemsParameters(): Promise<void> {
        const paramsWithoutItems: Omit<DecideRequestParametersJSON, "items"> = {
            requestId: "REQ1"
        };

        this.context.actionToTry = async () => {
            await this.context.incomingRequestsController.reject(paramsWithoutItems as any);
        };

        return Promise.resolve();
    }

    public iTryToCreateAnOutgoingRequest(): Promise<void> {
        const params: ICreateOutgoingRequestParameters = {
            content: {
                items: [
                    TestRequestItem.from({
                        mustBeAccepted: false
                    })
                ]
            },
            peer: CoreAddress.from("did:e:a-domain:dids:anidentity")
        };

        this.context.actionToTry = async () => {
            await this.context.outgoingRequestsController.create(params as any);
        };

        return Promise.resolve();
    }

    public iTryToCreateAnOutgoingRequestWithoutContent(): Promise<void> {
        const paramsWithoutItems: Omit<ICreateOutgoingRequestParameters, "content"> = {
            peer: CoreAddress.from("did:e:a-domain:dids:anidentity")
        };

        this.context.actionToTry = async () => {
            await this.context.outgoingRequestsController.create(paramsWithoutItems as any);
        };

        return Promise.resolve();
    }

    public iTryToCreateAnOutgoingRequestWithIncorrectRequestItem(): Promise<void> {
        const params: ICreateOutgoingRequestParameters = {
            content: {
                items: [
                    TestRequestItem.from({
                        mustBeAccepted: false,
                        shouldFailAtCanCreateOutgoingRequestItem: true
                    }),
                    TestRequestItem.from({
                        mustBeAccepted: false,
                        shouldFailAtCanCreateOutgoingRequestItem: true
                    })
                ]
            },
            peer: CoreAddress.from("did:e:a-domain:dids:anidentity")
        };

        this.context.actionToTry = async () => {
            await this.context.outgoingRequestsController.create(params as any);
        };

        return Promise.resolve();
    }

    public iTryToCreateAnOutgoingRequestFromRelationshipTemplateResponseWithoutResponseSource(): Promise<void> {
        const paramsWithoutResponseSource: Omit<ICreateAndCompleteOutgoingRequestFromRelationshipTemplateResponseParameters, "responseSource"> = {
            response: TestObjectFactory.createResponse(),
            template: TestObjectFactory.createOutgoingIRelationshipTemplate(this.context.currentIdentity)
        };

        this.context.actionToTry = async () => {
            await this.context.outgoingRequestsController.createAndCompleteFromRelationshipTemplateResponse(paramsWithoutResponseSource as any);
        };

        return Promise.resolve();
    }

    public iTryToRejectARequestWithSyntacticallyInvalidInput(): Promise<void> {
        const paramsWithoutItems: Omit<DecideRequestParametersJSON, "items"> = {
            requestId: "REQ1"
        };

        this.context.actionToTry = async () => {
            await this.context.incomingRequestsController.reject(paramsWithoutItems as any);
        };

        return Promise.resolve();
    }

    public async iDiscardTheOutgoingRequest(): Promise<void> {
        await this.context.outgoingRequestsController.discardOutgoingRequest(this.context.givenLocalRequest!.id);
        this.context.localRequestAfterAction = this.context.givenLocalRequest;
    }

    public iTryToDiscardTheOutgoingRequest(): Promise<void> {
        this.context.actionToTry = async () => await this.iDiscardTheOutgoingRequest();
        return Promise.resolve();
    }
}

export class RequestsThen {
    public applyIncomingResponseItemIsCalledOnTheRequestItemProcessor(numberOfCalls: number): Promise<void> {
        expect(TestRequestItemProcessor.numberOfApplyIncomingResponseItemCalls).toStrictEqual(numberOfCalls);
        return Promise.resolve();
    }

    public constructor(private readonly context: RequestsTestsContext) {}

    public canCreateIsBeingCalled(): Promise<void> {
        expect(this.context.canCreateWasCalled).toBe(true);
        return Promise.resolve();
    }

    public theNumberOfReturnedRequestsIs(n: number): Promise<void> {
        expect(this.context.localRequestsAfterAction).toHaveLength(n);
        return Promise.resolve();
    }

    public theReturnedRequestHasTheId(id: CoreId): Promise<void> {
        expect(this.context.localRequestAfterAction).toBeDefined();
        expect(this.context.localRequestAfterAction!.id.toString()).toStrictEqual(id.toString());
        return Promise.resolve();
    }

    public iExpectUndefinedToBeReturned(): Promise<void> {
        expect(this.context.localRequestAfterAction).toBeUndefined();
        return Promise.resolve();
    }

    public theCreatedRequestHasAllProperties(createdBy: CoreAddress, sourceId: CoreId, sourceType: "Message" | "RelationshipTemplate"): Promise<void> {
        expect(this.context.localRequestAfterAction).toBeInstanceOf(LocalRequest);
        expect(this.context.localRequestAfterAction!.id).toBeDefined();
        expect(this.context.localRequestAfterAction!.isOwn).toBe(false);
        expect(this.context.localRequestAfterAction!.peer.toString()).toStrictEqual(createdBy.toString());
        expect(this.context.localRequestAfterAction!.source).toBeDefined();
        expect(this.context.localRequestAfterAction!.source!.reference.toString()).toStrictEqual(sourceId.toString());
        expect(this.context.localRequestAfterAction!.source!.type).toStrictEqual(sourceType);
        expect(this.context.localRequestAfterAction!.response).toBeUndefined();
        expect(this.context.localRequestAfterAction!.statusLog).toHaveLength(0);

        return Promise.resolve();
    }

    public theRequestHasExpirationDate(expiresAt: CoreDate): Promise<void> {
        expect(this.context.localRequestAfterAction?.content.expiresAt).toStrictEqual(expiresAt);

        return Promise.resolve();
    }

    public theRequestHasCorrectItemCount(itemCount: number): Promise<void> {
        expect(this.context.localRequestAfterAction?.content.items).toHaveLength(itemCount);

        return Promise.resolve();
    }

    public theCreatedOutgoingRequestHasAllProperties(): Promise<void> {
        expect(this.context.localRequestAfterAction).toBeDefined();

        expect(this.context.localRequestAfterAction!.id).toBeDefined();
        expect(this.context.localRequestAfterAction!.createdAt).toBeDefined();
        expect(this.context.localRequestAfterAction!.isOwn).toBe(true);

        return Promise.resolve();
    }

    public async theDeletionInfoOfTheAssociatedAttributesAndPredecessorsIsSet(): Promise<void> {
        const sUpdatedOwnIdentityAttributes = await this.context.consumptionController.attributes.getLocalAttributes();
        expect(sUpdatedOwnIdentityAttributes).toBeDefined();
        expect(sUpdatedOwnIdentityAttributes).toHaveLength(3);
        for (const sUpdatedOwnIdentityAttribute of sUpdatedOwnIdentityAttributes) {
            expect((sUpdatedOwnIdentityAttribute as OwnIdentityAttribute).forwardedSharingDetails![0].deletionInfo).toBeDefined();
            expect((sUpdatedOwnIdentityAttribute as OwnIdentityAttribute).forwardedSharingDetails![0].deletionInfo!.deletionStatus).toBe(
                EmittedAttributeDeletionStatus.DeletionRequestSent
            );
        }
    }

    public theRequestHasItsResponsePropertySetCorrectly(expectedResult: ResponseItemResult): Promise<void> {
        expect(this.context.localRequestAfterAction!.response).toBeDefined();
        expect(this.context.localRequestAfterAction!.response).toBeInstanceOf(LocalResponse);
        expect(this.context.localRequestAfterAction!.response!.content).toBeInstanceOf(Response);
        expect(this.context.localRequestAfterAction!.response!.content.requestId.toString()).toStrictEqual(
            (this.context.localRequestAfterAction ?? this.context.givenLocalRequest!).id.toString()
        );
        expect(this.context.localRequestAfterAction?.response!.content.result).toStrictEqual(expectedResult);

        return Promise.resolve();
    }

    public theResponseHasItsSourcePropertySetCorrectly(expectedProperties: { responseSourceType: string }): Promise<void> {
        expect(this.context.localRequestAfterAction!.response!.source).toBeDefined();
        expect(this.context.localRequestAfterAction!.response!.source!.reference).toBeDefined();
        expect(this.context.localRequestAfterAction!.response!.source!.type).toStrictEqual(expectedProperties.responseSourceType);

        return Promise.resolve();
    }

    public theResponseHasItsSourcePropertyNotSet(): Promise<void> {
        expect(this.context.localRequestAfterAction!.response!.source).toBeUndefined();

        return Promise.resolve();
    }

    public theRequestHasItsSourcePropertySet(): Promise<void> {
        expect(this.context.localRequestAfterAction!.source).toBeDefined();
        expect(this.context.localRequestAfterAction!.source).toBeInstanceOf(LocalRequestSource);
        expect(this.context.localRequestAfterAction!.source!.reference).toBeInstanceOf(CoreId);

        return Promise.resolve();
    }

    public theRequestHasItsSourcePropertySetTo(expectedSource: ILocalRequestSource): Promise<void> {
        expect(this.context.localRequestAfterAction!.source).toBeDefined();
        expect(this.context.localRequestAfterAction!.source).toBeInstanceOf(LocalRequestSource);
        expect(this.context.localRequestAfterAction!.source!.reference.toString()).toStrictEqual(expectedSource.reference.id);
        expect(this.context.localRequestAfterAction!.source!.type).toStrictEqual(expectedSource.type);

        return Promise.resolve();
    }

    public theRequestIsInStatus(status: LocalRequestStatus): Promise<void> {
        expect(this.context.localRequestAfterAction!.status).toStrictEqual(status);
        return Promise.resolve();
    }

    public theOnlyReturnedRequestIsInStatus(status: LocalRequestStatus): Promise<void> {
        expect(this.context.localRequestsAfterAction).toHaveLength(1);
        expect(this.context.localRequestsAfterAction![0].status).toStrictEqual(status);
        return Promise.resolve();
    }

    public theRequestDoesNotHaveSourceSet(): Promise<void> {
        expect(this.context.localRequestAfterAction!.source).toBeUndefined();
        return Promise.resolve();
    }

    public theRequestMovesToStatus(status: LocalRequestStatus): Promise<void> {
        const modifiedRequest = this.context.localRequestAfterAction!;

        expect(modifiedRequest.status).toStrictEqual(status);

        const statusLogEntry = modifiedRequest.statusLog[modifiedRequest.statusLog.length - 1];
        expect(statusLogEntry.newStatus).toStrictEqual(status);

        return Promise.resolve();
    }

    public itReturnsASuccessfulValidationResult(): Promise<void> {
        expect(this.context.validationResult!.isSuccess()).toBe(true);
        return Promise.resolve();
    }

    public itReturnsAnErrorValidationResult(): Promise<void> {
        expect(this.context.validationResult!.isError()).toBe(true);
        return Promise.resolve();
    }

    public async theNewRequestIsPersistedInTheDatabase(): Promise<void> {
        const requestDoc = await this.context.requestsCollection.read(this.context.localRequestAfterAction!.id.toString());
        const requestInDatabase = LocalRequest.from(requestDoc);

        expect(requestInDatabase).toBeDefined();
        expect(requestInDatabase.toJSON()).toStrictEqual(this.context.localRequestAfterAction!.toJSON());
    }

    public async theChangesArePersistedInTheDatabase(): Promise<void> {
        const requestDoc = await this.context.requestsCollection.read(this.context.localRequestAfterAction!.id.toString());
        const requestInDatabase = LocalRequest.from(requestDoc);

        expect(requestInDatabase.toJSON()).toStrictEqual(this.context.localRequestAfterAction!.toJSON());
    }

    public theRequestHasTheId(id: CoreId | string): Promise<void> {
        expect(this.context.localRequestAfterAction!.id.toString()).toStrictEqual(id.toString());
        return Promise.resolve();
    }

    public iExpectTheResponseContent(customExpects: (responseContent: Response) => void): Promise<void> {
        customExpects(this.context.localRequestAfterAction!.response!.content);
        return Promise.resolve();
    }

    public async itThrowsAnErrorWithTheErrorMessage(errorMessage: string): Promise<void> {
        const regex = new RegExp(errorMessage.replace(/\*/g, ".*"));
        await expect(this.context.actionToTry!).rejects.toThrow(regex);
    }

    public async itThrowsAnErrorWithTheErrorCode(code: string): Promise<void> {
        await expect(this.context.actionToTry!).rejects.toThrow(code);
    }

    public eventHasBeenPublished<TEvent extends DataEvent<unknown>>(
        eventConstructor: (new (...args: any[]) => TEvent) & { namespace: string },
        data?: Partial<TEvent extends DataEvent<infer X> ? X : never>
    ): Promise<void> {
        this.context.mockEventBus.expectLastPublishedEvent(eventConstructor, data);
        return Promise.resolve();
    }

    public eventsHaveBeenPublished(...eventContructors: ((new (...args: any[]) => DataEvent<unknown>) & { namespace: string })[]): Promise<void> {
        this.context.mockEventBus.expectPublishedEvents(...eventContructors);
        return Promise.resolve();
    }

    public async theRequestIsDeleted(): Promise<void> {
        const request = await this.context.requestsCollection.read(this.context.localRequestAfterAction!.id.toString());
        // null for mongodb and undefined for lokijs => falsy matches both
        expect(request).toBeFalsy();
    }
}

function isStatusAAfterStatusB(a: LocalRequestStatus, b: LocalRequestStatus): boolean {
    return getIntegerValue(a) > getIntegerValue(b);
}

function getIntegerValue(status: LocalRequestStatus): number {
    switch (status) {
        case LocalRequestStatus.Draft:
            return 0;
        case LocalRequestStatus.Open:
            return 1;
        case LocalRequestStatus.DecisionRequired:
            return 2;
        case LocalRequestStatus.ManualDecisionRequired:
            return 3;
        case LocalRequestStatus.Expired:
            return 4;
        case LocalRequestStatus.Decided:
            return 5;
        case LocalRequestStatus.Completed:
            return 6;
        default:
            throw new Error(`The status '${status}' cannot be compared.`);
    }
}
