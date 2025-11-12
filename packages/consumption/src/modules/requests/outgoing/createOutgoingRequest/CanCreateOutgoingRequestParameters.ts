import { ISerializable, Serializable, serialize, type, validate } from "@js-soft/ts-serval";
import { Request } from "@nmshd/content";
import { CoreAddress, ICoreAddress } from "@nmshd/core-types";
import { IRequestWithoutId, RequestJSONWithoutId } from "./CreateOutgoingRequestParameters.js";

export interface ICanCreateOutgoingRequestParameters extends ISerializable {
    content: IRequestWithoutId | RequestJSONWithoutId;
    peer?: ICoreAddress | string;
}

@type("CanCreateOutgoingRequestParameters")
export class CanCreateOutgoingRequestParameters extends Serializable implements ICanCreateOutgoingRequestParameters {
    @serialize()
    @validate()
    public content: Request;

    @serialize()
    @validate({ nullable: true })
    public peer?: CoreAddress;

    public static from(value: ICanCreateOutgoingRequestParameters): CanCreateOutgoingRequestParameters {
        return this.fromAny(value);
    }
}
