import { CoreIdHelper, IdentityDeletionProcessStatus } from "@nmshd/transport";
import {
    ApproveIdentityDeletionProcessUseCase,
    CancelIdentityDeletionProcessUseCase,
    GetActiveIdentityDeletionProcessUseCase,
    GetIdentityDeletionProcessesUseCase,
    GetIdentityDeletionProcessUseCase,
    IdentityDeletionProcessStatusChangedEvent,
    InitiateIdentityDeletionProcessUseCase,
    RejectIdentityDeletionProcessUseCase,
    TransportServices
} from "../../src";
import { MockEventBus, RuntimeServiceProvider } from "../lib";
import { cancelIdentityDeletionProcessFromBackboneAdminApi, startIdentityDeletionProcessFromBackboneAdminApi } from "../lib/AdminApiClient";

const serviceProvider = new RuntimeServiceProvider();
let transportService: TransportServices;
let accountAddress: string;
let eventBus: MockEventBus;

beforeAll(async () => {
    const runtimeServices = await serviceProvider.launch(1);
    transportService = runtimeServices[0].transport;
    accountAddress = runtimeServices[0].address;
    eventBus = runtimeServices[0].eventBus;
}, 30000);

beforeEach(() => {
    eventBus.reset();
});

afterAll(async () => {
    return await serviceProvider.stop();
});

afterEach(async () => {
    const activeIdentityDeletionProcess = await transportService.identityDeletionProcesses.getActiveIdentityDeletionProcess();
    if (!activeIdentityDeletionProcess.isSuccess) {
        return;
    }
    let abortResult;
    if (activeIdentityDeletionProcess.value.status === IdentityDeletionProcessStatus.Approved) {
        abortResult = await transportService.identityDeletionProcesses.cancelIdentityDeletionProcess();
    } else if (activeIdentityDeletionProcess.value.status === IdentityDeletionProcessStatus.WaitingForApproval) {
        abortResult = await transportService.identityDeletionProcesses.rejectIdentityDeletionProcess();
    }

    if (abortResult?.isError) throw abortResult.error;
});

