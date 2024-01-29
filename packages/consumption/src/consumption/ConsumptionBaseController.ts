import { ILogger } from "@js-soft/logging-abstractions";
import { CoreSerializable, TransportLoggerFactory } from "@nmshd/transport";
import { ConsumptionController } from "./ConsumptionController";
import { ConsumptionControllerName } from "./ConsumptionControllerName";

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

    protected parseArray<T extends CoreSerializable>(values: Object[], type: new () => T): T[] {
        return values.map((v) => (type as any).fromAny(v));
    }
}
