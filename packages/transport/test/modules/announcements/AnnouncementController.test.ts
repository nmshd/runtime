import { IDatabaseConnection } from "@js-soft/docdb-access-abstractions";
import { CoreAddress, CoreDate, CoreId, LanguageISO639 } from "@nmshd/core-types";
import { AccountController, Transport } from "../../../src";
import { AnnouncementSeverity } from "../../../src/modules/announcements/data/Announcement";
import { AdminApiClient } from "../../testHelpers/AdminApiClient";
import { TestUtil } from "../../testHelpers/TestUtil";

describe("AnnouncementController", function () {
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

            const announcements = await mainAccountController.announcements.getAnnouncements(LanguageISO639.en);

            const containsCreatedAnnouncement = announcements.some((a) => a.id.equals(idOfCreatedAnnouncement));
            expect(containsCreatedAnnouncement).toBeTruthy();

            const announcement = announcements.find((a) => a.id.equals(idOfCreatedAnnouncement))!;
            expect(announcement.actions).toHaveLength(1);
        });

        test("returns announcements in correct language", async function () {
            const idOfCreatedAnnouncement = await createAnnouncement();

            const announcements = await mainAccountController.announcements.getAnnouncements(LanguageISO639.de);

            const createdAnnouncement = announcements.find((a) => a.id.equals(idOfCreatedAnnouncement))!;
            expect(createdAnnouncement.title).toBe("Deutscher Titel");
        });

        test("returns announcements in English if passed language does not exist", async function () {
            const idOfCreatedAnnouncement = await createAnnouncement();

            const announcements = await mainAccountController.announcements.getAnnouncements(LanguageISO639.aa);

            const createdAnnouncement = announcements.find((a) => a.id.equals(idOfCreatedAnnouncement))!;
            expect(createdAnnouncement.title).toBe("English Title");
        });

        test("returns identity specific announcements created for own identity", async function () {
            const idOfCreatedAnnouncement = await createAnnouncement(mainAccountController.identity.address);

            const announcements = await mainAccountController.announcements.getAnnouncements(LanguageISO639.en);

            const containsCreatedAnnouncement = announcements.some((a) => a.id.equals(idOfCreatedAnnouncement));
            expect(containsCreatedAnnouncement).toBeTruthy();
        });

        test("does not return identity specific announcements created for other identities", async function () {
            const idOfCreatedAnnouncement = await createAnnouncement(otherAccountController.identity.address);

            const announcements = await mainAccountController.announcements.getAnnouncements(LanguageISO639.en);

            const containsCreatedAnnouncement = announcements.some((a) => a.id.equals(idOfCreatedAnnouncement));
            expect(containsCreatedAnnouncement).toBeFalsy();
        });

        async function createAnnouncement(forIdentity?: CoreAddress): Promise<CoreId> {
            const response = await AdminApiClient.createAnnouncement({
                expiresAt: CoreDate.utc().add({ days: 1 }).toISOString(),
                severity: AnnouncementSeverity.High,
                isSilent: false,
                recipients: forIdentity ? [forIdentity.toString()] : [],
                texts: [
                    {
                        language: LanguageISO639.en,
                        title: "English Title",
                        body: "English Body"
                    },
                    {
                        language: LanguageISO639.de,
                        title: "Deutscher Titel",
                        body: "Deutscher Body"
                    }
                ],
                actions: [
                    {
                        displayName: {
                            en: "English Action Display Name",
                            de: "Deutscher Action Anzeigename"
                        },
                        link: "https://example.com/some-action"
                    }
                ]
            });
            return CoreId.from(response.id);
        }
    });
});
