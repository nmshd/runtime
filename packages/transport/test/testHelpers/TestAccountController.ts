import { AccountController, ChangedItems } from "../../src";
import { TestEventBus } from "./TestEventBus";

export class TestAccountController extends AccountController {
    public override async syncDatawallet(force = false): Promise<void> {
        await super.syncDatawallet(force);
        await this.waitForRunningEventHandlers();
    }

    public override async syncEverything(): Promise<ChangedItems> {
        const changedItems = await super.syncEverything();
        await this.waitForRunningEventHandlers();
        return changedItems;
    }

    public override async close(): Promise<void> {
        await this.waitForRunningEventHandlers();
        await super.close();
    }

    private async waitForRunningEventHandlers(): Promise<void> {
        if (!(this.transport.eventBus instanceof TestEventBus)) return;
        await this.transport.eventBus.waitForRunningEventHandlers();
    }
}
