import { ConsumptionController, GenericRequestItemProcessor, RequestItemProcessorRegistry } from "@nmshd/consumption";
import { AcceptResponseItem, IRequestItem, RejectResponseItem, RequestItem } from "@nmshd/content";
import { CoreAddress } from "@nmshd/core-types";
import { AccountController, IdentityController } from "@nmshd/transport";
import { TestUtil } from "../../core/TestUtil.js";
import { TestRequestItem } from "./testHelpers/TestRequestItem.js";

class TestRequestItemProcessor extends GenericRequestItemProcessor<TestRequestItem> {
    public override accept(): AcceptResponseItem {
        throw new Error("Method not implemented.");
    }

    public override reject(): RejectResponseItem {
        throw new Error("Method not implemented.");
    }
}

class TestRequestItemProcessor2 extends GenericRequestItemProcessor<TestRequestItem> {
    public override accept(): AcceptResponseItem {
        throw new Error("Method not implemented.");
    }

    public override reject(): RejectResponseItem {
        throw new Error("Method not implemented.");
    }
}

interface ITestRequestItemWithNoProcessor extends IRequestItem {}

class TestRequestItemWithNoProcessor extends RequestItem {
    public static from(value: ITestRequestItemWithNoProcessor): TestRequestItemWithNoProcessor {
        return this.fromAny(value);
    }
}

let registry: RequestItemProcessorRegistry;

const fakeConsumptionController = {
    accountController: {
        identity: { address: CoreAddress.from("anAddress") } as IdentityController
    } as AccountController
} as ConsumptionController;

beforeEach(function () {
    registry = new RequestItemProcessorRegistry(fakeConsumptionController);
});

describe("RequestItemProcessorRegistry", function () {
    test("can be created with a map of processors", function () {
        const registry = new RequestItemProcessorRegistry(fakeConsumptionController, new Map([[TestRequestItem, TestRequestItemProcessor]]));

        const processor = registry.getProcessorForItem(TestRequestItem.from({ mustBeAccepted: false }));
        expect(processor).toBeDefined();
    });

    test("registerProcessor can register processors", function () {
        expect(() => registry.registerProcessor(TestRequestItem, TestRequestItemProcessor)).not.toThrow();
    });

    test("registerProcessorForType throws exception when registering multiple processors for the same Request Item type", function () {
        registry.registerProcessor(TestRequestItem, TestRequestItemProcessor);
        TestUtil.expectThrows(() => registry.registerProcessor(TestRequestItem, TestRequestItemProcessor), "There is already a processor registered for 'TestRequestItem'*");
    });

    test("registerOrReplaceProcessor allows replacing registered processors", function () {
        registry.registerProcessor(TestRequestItem, TestRequestItemProcessor);
        registry.registerOrReplaceProcessor(TestRequestItem, TestRequestItemProcessor2);

        const processor = registry.getProcessorForItem(new TestRequestItem());

        expect(processor).toBeInstanceOf(TestRequestItemProcessor2);
    });

    test("getProcessorForItem returns an instance of the registered processor", function () {
        registry.registerProcessor(TestRequestItem, TestRequestItemProcessor);

        const item = TestRequestItem.from({
            mustBeAccepted: true
        });

        const processor = registry.getProcessorForItem(item);

        expect(processor).toBeDefined();
        expect(processor).toBeInstanceOf(TestRequestItemProcessor);
    });

    test("getProcessorForItem returns a new instance each time", function () {
        registry.registerProcessor(TestRequestItem, TestRequestItemProcessor);

        const item = TestRequestItem.from({
            mustBeAccepted: true
        });

        const processor1 = registry.getProcessorForItem(item);
        const processor2 = registry.getProcessorForItem(item);

        expect(processor1).not.toBe(processor2);
    });

    test("getProcessorForItem throws if no Processor was registered for the given Request Item", function () {
        registry.registerProcessor(TestRequestItem, TestRequestItemProcessor);

        const item = TestRequestItemWithNoProcessor.from({
            mustBeAccepted: true
        });

        TestUtil.expectThrows(() => registry.getProcessorForItem(item), "There was no processor registered for 'TestRequestItemWithNoProcessor'");
    });
});
