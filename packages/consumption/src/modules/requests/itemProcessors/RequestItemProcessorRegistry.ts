import { RequestItem } from "@nmshd/content";
import { ConsumptionController } from "../../../consumption/ConsumptionController.js";
import { ConsumptionError } from "../../../consumption/ConsumptionError.js";
import { IRequestItemProcessor } from "./IRequestItemProcessor.js";
import { RequestItemConstructor } from "./RequestItemConstructor.js";
import { RequestItemProcessorConstructor } from "./RequestItemProcessorConstructor.js";

export class RequestItemProcessorRegistry {
    public constructor(
        private readonly consumptionController: ConsumptionController,
        private readonly processors = new Map<RequestItemConstructor, RequestItemProcessorConstructor>()
    ) {}

    public registerProcessor(itemConstructor: RequestItemConstructor, processorConstructor: RequestItemProcessorConstructor): void {
        if (this.processors.has(itemConstructor)) {
            throw new ConsumptionError(`There is already a processor registered for '${itemConstructor.name}'. Use 'replaceProcessorForType' if you want to replace it.`);
        }
        this.processors.set(itemConstructor, processorConstructor);
    }

    public registerOrReplaceProcessor(itemConstructor: RequestItemConstructor, processorConstructor: RequestItemProcessorConstructor): void {
        this.processors.set(itemConstructor, processorConstructor);
    }

    public getProcessorForItem(item: RequestItem): IRequestItemProcessor {
        const constructor = this.processors.get(item.constructor as RequestItemConstructor);
        if (!constructor) {
            throw new ConsumptionError(`There was no processor registered for '${item.constructor.name}'.`);
        }
        return new constructor(this.consumptionController);
    }
}
