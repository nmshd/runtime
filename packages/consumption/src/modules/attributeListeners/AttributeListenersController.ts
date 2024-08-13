import { EventBus } from "@js-soft/ts-utils";
import { CoreAddress, CoreId, SynchronizedCollection } from "@nmshd/transport";
import { ConsumptionBaseController } from "../../consumption/ConsumptionBaseController";
import { ConsumptionController } from "../../consumption/ConsumptionController";
import { ConsumptionControllerName } from "../../consumption/ConsumptionControllerName";
import { ConsumptionIds } from "../../consumption/ConsumptionIds";
import { AttributeListenerCreatedEvent } from "./events";
import { CreateLocalAttributeListenerParams, ICreateLocalAttributeListenerParams } from "./local/CreateLocalAttributeListenerParams";
import { LocalAttributeListener } from "./local/LocalAttributeListener";

export class AttributeListenersController extends ConsumptionBaseController {
    private attributeListeners: SynchronizedCollection;

    public constructor(
        parent: ConsumptionController,
        private readonly eventBus: EventBus,
        private readonly identity: { address: CoreAddress }
    ) {
        super(ConsumptionControllerName.AttributeListenersController, parent);
    }

    public override async init(): Promise<this> {
        await super.init();

        this.attributeListeners = await this.parent.accountController.getSynchronizedCollection("AttributeListeners");

        return this;
    }

    public async getAttributeListeners(query?: any): Promise<LocalAttributeListener[]> {
        const items = await this.attributeListeners.find(query);
        return this.parseArray(items, LocalAttributeListener);
    }

    public async getAttributeListener(id: CoreId): Promise<LocalAttributeListener | undefined> {
        const listener = await this.attributeListeners.read(id.toString());
        if (!listener) return;

        return LocalAttributeListener.from(listener);
    }

    public async createAttributeListener(params: ICreateLocalAttributeListenerParams): Promise<LocalAttributeListener> {
        const parsedParams = CreateLocalAttributeListenerParams.from(params);

        const listener = LocalAttributeListener.from({
            id: await ConsumptionIds.attributeListener.generate(),
            query: parsedParams.query,
            peer: parsedParams.peer
        });

        await this.attributeListeners.create(listener);
        this.eventBus.publish(new AttributeListenerCreatedEvent(this.identity.address.toString(), listener));

        return listener;
    }

    public async deletePeerAttributeListeners(peerAddress: CoreAddress): Promise<void> {
        const listenerDocs = await this.attributeListeners.find({ peer: peerAddress.toString() });
        const listeners = this.parseArray(listenerDocs, LocalAttributeListener);

        for (const listener of listeners) {
            await this.attributeListeners.delete(listener);
        }
    }
}
