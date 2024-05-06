import { CoreId, IdentityDeletionProcessStatus } from "@nmshd/transport";
import {
    ApproveIdentityDeletionProcessUseCase,
    CancelIdentityDeletionProcessUseCase,
    GetIdentityDeletionProcessesUseCase,
    GetIdentityDeletionProcessUseCase,
    InitiateIdentityDeletionProcessUseCase,
    RejectIdentityDeletionProcessUseCase,
    TransportServices
} from "../../src";
import { RuntimeServiceProvider, startIdentityDeletionProcessFromBackboneAdminApi } from "../lib";

const serviceProvider = new RuntimeServiceProvider();
let transportService: TransportServices;
let accountAddress: string;

beforeEach(async () => {
    const runtimeServices = await serviceProvider.launch(1);
    transportService = runtimeServices[0].transport;
    accountAddress = runtimeServices[0].address;
}, 30000);
afterEach(async () => await serviceProvider.stop());

describe("IdentityDeletionProcess", () => {
    describe(InitiateIdentityDeletionProcessUseCase.name, () => {
        test("should initiate an Identity deletion process", async function () {
            const result = await transportService.identityDeletionProcesses.initiateIdentityDeletionProcess();
            expect(result).toBeSuccessful();

            const identityDeletionProcess = result.value;
            expect(identityDeletionProcess.status).toBe(IdentityDeletionProcessStatus.Approved);
        });

        test("should return an error trying to initiate an Identity deletion process if there already is one", async function () {
            await transportService.identityDeletionProcesses.initiateIdentityDeletionProcess();
            const result = await transportService.identityDeletionProcesses.initiateIdentityDeletionProcess();
            expect(result).toBeAnError(
                "There is already an active identity deletion process. You cannot start another, as there may only be one active identity deletion process per identity.",
                "error.runtime.identity.activeIdentityDeletionProcessAlreadyExists"
            );
        });
        test("should return an error trying to initiate an Identity deletion process if there already is one waiting for approval", async function () {
            await startIdentityDeletionProcessFromBackboneAdminApi(transportService, accountAddress);
            await transportService.identityDeletionProcesses.initiateIdentityDeletionProcess();
            const result = await transportService.identityDeletionProcesses.initiateIdentityDeletionProcess();
            expect(result).toBeAnError(
                "There is already an active identity deletion process. You cannot start another, as there may only be one active identity deletion process per identity.",
                "error.runtime.identity.activeIdentityDeletionProcessAlreadyExists"
            );
        });
    });

    describe(GetIdentityDeletionProcessUseCase.name, () => {
        test("should get the active Identity deletion process without specifying an ID", async function () {
            const initiateResult = await transportService.identityDeletionProcesses.initiateIdentityDeletionProcess();
            const initiatedIdentityDeletionProcess = initiateResult.value;

            const result = await transportService.identityDeletionProcesses.getIdentityDeletionProcess({});
            expect(result).toBeSuccessful();

            const identityDeletionProcess = result.value;
            expect(identityDeletionProcess).toStrictEqual(initiatedIdentityDeletionProcess);
        });

        test("should get an Identity deletion process specifying an ID", async function () {
            const initiateResult = await transportService.identityDeletionProcesses.initiateIdentityDeletionProcess();
            const initiatedIdentityDeletionProcess = initiateResult.value;

            const result = await transportService.identityDeletionProcesses.getIdentityDeletionProcess({ id: initiatedIdentityDeletionProcess.id });
            expect(result).toBeSuccessful();

            const identityDeletionProcess = result.value;
            expect(identityDeletionProcess).toStrictEqual(initiatedIdentityDeletionProcess);
        });

        test("should return an error trying to get an Identity deletion process without specifying an ID if there is none active", async function () {
            const result = await transportService.identityDeletionProcesses.getIdentityDeletionProcess({});
            expect(result).toBeAnError("No active identity deletion process found.", "error.runtime.identity.noActiveIdentityDeletionProcess");
        });

        test("should return an error trying to get an Identity deletion process specifying an unknown ID", async function () {
            const unknownId = (await CoreId.generate("IDP")).toString();
            const result = await transportService.identityDeletionProcesses.getIdentityDeletionProcess({ id: unknownId });
            expect(result).toBeAnError("IdentityDeletionProcess not found. Make sure the ID exists and the record is not expired.", "error.runtime.recordNotFound");
        });
    });

    describe(GetIdentityDeletionProcessesUseCase.name, () => {
        test("should get all Identity deletion processes", async function () {
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

        test("should return an empty list trying to get all Identity deletion processes if there are none", async function () {
            const result = await transportService.identityDeletionProcesses.getIdentityDeletionProcesses();
            expect(result).toBeSuccessful();

            const identityDeletionProcesses = result.value;
            expect(identityDeletionProcesses).toHaveLength(0);
        });
    });

    describe(CancelIdentityDeletionProcessUseCase.name, () => {
        test("should cancel an Identity deletion process", async function () {
            await transportService.identityDeletionProcesses.initiateIdentityDeletionProcess();
            const result = await transportService.identityDeletionProcesses.cancelIdentityDeletionProcess();
            expect(result).toBeSuccessful();

            const cancelledIdentityDeletionProcess = result.value;
            expect(cancelledIdentityDeletionProcess.status).toBe(IdentityDeletionProcessStatus.Cancelled);
        });

        test("should return an error trying to cancel an Identity deletion process if there is none active", async function () {
            const result = await transportService.identityDeletionProcesses.cancelIdentityDeletionProcess();
            expect(result).toBeAnError("No active identity deletion process found.", "error.runtime.identity.noActiveIdentityDeletionProcess");
        });
    });

    describe(ApproveIdentityDeletionProcessUseCase.name, () => {
        test("should approve an waiting Identity deletion process", async function () {
            await startIdentityDeletionProcessFromBackboneAdminApi(transportService, accountAddress);
            const result = await transportService.identityDeletionProcesses.approveIdentityDeletionProcess();
            expect(result).toBeSuccessful();

            const approvedIdentityDeletionProcess = result.value;
            expect(approvedIdentityDeletionProcess.status).toBe(IdentityDeletionProcessStatus.Approved);
        });

        test("should return an error trying to approve an Identity deletion process if there is none active", async function () {
            const result = await transportService.identityDeletionProcesses.approveIdentityDeletionProcess();
            expect(result).toBeAnError("No identity deletion process waiting for decision found.", "error.runtime.identity.noWaitingForApprovalIdentityDeletionProcess");
        });
    });

    describe(RejectIdentityDeletionProcessUseCase.name, () => {
        test("should reject an waiting Identity deletion process", async function () {
            await startIdentityDeletionProcessFromBackboneAdminApi(transportService, accountAddress);
            const result = await transportService.identityDeletionProcesses.rejectIdentityDeletionProcess();
            expect(result).toBeSuccessful();

            const approvedIdentityDeletionProcess = result.value;
            expect(approvedIdentityDeletionProcess.status).toBe(IdentityDeletionProcessStatus.Rejected);
        });

        test("should return an error trying to approve an Identity deletion process if there is none active", async function () {
            const result = await transportService.identityDeletionProcesses.rejectIdentityDeletionProcess();
            expect(result).toBeAnError("No identity deletion process waiting for decision found.", "error.runtime.identity.noWaitingForApprovalIdentityDeletionProcess");
        });
    });
});
