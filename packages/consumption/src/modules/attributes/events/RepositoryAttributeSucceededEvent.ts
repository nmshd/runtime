import { TransportDataEvent } from "@nmshd/transport";
import { LocalAttribute } from "../local/LocalAttribute";
import { AttributeSucceededEventData } from "./AttributeSucceededEventData";

export class RepositoryAttributeSucceededEvent extends TransportDataEvent<AttributeSucceededEventData> {
    public static readonly namespace = "consumption.repositoryAttributeSucceded";

    public constructor(eventTargetAddress: string, predecessor: LocalAttribute, successor: LocalAttribute) {
        super(RepositoryAttributeSucceededEvent.namespace, eventTargetAddress, { predecessor, successor });
    }
}
