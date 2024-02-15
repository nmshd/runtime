import { AttributesController } from "@nmshd/consumption";
import { RuntimeServiceProvider, TestRuntimeServices } from "@nmshd/runtime/test/lib";
import { CoreId } from "@nmshd/transport";
import { BirthDate } from "../../src";

const runtimeServiceProvider = new RuntimeServiceProvider();

let services1: TestRuntimeServices;
let services1AttributeController: AttributesController;

beforeAll(async () => {
    const runtimeServices = await runtimeServiceProvider.launch(2, { enableRequestModule: true, enableDeciderModule: true, enableNotificationModule: true });

    services1 = runtimeServices[0];
    services1AttributeController = (services1.consumption.attributes as any).getAttributeUseCase.attributeController as AttributesController;
}, 30000);
afterAll(async () => await runtimeServiceProvider.stop());

beforeEach(() => {
    services1.eventBus.reset();
});

async function cleanupAttributes() {
    const services1AttributesResult = await services1.consumption.attributes.getAttributes({});
    for (const attribute of services1AttributesResult.value) {
        await services1AttributeController.deleteAttributeUnsafe(CoreId.from(attribute.id));
    }
}

describe("creation of IdentityAttributes with IdentityAttribute Value Type BirthDate", () => {
    afterAll(async function () {
        await cleanupAttributes();
    });

    describe(BirthDate, () => {
        test("can create a BirthDate", async function () {
            const result = await services1.consumption.attributes.createRepositoryAttribute({
                content: {
                    value: {
                        "@type": "BirthDate",
                        day: 1,
                        month: 12,
                        year: 1990
                    }
                }
            });

            expect(result).toBeSuccessful();
        });

        test("returns an error when trying to create an invalid BirthDate with violated validation criteria of a single property", async function () {
            const result = await services1.consumption.attributes.createRepositoryAttribute({
                content: {
                    value: {
                        "@type": "BirthDate",
                        day: 1,
                        month: 13,
                        year: 1990
                    }
                }
            });

            expect(result.isError).toBe(true);
        });

        test("returns an error when trying to create an invalid BirthDate with cross-component violated validation criteria", async function () {
            const result = await services1.consumption.attributes.createRepositoryAttribute({
                content: {
                    value: {
                        "@type": "BirthDate",
                        day: 31,
                        month: 2,
                        year: 1990
                    }
                }
            });

            expect(result.isError).toBe(true);
        });
    });
});
