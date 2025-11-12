import { NotificationItem } from "@nmshd/content";
import { ConsumptionController } from "../../../consumption/ConsumptionController.js";
import { ConsumptionError } from "../../../consumption/ConsumptionError.js";
import { INotificationItemProcessor } from "./AbstractNotificationItemProcessor.js";
import { NotificationItemConstructor } from "./NotificationItemConstructor.js";
import { NotificationItemProcessorConstructor } from "./NotificationItemProcessorConstructor.js";

export class NotificationItemProcessorRegistry {
    public constructor(
        private readonly consumptionController: ConsumptionController,
        private readonly processors = new Map<NotificationItemConstructor, NotificationItemProcessorConstructor>()
    ) {}

    public registerProcessor(itemConstructor: NotificationItemConstructor, processorConstructor: NotificationItemProcessorConstructor): void {
        if (this.processors.has(itemConstructor)) {
            throw new ConsumptionError(`There is already a processor registered for '${itemConstructor.name}'. Use 'replaceProcessorForType' if you want to replace it.`);
        }
        this.processors.set(itemConstructor, processorConstructor);
    }

    public registerOrReplaceProcessor(itemConstructor: NotificationItemConstructor, processorConstructor: NotificationItemProcessorConstructor): void {
        this.processors.set(itemConstructor, processorConstructor);
    }

    public getProcessorForItem(item: NotificationItem): INotificationItemProcessor {
        const constructor = this.processors.get(item.constructor as NotificationItemConstructor);
        if (!constructor) {
            throw new ConsumptionError(`There was no processor registered for '${item.constructor.name}'.`);
        }
        return new constructor(this.consumptionController);
    }
}