describe("IdentityDeletionProcess", () => {
    test("should start and cancel an IdentityDeletionProcess using the Backbone Admin Api", async function () {
        const initiatedIdentityDeletionProcess = await startIdentityDeletionProcessFromBackboneAdminApi(transportService, accountAddress);
        expect(initiatedIdentityDeletionProcess.status).toStrictEqual(IdentityDeletionProcessStatus.WaitingForApproval);

        await expect(eventBus).toHavePublished(IdentityDeletionProcessStatusChangedEvent, (e) => e.data!.id === initiatedIdentityDeletionProcess.id);
        await expect(eventBus).toHavePublished(IdentityDeletionProcessStatusChangedEvent, (e) => e.data!.status === IdentityDeletionProcessStatus.WaitingForApproval);

        await transportService.identityDeletionProcesses.approveIdentityDeletionProcess();
        eventBus.reset();

        const result = await cancelIdentityDeletionProcessFromBackboneAdminApi(transportService, accountAddress, initiatedIdentityDeletionProcess.id.toString());
        expect(result).toBeSuccessful();
        const identityDeletionProcess = result.value;
        expect(identityDeletionProcess.status).toStrictEqual(IdentityDeletionProcessStatus.Cancelled);

        await expect(eventBus).toHavePublished(IdentityDeletionProcessStatusChangedEvent, (e) => e.data!.id === initiatedIdentityDeletionProcess.id);
        await expect(eventBus).toHavePublished(IdentityDeletionProcessStatusChangedEvent, (e) => e.data!.status === IdentityDeletionProcessStatus.Cancelled);
    });

    describe(InitiateIdentityDeletionProcessUseCase.name, () => {
        test("should initiate an IdentityDeletionProcess", async function () {
            const result = await transportService.identityDeletionProcesses.initiateIdentityDeletionProcess();
            expect(result).toBeSuccessful();

            const identityDeletionProcess = result.value;
            expect(identityDeletionProcess.status).toBe(IdentityDeletionProcessStatus.Approved);

            await expect(eventBus).toHavePublished(IdentityDeletionProcessStatusChangedEvent, (e) => e.data!.id === identityDeletionProcess.id);
            await expect(eventBus).toHavePublished(IdentityDeletionProcessStatusChangedEvent, (e) => e.data!.status === IdentityDeletionProcessStatus.Approved);
        });

        test("should return an error trying to initiate an IdentityDeletionProcess if there already is one approved", async function () {
            await transportService.identityDeletionProcesses.initiateIdentityDeletionProcess();
            const result = await transportService.identityDeletionProcesses.initiateIdentityDeletionProcess();
            expect(result).toBeAnError(
                "There is already an active IdentityDeletionProcess. You cannot start another, as there may only be one active IdentityDeletionProcess per Identity.",
                "error.runtime.identityDeletionProcess.activeIdentityDeletionProcessAlreadyExists"
            );
        });

        test("should return an error trying to initiate an IdentityDeletionProcess if there already is one waiting for approval", async function () {
            await startIdentityDeletionProcessFromBackboneAdminApi(transportService, accountAddress);
            await transportService.identityDeletionProcesses.initiateIdentityDeletionProcess();
            const result = await transportService.identityDeletionProcesses.initiateIdentityDeletionProcess();
            expect(result).toBeAnError(
                "There is already an active IdentityDeletionProcess. You cannot start another, as there may only be one active IdentityDeletionProcess per Identity.",
                "error.runtime.identityDeletionProcess.activeIdentityDeletionProcessAlreadyExists"
            );
        });
    });

    describe(GetActiveIdentityDeletionProcessUseCase.name, () => {
        test("should get the active IdentityDeletionProcess", async function () {
            const initiateResult = await transportService.identityDeletionProcesses.initiateIdentityDeletionProcess();
            const initiatedIdentityDeletionProcess = initiateResult.value;

            const result = await transportService.identityDeletionProcesses.getActiveIdentityDeletionProcess();
            expect(result).toBeSuccessful();

            const identityDeletionProcess = result.value;
            expect(identityDeletionProcess).toStrictEqual(initiatedIdentityDeletionProcess);
        });

        test("should return an error trying to get the active IdentityDeletionProcess if there is none active", async function () {
            const result = await transportService.identityDeletionProcesses.getActiveIdentityDeletionProcess();
            expect(result).toBeAnError("No active IdentityDeletionProcess found.", "error.runtime.identityDeletionProcess.noActiveIdentityDeletionProcess");
        });
    });

    describe(GetIdentityDeletionProcessUseCase.name, () => {
        test("should get an IdentityDeletionProcess specifying an ID", async function () {
            const initiateResult = await transportService.identityDeletionProcesses.initiateIdentityDeletionProcess();
            const initiatedIdentityDeletionProcess = initiateResult.value;

            const result = await transportService.identityDeletionProcesses.getIdentityDeletionProcess({ id: initiatedIdentityDeletionProcess.id });
            expect(result).toBeSuccessful();

            const identityDeletionProcess = result.value;
            expect(identityDeletionProcess).toStrictEqual(initiatedIdentityDeletionProcess);
        });

        test("should return an error trying to get an IdentityDeletionProcess specifying an unknown ID", async function () {
            const unknownId = (await new CoreIdHelper("IDP").generate()).toString();
            const result = await transportService.identityDeletionProcesses.getIdentityDeletionProcess({ id: unknownId });
            expect(result).toBeAnError("IdentityDeletionProcess not found. Make sure the ID exists and the record is not expired.", "error.runtime.recordNotFound");
        });
    });

    describe(GetIdentityDeletionProcessesUseCase.name, () => {
        test("should get all IdentityDeletionProcesses", async function () {
            // Initialize new identities for these tests as otherwise they would be depending on the other tests
            await serviceProvider.stop();
            const runtimeServices = await serviceProvider.launch(1);
            transportService = runtimeServices[0].transport;
            accountAddress = runtimeServices[0].address;
            eventBus = runtimeServices[0].eventBus;

            const cancelledIdentityDeletionProcess = (await transportService.identityDeletionProcesses.initiateIdentityDeletionProcess()).value;
            await transportService.identityDeletionProcesses.cancelIdentityDeletionProcess();
            const activeIdentityDeletionProcess = (await transportService.identityDeletionProcesses.initiateIdentityDeletionProcess()).value;

            const result = await transportService.identityDeletionProcesses.getIdentityDeletionProcesses();
            expect(result).toBeSuccessful();

            const identityDeletionProcesses = result.value;
            expect(identityDeletionProcesses).toHaveLength(2);
            expect(identityDeletionProcesses[0].id.toString()).toBe(cancelledIdentityDeletionProcess.id.toString());
            expect(identityDeletionProcesses[0].status).toBe(IdentityDeletionProcessStatus.Cancelled);
            expect(identityDeletionProcesses[1].id.toString()).toBe(activeIdentityDeletionProcess.id.toString());
            expect(identityDeletionProcesses[1].status).toBe(IdentityDeletionProcessStatus.Approved);
        });

        test("should return an empty list trying to get all IdentityDeletionProcesses if there are none", async function () {
            // Initialize new identities for these tests as otherwise they would be depending on the other tests
            await serviceProvider.stop();
            const runtimeServices = await serviceProvider.launch(1);
            transportService = runtimeServices[0].transport;
            accountAddress = runtimeServices[0].address;
            eventBus = runtimeServices[0].eventBus;

            const result = await transportService.identityDeletionProcesses.getIdentityDeletionProcesses();
            expect(result).toBeSuccessful();

            const identityDeletionProcesses = result.value;
            expect(identityDeletionProcesses).toHaveLength(0);
        });
    });

    describe(CancelIdentityDeletionProcessUseCase.name, () => {
        test("should cancel an IdentityDeletionProcess", async function () {
            await transportService.identityDeletionProcesses.initiateIdentityDeletionProcess();
            const result = await transportService.identityDeletionProcesses.cancelIdentityDeletionProcess();
            expect(result).toBeSuccessful();

            const cancelledIdentityDeletionProcess = result.value;
            expect(cancelledIdentityDeletionProcess.status).toBe(IdentityDeletionProcessStatus.Cancelled);

            await expect(eventBus).toHavePublished(IdentityDeletionProcessStatusChangedEvent, (e) => e.data!.id === cancelledIdentityDeletionProcess.id);
            await expect(eventBus).toHavePublished(IdentityDeletionProcessStatusChangedEvent, (e) => e.data!.status === IdentityDeletionProcessStatus.Cancelled);
        });

        test("should return an error trying to cancel an IdentityDeletionProcess if there is none active", async function () {
            const result = await transportService.identityDeletionProcesses.cancelIdentityDeletionProcess();
            expect(result).toBeAnError("No approved IdentityDeletionProcess found.", "error.runtime.identityDeletionProcess.noApprovedIdentityDeletionProcess");
        });
    });

    describe(ApproveIdentityDeletionProcessUseCase.name, () => {
        test("should approve a waiting for approval IdentityDeletionProcess", async function () {
            await startIdentityDeletionProcessFromBackboneAdminApi(transportService, accountAddress);
            const result = await transportService.identityDeletionProcesses.approveIdentityDeletionProcess();
            expect(result).toBeSuccessful();

            const approvedIdentityDeletionProcess = result.value;
            expect(approvedIdentityDeletionProcess.status).toBe(IdentityDeletionProcessStatus.Approved);

            await expect(eventBus).toHavePublished(IdentityDeletionProcessStatusChangedEvent, (e) => e.data!.id === approvedIdentityDeletionProcess.id);
            await expect(eventBus).toHavePublished(IdentityDeletionProcessStatusChangedEvent, (e) => e.data!.status === IdentityDeletionProcessStatus.Approved);
        });

        test("should return an error trying to approve an IdentityDeletionProcess if there is none active", async function () {
            const result = await transportService.identityDeletionProcesses.approveIdentityDeletionProcess();
            expect(result).toBeAnError(
                "No IdentityDeletionProcess waiting for decision found.",
                "error.runtime.identityDeletionProcess.noWaitingForApprovalIdentityDeletionProcess"
            );
        });
    });

    describe(RejectIdentityDeletionProcessUseCase.name, () => {
        test("should reject a waiting for approval IdentityDeletionProcess", async function () {
            await startIdentityDeletionProcessFromBackboneAdminApi(transportService, accountAddress);
            const result = await transportService.identityDeletionProcesses.rejectIdentityDeletionProcess();
            expect(result).toBeSuccessful();

            const rejectedIdentityDeletionProcess = result.value;
            expect(rejectedIdentityDeletionProcess.status).toBe(IdentityDeletionProcessStatus.Rejected);

            await expect(eventBus).toHavePublished(IdentityDeletionProcessStatusChangedEvent, (e) => e.data!.id === rejectedIdentityDeletionProcess.id);
            await expect(eventBus).toHavePublished(IdentityDeletionProcessStatusChangedEvent, (e) => e.data!.status === IdentityDeletionProcessStatus.Rejected);
        });

        test("should return an error trying to reject an IdentityDeletionProcess if there is none active", async function () {
            const result = await transportService.identityDeletionProcesses.rejectIdentityDeletionProcess();
            expect(result).toBeAnError(
                "No IdentityDeletionProcess waiting for decision found.",
                "error.runtime.identityDeletionProcess.noWaitingForApprovalIdentityDeletionProcess"
            );
        });
    });
});
