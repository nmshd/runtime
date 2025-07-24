import { TransportServices } from "../../src";
import { establishRelationship, RuntimeServiceProvider } from "../lib";

const serviceProvider = new RuntimeServiceProvider();
let transportServices1: TransportServices;
let transportServices2: TransportServices;

beforeAll(async () => {
    const runtimeServices = await serviceProvider.launch(2);
    transportServices1 = runtimeServices[0].transport;
    transportServices2 = runtimeServices[1].transport;

    await establishRelationship(transportServices1, transportServices2);
}, 30000);
afterAll(async () => await serviceProvider.stop());

describe("sendBackboneNotification", function () {
    test("should be possible to send a backbone notification to an active relationship", async function () {
        const address = (await transportServices2.account.getIdentityInfo()).value.address.toString();

        const result = await transportServices1.backboneNotifications.sendBackboneNotification({ recipients: [address], code: "TestCode" });
        expect(result).toBeSuccessful();
    });

    describe("errors", function () {
        test.each([
            [["recipient1"], "error.runtime.validation.invalidPropertyValue"],
            [["did:e:localhost:dids:0000000000000000000000"], "error.transport.backboneNotifications.noActiveRelationshipFoundForRecipients"],
            [[], "error.transport.backboneNotifications.atLeastOneRecipientRequired"]
        ])("invalid recipients: %s", async function (recipients, errorCode) {
            const result = await transportServices1.backboneNotifications.sendBackboneNotification({ recipients, code: "aCode" });
            expect(result).toBeAnError(/.*/, errorCode);
        });

        test.each([
            ["", "error.transport.backboneNotifications.codeMustNotBeEmpty"],
            ["wrong", "error.platform.validation.notification.codeDoesNotExist"]
        ])("wrong code: %s", async function (code, errorCode) {
            const address = (await transportServices2.account.getIdentityInfo()).value.address.toString();
            const result = await transportServices1.backboneNotifications.sendBackboneNotification({ recipients: [address], code });
            expect(result).toBeAnError(/.*/, errorCode);
        });
    });
});
