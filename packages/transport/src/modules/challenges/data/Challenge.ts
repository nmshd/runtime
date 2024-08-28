import { ISerializable, Serializable, serialize, type, validate } from "@js-soft/ts-serval";
import { CoreAddress, CoreDate, CoreId, ICoreId } from "@nmshd/core-types";

export interface IChallenge extends ISerializable {
    id: ICoreId;
    expiresAt: CoreDate;
    createdBy?: CoreAddress;
    createdByDevice?: CoreId;
    type: ChallengeType;
}

export enum ChallengeType {
    Identity = "Identity",
    Device = "Device",
    Relationship = "Relationship"
}

@type("Challenge")
export class Challenge extends Serializable implements IChallenge {
    @validate()
    @serialize()
    public id: CoreId;

    @validate()
    @serialize()
    public expiresAt: CoreDate;

    @validate({ nullable: true })
    @serialize()
    public createdBy?: CoreAddress;

    @validate({ nullable: true })
    @serialize()
    public createdByDevice?: CoreId;

    @validate()
    @serialize()
    public type: ChallengeType;

    public static from(value: IChallenge): Challenge {
        return this.fromAny(value);
    }
}
