import { TransportDataEvent } from "@nmshd/transport";
import { LocalAttribute } from "../local/attributeTypes";
import { AttributeSucceededEventData } from "./AttributeSucceededEventData";

// TODO: check if one AttributeSucceededEvent is sufficient
export class RepositoryAttributeSucceededEvent extends TransportDataEvent<AttributeSucceededEventData> {
    public static readonly namespace = "consumption.repositoryAttributeSucceeded";

    public constructor(eventTargetAddress: string, predecessor: LocalAttribute, successor: LocalAttribute) {
        super(RepositoryAttributeSucceededEvent.namespace, eventTargetAddress, { predecessor, successor });
    }
}
