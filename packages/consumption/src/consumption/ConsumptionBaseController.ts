import { ILogger } from "@js-soft/logging-abstractions";
import { Serializable } from "@js-soft/ts-serval";
import { TransportLoggerFactory } from "@nmshd/transport";
import { ConsumptionController } from "./ConsumptionController.js";
import { ConsumptionControllerName } from "./ConsumptionControllerName.js";

export class ConsumptionBaseController {
    protected _log: ILogger;
    public get log(): ILogger {
        return this._log;
    }

    public get parent(): ConsumptionController {
        return this._parent;
    }

    public constructor(
        controllerName: ConsumptionControllerName,
        protected _parent: ConsumptionController
    ) {
        this._log = TransportLoggerFactory.getLogger(controllerName);
    }

    public init(): Promise<this> {
        return Promise.resolve(this);
    }

    protected parseArray<T extends Serializable>(values: Object[], type: new () => T): T[] {
        return values.map((v) => {
            const parsed = (type as any).fromUnknown(v);
            if (!(parsed instanceof type)) throw new Error(`Parsed value is not an instance of ${type.name}`);

            return parsed;
        });
    }
}
