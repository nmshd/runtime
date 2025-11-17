import { ConsumptionServices, GetDraftsQuery } from "@nmshd/runtime";
import { QueryParamConditions, RuntimeServiceProvider } from "../lib/index.js";

const runtimeServiceProvider = new RuntimeServiceProvider();
let consumptionServices: ConsumptionServices;

beforeAll(async () => {
    const runtimeServices = await runtimeServiceProvider.launch(1);
    consumptionServices = runtimeServices[0].consumption;
}, 30000);
afterAll(async () => await runtimeServiceProvider.stop());

describe("Drafts", () => {
    const content = { aKey: "a-Value" };

    test("should create a draft", async () => {
        const result = await consumptionServices.drafts.createDraft({ content: content, type: "test" });

        expect(result).toBeSuccessful();
    });

    test("should get the draft", async () => {
        const creationResult = await consumptionServices.drafts.createDraft({ content: content, type: "test" });

        expect(creationResult).toBeSuccessful();

        const draftId = creationResult.value.id;

        const getResult = await consumptionServices.drafts.getDraft({ id: draftId });
        expect(getResult).toBeSuccessful();

        const draft = getResult.value;
        expect(draft.content).toStrictEqual(content);
    });

    test("should have query the draft", async () => {
        const baselineNumberOfDrafts = (await consumptionServices.drafts.getDrafts({})).value.length;

        const creationResult = await consumptionServices.drafts.createDraft({ content: content, type: "test" });

        expect(creationResult).toBeSuccessful();

        const draftId = creationResult.value.id;

        const getResult = await consumptionServices.drafts.getDrafts({});
        expect(getResult).toBeSuccessful();

        const drafts = getResult.value;
        const numberOfDrafts = drafts.length;
        expect(numberOfDrafts - baselineNumberOfDrafts).toBe(1);

        expect(drafts[numberOfDrafts - 1].id).toStrictEqual(draftId);
    });

    test("should edit the draft", async () => {
        const creationResult = await consumptionServices.drafts.createDraft({ content: content, type: "test" });

        expect(creationResult).toBeSuccessful();

        const draftId = creationResult.value.id;

        const newContent = { aKey: "another-Value" };
        const updateResult = await consumptionServices.drafts.updateDraft({ id: draftId, content: newContent });
        expect(updateResult).toBeSuccessful();

        const getResult = await consumptionServices.drafts.getDraft({ id: draftId });
        expect(getResult).toBeSuccessful();

        const draft = getResult.value;
        expect(draft.content).toStrictEqual(newContent);
    });

    test("should delete the draft", async () => {
        const creationResult = await consumptionServices.drafts.createDraft({ content: content, type: "test" });

        expect(creationResult).toBeSuccessful();

        const draftId = creationResult.value.id;

        const baselineNumberOfDrafts = (await consumptionServices.drafts.getDrafts({})).value.length;
        const deleteResult = await consumptionServices.drafts.deleteDraft({ id: draftId });
        expect(deleteResult).toBeSuccessful();

        const getResult = await consumptionServices.drafts.getDrafts({});
        expect(getResult).toBeSuccessful();

        const drafts = getResult.value;
        const numberOfDrafts = drafts.length;
        expect(baselineNumberOfDrafts - numberOfDrafts).toBe(1);
    });
});

describe("Drafts query", () => {
    test("drafts can be queried by their attributes", async () => {
        const result = await consumptionServices.drafts.createDraft({ content: {}, type: "test" });

        expect(result).toBeSuccessful();

        const draft = result.value;

        const conditions = new QueryParamConditions<GetDraftsQuery, ConsumptionServices>(draft, consumptionServices)
            .addStringSet("type")
            .addDateSet("createdAt")
            .addDateSet("lastModifiedAt");

        await conditions.executeTests((c, q) => c.drafts.getDrafts({ query: q }));
    });
});
