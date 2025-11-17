import { ConsumptionController } from "../../../consumption/ConsumptionController.js";
import { INotificationItemProcessor } from "./AbstractNotificationItemProcessor.js";

export type NotificationItemProcessorConstructor = new (consumptionController: ConsumptionController) => INotificationItemProcessor;
