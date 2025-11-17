import { ConsumptionController } from "../../../consumption/ConsumptionController.js";
import { IRequestItemProcessor } from "./IRequestItemProcessor.js";

export type RequestItemProcessorConstructor = new (consumptionController: ConsumptionController) => IRequestItemProcessor;
