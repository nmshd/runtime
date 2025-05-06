import { IDatabaseConnection } from "@js-soft/docdb-access-abstractions";
import { CoreAddress, CoreId } from "@nmshd/core-types";
import { AccountController, Transport } from "../../../src";
import { AnnouncementSeverity } from "../../../src/modules/announcements/data/Announcement";
import { AdminApiClient } from "../../testHelpers/AdminApiClient";
import { TestUtil } from "../../testHelpers/TestUtil";

describe("MessageController", function () {
    let connection: IDatabaseConnection;
    let transport: Transport;
    let mainAccountController: AccountController;
    let otherAccountController: AccountController;

    beforeAll(async function () {
        connection = await TestUtil.createDatabaseConnection();
        transport = TestUtil.createTransport();

        await transport.init();

        const accounts = await TestUtil.provideAccounts(transport, connection, 2);
        mainAccountController = accounts[0];
        otherAccountController = accounts[1];
    });

    afterAll(async function () {
        await mainAccountController.close();
        await connection.close();
    });

    describe("Getting announcements", function () {
        test("returns announcements created for all identities", async function () {
            const idOfCreatedAnnouncement = await createAnnouncement();

            const announcements = await mainAccountController.announcements.getAnnouncements("en");

            const containsCreatedAnnouncement = announcements.some((a) => a.id.equals(idOfCreatedAnnouncement));
            expect(containsCreatedAnnouncement).toBeTruthy();
        });

        test("returns announcements in correct language", async function () {
            const idOfCreatedAnnouncement = await createAnnouncement();

            const announcements = await mainAccountController.announcements.getAnnouncements("de");

            const createdAnnouncement = announcements.find((a) => a.id.equals(idOfCreatedAnnouncement))!;
            expect(createdAnnouncement.title).toBe("Deutscher Titel");
        });

        test("returns identity specific announcements created for own identity", async function () {
            const idOfCreatedAnnouncement = await createAnnouncement(mainAccountController.identity.address);

            const announcements = await mainAccountController.announcements.getAnnouncements("en");

            const containsCreatedAnnouncement = announcements.some((a) => a.id.equals(idOfCreatedAnnouncement));
            expect(containsCreatedAnnouncement).toBeTruthy();
        });

        test("does not return identity specific announcements created for other identities", async function () {
            const idOfCreatedAnnouncement = await createAnnouncement(otherAccountController.identity.address);

            const announcements = await mainAccountController.announcements.getAnnouncements("en");

            const containsCreatedAnnouncement = announcements.some((a) => a.id.equals(idOfCreatedAnnouncement));
            expect(containsCreatedAnnouncement).toBeFalsy();
        });

        async function createAnnouncement(forIdentity?: CoreAddress): Promise<CoreId> {
            const response = await AdminApiClient.createAnnouncement({
                expiresAt: "2100-01-01T00:00:00Z",
                severity: AnnouncementSeverity.High,
                recipients: forIdentity ? [forIdentity.toString()] : [],
                texts: [
                    {
                        language: "en",
                        title: "English Title",
                        body: "English Body"
                    },
                    {
                        language: "de",
                        title: "Deutscher Titel",
                        body: "Deutscher Body"
                    }
                ]
            });
            return CoreId.from(response.id);
        }
    });
});
