import { IdentityDeletionProcessStatus } from "@nmshd/transport";
import { TransportServices } from "../../src";
import { RuntimeServiceProvider } from "../lib";

const serviceProvider = new RuntimeServiceProvider();
let transportService: TransportServices;

beforeEach(async () => {
    const runtimeServices = await serviceProvider.launch(1);
    transportService = runtimeServices[0].transport;
}, 30000);
afterEach(async () => await serviceProvider.stop());

describe("IdentityDeletionProcess", () => {
    test("should initiate an Identity deletion process", async function () {
        const result = await transportService.identityDeletionProcesses.initiateIdentityDeletionProcess();
        expect(result).toBeSuccessful();

        const identityDeletionProcess = result.value;
        expect(identityDeletionProcess.status).toBe(IdentityDeletionProcessStatus.Approved);
    });

    test("should get an Identity deletion process without specifying an id", async function () {
        const initiateResult = await transportService.identityDeletionProcesses.initiateIdentityDeletionProcess();
        const initiatedIdentityDeletionProcess = initiateResult.value;

        const result = await transportService.identityDeletionProcesses.getIdentityDeletionProcess({});
        expect(result).toBeSuccessful();

        const identityDeletionProcess = result.value;
        expect(identityDeletionProcess).toStrictEqual(initiatedIdentityDeletionProcess);
    });

    test("should get an Identity deletion process specifying an id", async function () {
        const initiateResult = await transportService.identityDeletionProcesses.initiateIdentityDeletionProcess();
        const initiatedIdentityDeletionProcess = initiateResult.value;

        const result = await transportService.identityDeletionProcesses.getIdentityDeletionProcess({ id: initiatedIdentityDeletionProcess.id });
        expect(result).toBeSuccessful();

        const identityDeletionProcess = result.value;
        expect(identityDeletionProcess).toStrictEqual(initiatedIdentityDeletionProcess);
    });

    test("should cancel an Identity deletion process", async function () {
        await transportService.identityDeletionProcesses.initiateIdentityDeletionProcess();
        const result = await transportService.identityDeletionProcesses.cancelIdentityDeletionProcess();
        expect(result).toBeSuccessful();

        const cancelledIdentityDeletionProcess = result.value;
        expect(cancelledIdentityDeletionProcess.status).toBe(IdentityDeletionProcessStatus.Cancelled);
    });

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
});
