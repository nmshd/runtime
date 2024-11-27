import { ClientResult, TagClient } from "@nmshd/transport";
import { reset, spy, when } from "ts-mockito";
import { RuntimeServiceProvider, TestRuntimeServices } from "../lib";

const serviceProvider = new RuntimeServiceProvider();
let runtimeService: TestRuntimeServices;

let mockedRestClient: TagClient;

beforeAll(async () => {
    runtimeService = (await serviceProvider.launch(1))[0];
    const client = runtimeService.transport.tags["getTagsUseCase"]["tagController"]["client"] as TagClient;
    mockedRestClient = spy(client);
}, 30000);

afterAll(() => serviceProvider.stop());

afterEach(() => {
    reset(mockedRestClient);
});

describe("Tags", function () {
    /* eslint-disable @typescript-eslint/naming-convention */
    const mockTags = {
        supportedLanguages: ["de", "en"],
        tagsForAttributeValueTypes: {
            PhoneNumber: {
                emergency: {
                    displayNames: {
                        de: "Notfallkontakt",
                        en: "Emergency Contact"
                    },
                    children: {
                        first: {
                            displayNames: {
                                de: "Erster Notfallkontakt",
                                en: "First Emergency Contact"
                            }
                        },
                        second: {
                            displayNames: {
                                de: "Zweiter Notfallkontakt",
                                en: "Second Emergency Contact"
                            }
                        }
                    }
                },
                private: {
                    displayNames: {
                        de: "Privat",
                        en: "Private"
                    }
                }
            }
        }
    };
    /* eslint-enable @typescript-eslint/naming-convention */

    test("should receive the legal tags from the Backbone", async function () {
        when(mockedRestClient.getTags()).thenResolve(ClientResult.ok(mockTags));
        const tags = await runtimeService.transport.tags.getTags();

        expect(tags.value).toStrictEqual(mockTags);
    });
});
