import { ConsumptionController } from "../../../consumption/ConsumptionController";
import { IRequestItemProcessor } from "./IRequestItemProcessor";

export type RequestItemProcessorConstructor = new (consumptionController: ConsumptionController) => IRequestItemProcessor;
