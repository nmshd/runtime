import { AppRuntime } from "@nmshd/app-runtime";
import { FakeUIBridge, TestUtil } from "../lib/index.js";

let runtime: AppRuntime;

describe("UIBridge", function () {
    beforeAll(async function () {
        runtime = await TestUtil.createRuntime();
        await runtime.start();
    });

    afterAll(async function () {
        await runtime.stop();
    });

    test("returns the same UIBridge for concurrent calls", async function () {
        const promises = [runtime.uiBridge(), runtime.uiBridge()];

        runtime.registerUIBridge(new FakeUIBridge());

        // eslint-disable-next-line @typescript-eslint/await-thenable
        const results = await Promise.all(promises);
        for (const bridge of results) expect(bridge).toBeInstanceOf(FakeUIBridge);
    });

    test("returns a UIBridge for subsequent calls", async function () {
        const bridge = await runtime.uiBridge();
        expect(bridge).toBeInstanceOf(FakeUIBridge);
    });
});
