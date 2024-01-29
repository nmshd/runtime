import { ConsumptionController } from "../../../consumption/ConsumptionController";
import { INotificationItemProcessor } from "./AbstractNotificationItemProcessor";

export type NotificationItemProcessorConstructor = new (consumptionController: ConsumptionController) => INotificationItemProcessor;
