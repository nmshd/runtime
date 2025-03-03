import { serialize, type, validate } from "@js-soft/ts-serval";
import { IRequestItem, RequestItem, RequestItemJSON } from "@nmshd/content";

export interface TestRequestItemJSON extends RequestItemJSON {
    shouldFailAtCanAccept?: true;
    shouldFailAtCanReject?: true;
    shouldFailAtCanCreateOutgoingRequestItem?: true;
    shouldFailAtCanApplyIncomingResponseItem?: true;
    shouldThrowOnAccept?: true;
    shouldThrowOnReject?: true;
}

export interface ITestRequestItem extends IRequestItem {
    shouldFailAtCanAccept?: true;
    shouldFailAtCanReject?: true;
    shouldFailAtCanCreateOutgoingRequestItem?: true;
    shouldFailAtCanApplyIncomingResponseItem?: true;
    shouldThrowOnAccept?: true;
    shouldThrowOnReject?: true;
}

@type("TestRequestItem")
export class TestRequestItem extends RequestItem implements ITestRequestItem {
    @serialize()
    @validate({ nullable: true })
    public shouldFailAtCanAccept?: true;

    @serialize()
    @validate({ nullable: true })
    public shouldFailAtCanReject?: true;

    @serialize()
    @validate({ nullable: true })
    public shouldFailAtCanCreateOutgoingRequestItem?: true;

    @serialize()
    @validate({ nullable: true })
    public shouldFailAtCanApplyIncomingResponseItem?: true;

    @serialize()
    @validate({ nullable: true })
    public shouldFailAtCheckPrerequisitesOfIncomingRequestItem?: true;

    @serialize()
    @validate({ nullable: true })
    public shouldThrowOnAccept?: true;

    @serialize()
    @validate({ nullable: true })
    public shouldThrowOnReject?: true;

    public static from(value: ITestRequestItem): TestRequestItem {
        return this.fromAny(value);
    }
}
