import { UserfriendlyApplicationError } from "@nmshd/app-runtime/src/UserfriendlyApplicationError";
import { AttributesController } from "@nmshd/consumption";
import { BirthDate } from "@nmshd/content";
import { CreateRepositoryAttributeRequest } from "@nmshd/runtime/src/useCases/consumption/attributes/CreateRepositoryAttribute";
import { RuntimeServiceProvider, TestRuntimeServices } from "@nmshd/runtime/test/lib";
import { CoreId } from "@nmshd/transport";

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

describe("creation of RepositoryAttributes of type BirthDate", () => {
    afterAll(async function () {
        await cleanupAttributes();
    });

    describe(BirthDate.name, () => {
        test("can create a RepositoryAttribute of type BirthDate", async function () {
            const request: CreateRepositoryAttributeRequest = {
                content: {
                    value: {
                        "@type": "BirthDate",
                        day: 1,
                        month: 12,
                        year: 1990
                    }
                }
            };

            const result = await services1.consumption.attributes.createRepositoryAttribute(request);

            expect(result).toBeSuccessful();
        });

        test("returns an error when trying to create an invalid BirthDate with violated validation criteria of a single property", async function () {
            const request: CreateRepositoryAttributeRequest = {
                content: {
                    value: {
                        "@type": "BirthDate",
                        day: 1,
                        month: 13,
                        year: 1990
                    }
                }
            };

            const result = await services1.consumption.attributes.createRepositoryAttribute(request);

            expect(result.isError).toBe(true);
            expect(UserfriendlyApplicationError.fromError(result.error).code).toBe("error.runtime.requestDeserialization");
            expect(UserfriendlyApplicationError.fromError(result.error).message).toBe("BirthMonth.value:Number :: must be an integer value between 1 and 12");
        });

        test("returns an error when trying to create an invalid BirthDate with cross-component violated validation criteria for June", async function () {
            const request: CreateRepositoryAttributeRequest = {
                content: {
                    value: {
                        "@type": "BirthDate",
                        day: 31,
                        month: 6,
                        year: 1990
                    }
                }
            };

            const result = await services1.consumption.attributes.createRepositoryAttribute(request);

            expect(result.isError).toBe(true);
            expect(UserfriendlyApplicationError.fromError(result.error).code).toBe("error.runtime.requestDeserialization");
            expect(UserfriendlyApplicationError.fromError(result.error).message).toBe("BirthDate.day, BirthDate.month or BirthDate.year :: The BirthDate is not a valid date.");
        });

        test("returns an error when trying to create an invalid BirthDate with cross-component violated validation criteria for February", async function () {
            const request: CreateRepositoryAttributeRequest = {
                content: {
                    value: {
                        "@type": "BirthDate",
                        day: 29,
                        month: 2,
                        year: 2010
                    }
                }
            };

            const result = await services1.consumption.attributes.createRepositoryAttribute(request);

            expect(result.isError).toBe(true);
            expect(UserfriendlyApplicationError.fromError(result.error).code).toBe("error.runtime.requestDeserialization");
            expect(UserfriendlyApplicationError.fromError(result.error).message).toBe("BirthDate.day, BirthDate.month or BirthDate.year :: The BirthDate is not a valid date.");
        });
    });
});
