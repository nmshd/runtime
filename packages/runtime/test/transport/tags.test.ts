import { ClientResult, TagClient } from "@nmshd/transport";
import { RuntimeServiceProvider, TestRuntimeServices } from "../lib";
import { RestClientMocker } from "../lib/RestClientMocker";

const serviceProvider = new RuntimeServiceProvider();
let runtimeService: TestRuntimeServices;

let clientMocker: RestClientMocker<TagClient>;

beforeAll(async () => {
    runtimeService = (await serviceProvider.launch(1))[0];
    const client = (runtimeService.transport.tags as any).getTagsUseCase.tagController.client as TagClient;
    clientMocker = new RestClientMocker(client);
}, 30000);

afterAll(() => serviceProvider.stop());

afterEach(() => {
    clientMocker.restore();
});

describe("Tags", function () {
    /* eslint-disable @typescript-eslint/naming-convention */
    const mockTags = {
        supportedLanguages: ["de", "en"],
        tagsForAttributeValueTypes: {
            IdentityFileReference: {
                schulabschluss: {
                    displayNames: {
                        de: "Abschluss",
                        en: "Degree"
                    },
                    children: {
                        realschule: {
                            displayNames: {
                                de: "Realschule",
                                en: "Secondary School"
                            },
                            children: {
                                zeugnis: {
                                    displayNames: {
                                        de: "Zeugnis",
                                        en: "Diploma"
                                    }
                                }
                            }
                        },
                        gymnasium: {
                            displayNames: {
                                de: "Gymnasium",
                                en: "High School"
                            },
                            children: {
                                zeugnis: {
                                    displayNames: {
                                        de: "Zeugnis",
                                        en: "Diploma"
                                    }
                                }
                            }
                        }
                    }
                }
            },
            PhoneNumber: {
                notfall: {
                    displayNames: {
                        de: "Notfallkontakt",
                        en: "Emergency Contact"
                    }
                }
            },
            StreetAddress: {
                lieferung: {
                    displayNames: {
                        de: "Lieferadresse",
                        en: "Deliver Address"
                    }
                },
                heimat: {
                    displayNames: {
                        de: "Heimatadresse",
                        en: "Home Address"
                    }
                }
            }
        }
    };
    /* eslint-enable @typescript-eslint/naming-convention */

    test("should receive the legal tags from the Backbone", async function () {
        clientMocker.mockMethod("getTags", () => {
            return ClientResult.ok(mockTags);
        });
        const tags = await runtimeService.transport.tags.getTags();

        expect(tags.value).toStrictEqual(mockTags);
    });
});
