import { AppRuntime, LocalAccountDTO } from "../../src";
import { TestUtil } from "../lib";

let runtime: AppRuntime;

describe("MessageFacade", function () {
    let localAccount: LocalAccountDTO;

    beforeAll(async function () {
        runtime = await TestUtil.createRuntime();
        await runtime.start();

        localAccount = await runtime.accountServices.createAccount("Profil 1");
        await runtime.selectAccount(localAccount.id);
    });

    afterAll(async function () {
        await runtime.stop();
    });

    test("should return messages", async function () {
        const services = await runtime.getServices(localAccount.address!);
        const messages = await services.transportServices.messages.getMessages({ query: {} });
        expect(messages.isSuccess).toBeDefined();
        expect(messages.value.messages).toBeInstanceOf(Array);
        expect(messages.value.messageCount).toBeInstanceOf(Number);
    });
});
