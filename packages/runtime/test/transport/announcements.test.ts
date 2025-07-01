import { CoreDate, LanguageISO639 } from "@nmshd/core-types";
import { AnnouncementSeverity } from "@nmshd/transport";
import { RuntimeServiceProvider, TestRuntimeServices } from "../lib";
import { createAnnouncement } from "../lib/AdminApiClient";

const serviceProvider = new RuntimeServiceProvider();
let client: TestRuntimeServices;

beforeAll(async () => {
    const runtimeServices = await serviceProvider.launch(1);
    client = runtimeServices[0];
}, 30000);

beforeEach(() => {
    client.eventBus.reset();
});

afterAll(() => serviceProvider.stop());

describe("Announcements", () => {
    test("get announcements", async () => {
        const idOfCreatedAnnouncement = await createTestAnnouncement();

        const getAnnouncementsResult = await client.transport.announcements.getAnnouncements({ language: LanguageISO639.en });
        expect(getAnnouncementsResult).toBeSuccessful();

        const announcement = getAnnouncementsResult.value.find((a) => a.id === idOfCreatedAnnouncement);

        expect(announcement).toBeDefined();

        expect(announcement!.actions).toHaveLength(1);
    });

    async function createTestAnnouncement(): Promise<string> {
        const response = await createAnnouncement({
            expiresAt: CoreDate.utc().add({ days: 1 }).toISOString(),
            severity: AnnouncementSeverity.High,
            isSilent: false,
            texts: [
                {
                    language: "en",
                    title: "English Title",
                    body: "English Body"
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
        return response.id;
    }
});
