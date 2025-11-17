import { Response, ResponseItemJSON, ResponseItemResult, ResponseJSON, ResponseResult, ResponseWrapper } from "@nmshd/content";
import { CoreId } from "@nmshd/core-types";

describe("ResponseWrapper", function () {
    const response = Response.from({
        "@type": "Response",
        result: ResponseResult.Accepted,
        requestId: "CNSREQ1",
        items: [
            {
                "@type": "AcceptResponseItem",
                result: ResponseItemResult.Accepted
            } as ResponseItemJSON
        ]
    } as ResponseJSON);

    test("creates a ResponseWrapper with requestSourceType 'Message'", function () {
        const wrapper = ResponseWrapper.from({
            requestId: CoreId.from("aCoreId"),
            requestSourceReference: CoreId.from("aCoreId"),
            requestSourceType: "Message",
            response
        });

        expect(wrapper).toBeInstanceOf(ResponseWrapper);
        expect(wrapper.response).toBeInstanceOf(Response);
    });

    test("creates a ResponseWrapper with requestSourceType 'RelationshipTemplate'", function () {
        const wrapper = ResponseWrapper.from({
            requestId: CoreId.from("aCoreId"),
            requestSourceReference: CoreId.from("aCoreId"),
            requestSourceType: "RelationshipTemplate",
            response
        });

        expect(wrapper).toBeInstanceOf(ResponseWrapper);
        expect(wrapper.response).toBeInstanceOf(Response);
    });

    test("throws when creating a ResponseWrapper with an invalid requestSourceType", function () {
        expect(() =>
            ResponseWrapper.from({
                requestId: CoreId.from("aCoreId"),
                requestSourceReference: CoreId.from("aCoreId"),
                // @ts-expect-error
                requestSourceType: "M",
                response
            })
        ).toThrow("Value is not within the list of allowed values");
    });
});
