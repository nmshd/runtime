import { serialize, type, validate } from "@js-soft/ts-serval";
import {
    AcceptResponseItem,
    AcceptResponseItemJSON,
    ErrorResponseItemJSON,
    IAcceptResponseItem,
    IResponse,
    IResponseItem,
    IResponseItemGroup,
    RejectResponseItemJSON,
    Response,
    ResponseItem,
    ResponseItemGroup,
    ResponseItemGroupJSON,
    ResponseItemJSON,
    ResponseItemResult,
    ResponseJSON,
    ResponseResult
} from "@nmshd/content";
import { CoreId } from "@nmshd/core-types";

interface ITestAcceptResponseItem extends IAcceptResponseItem {
    test: string;
}

@type("TestAcceptResponseItem")
class TestAcceptResponseItem extends AcceptResponseItem implements ITestAcceptResponseItem {
    @serialize()
    @validate()
    public test: string;

    public static override from(value: ITestAcceptResponseItem): TestAcceptResponseItem {
        return this.fromAny(value);
    }
}

describe("Response", function () {
    test("creates a Response and items from JSON", function () {
        const responseJSON = {
            "@type": "Response",
            result: ResponseResult.Accepted,
            requestId: "CNSREQ1",
            items: [
                {
                    "@type": "AcceptResponseItem",
                    result: ResponseItemResult.Accepted
                } as ResponseItemJSON,
                {
                    "@type": "ResponseItemGroup",
                    items: [
                        {
                            "@type": "AcceptResponseItem",
                            result: ResponseItemResult.Accepted
                        } as ResponseItemJSON
                    ]
                } as ResponseItemGroupJSON
            ]
        } as ResponseJSON;

        const response = Response.from(responseJSON);

        expect(response).toBeInstanceOf(Response);
        expect(response.items).toHaveLength(2);

        const outerResponseItem = response.items[0] as ResponseItem;
        const responseItemGroup = response.items[1] as ResponseItemGroup;
        expect(outerResponseItem).toBeInstanceOf(ResponseItem);
        expect(outerResponseItem).toBeInstanceOf(AcceptResponseItem);
        expect(responseItemGroup).toBeInstanceOf(ResponseItemGroup);

        expect(responseItemGroup.items).toHaveLength(1);
    });

    test("creates a Response and items from interface object", function () {
        const responseInterface = {
            "@type": "Response",
            result: ResponseResult.Accepted,
            requestId: CoreId.from("RES1"),
            items: [
                {
                    "@type": "AcceptResponseItem",
                    result: ResponseItemResult.Accepted
                } as IResponseItem,
                {
                    "@type": "ResponseItemGroup",
                    items: [
                        {
                            "@type": "AcceptResponseItem",
                            result: ResponseItemResult.Accepted
                        } as IResponseItem
                    ]
                } as IResponseItemGroup
            ]
        } as IResponse;

        const response = Response.from(responseInterface);

        expect(response).toBeInstanceOf(Response);
        expect(response.items).toHaveLength(2);

        const outerResponseItem = response.items[0] as ResponseItem;
        const responseItemGroup = response.items[1] as ResponseItemGroup;
        expect(outerResponseItem).toBeInstanceOf(ResponseItem);
        expect(outerResponseItem).toBeInstanceOf(AcceptResponseItem);
        expect(responseItemGroup).toBeInstanceOf(ResponseItemGroup);

        expect(responseItemGroup.items).toHaveLength(1);
    });

    test("keeps all properties during serialization and deserialization", function () {
        const responseJSON = {
            "@type": "Response",
            result: ResponseResult.Accepted,
            requestId: "CNSREQ1",
            items: [
                {
                    "@type": "RejectResponseItem",
                    result: ResponseItemResult.Rejected,
                    code: "SOME_REJECTION_CODE",
                    message: "Some rejection message"
                } as RejectResponseItemJSON,
                {
                    "@type": "ResponseItemGroup",
                    items: [
                        {
                            "@type": "ErrorResponseItem",
                            result: ResponseItemResult.Failed,
                            code: "SOME_ERROR_CODE",
                            message: "Some error message"
                        } as ErrorResponseItemJSON
                    ]
                } as ResponseItemGroupJSON
            ]
        } as ResponseJSON;

        const response = Response.from(responseJSON);

        const serializedRequest = response.toJSON();

        expect(serializedRequest).toStrictEqual(responseJSON);
    });

    test("must have at least one item", function () {
        const responseJSON = {
            "@type": "Response",
            result: ResponseResult.Accepted,
            requestId: "CNSREQ1",
            items: []
        } as ResponseJSON;

        const errorMessage = "*Response.items*may not be empty*";
        const regex = new RegExp(errorMessage.replace(/\*/g, ".*"));

        expect(() => Response.from(responseJSON)).toThrow(regex);
    });

    test("groups must have at least one item", function () {
        const responseJSON = {
            "@type": "Response",
            result: ResponseResult.Accepted,
            requestId: "CNSREQ1",
            items: [
                {
                    "@type": "ResponseItemGroup",
                    items: []
                } as ResponseItemGroupJSON
            ]
        } as ResponseJSON;

        const errorMessage = "*ResponseItemGroup.items*may not be empty*";
        const regex = new RegExp(errorMessage.replace(/\*/g, ".*"));

        expect(() => Response.from(responseJSON)).toThrow(regex);
    });

    test("allows an inherited AcceptResponseItem in the items", function () {
        const responseJSON = {
            "@type": "Response",
            result: ResponseResult.Accepted,
            requestId: "CNSREQ1",
            items: [
                {
                    "@type": "TestAcceptResponseItem",
                    result: ResponseItemResult.Accepted,
                    test: "test"
                } as ResponseItemJSON
            ]
        } as ResponseJSON;

        const response = Response.from(responseJSON);

        expect(response).toBeInstanceOf(Response);
        expect(response.items).toHaveLength(1);

        const responseItem = response.items[0] as ResponseItem;
        expect(responseItem).toBeInstanceOf(ResponseItem);
        expect(responseItem).toBeInstanceOf(AcceptResponseItem);
        expect(responseItem).toBeInstanceOf(TestAcceptResponseItem);

        expect((responseItem as TestAcceptResponseItem).test).toBe("test");
    });

    describe("Throws an error when a mandatory property is missing", function () {
        test("throws on missing requestId", function () {
            const responseJSON = {
                "@type": "Response",
                result: ResponseResult.Accepted,
                items: [
                    {
                        "@type": "AcceptResponseItem",
                        result: ResponseItemResult.Accepted
                    } as AcceptResponseItemJSON
                ]
            } as ResponseJSON;

            const errorMessage = "*Response.requestId*Value is not defined*";
            const regex = new RegExp(errorMessage.replace(/\*/g, ".*"));

            expect(() => Response.from(responseJSON)).toThrow(regex);
        });

        test("throws on missing response item status", function () {
            const responseJSON = {
                "@type": "Response",
                result: ResponseResult.Accepted,
                requestId: "CNSREQ1",
                items: [
                    {
                        "@type": "AcceptResponseItem"
                    } as ResponseItemJSON
                ]
            } as ResponseJSON;

            const errorMessage = "*ResponseItem.result*Value is not defined*";
            const regex = new RegExp(errorMessage.replace(/\*/g, ".*"));

            expect(() => Response.from(responseJSON)).toThrow(regex);
        });

        test("throws on missing error response content properties", function () {
            const jsonWithMissingErrorCode = {
                "@type": "Response",
                result: ResponseResult.Accepted,
                requestId: "CNSREQ1",
                items: [
                    {
                        "@type": "ErrorResponseItem",
                        result: ResponseItemResult.Failed,
                        message: "Some error message"
                    } as ErrorResponseItemJSON
                ]
            } as ResponseJSON;

            const errorMessage = "*ErrorResponseItem.code*Value is not defined*";
            const regex = new RegExp(errorMessage.replace(/\*/g, ".*"));

            expect(() => Response.from(jsonWithMissingErrorCode)).toThrow(regex);
        });

        test("error response content message is mandatory", function () {
            const jsonWithMissingErrorCode: ResponseJSON = {
                "@type": "Response",
                result: ResponseResult.Accepted,
                requestId: "CNSREQ1",
                items: [
                    {
                        "@type": "ErrorResponseItem",
                        result: ResponseItemResult.Failed,
                        code: "SOME_ERROR_CODE"
                    } as ErrorResponseItemJSON
                ]
            };

            const errorMessage = "*ErrorResponseItem.message*Value is not defined*";
            const regex = new RegExp(errorMessage.replace(/\*/g, ".*"));

            expect(() => Response.from(jsonWithMissingErrorCode)).toThrow(regex);
        });
    });
});
