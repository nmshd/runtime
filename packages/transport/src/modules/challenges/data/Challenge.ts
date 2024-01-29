import { serialize, type, validate } from "@js-soft/ts-serval";
import { CoreAddress, CoreDate, CoreId, CoreSerializable, ICoreId, ICoreSerializable } from "../../../core";

export interface IChallenge extends ICoreSerializable {
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
export class Challenge extends CoreSerializable implements IChallenge {
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
