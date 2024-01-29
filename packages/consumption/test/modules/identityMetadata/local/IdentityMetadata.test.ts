import { JSONWrapper } from "@js-soft/ts-serval";
import { CoreAddress, CoreId } from "@nmshd/transport";
import { IdentityMetadata } from "../../../../src";

describe("IdentityMetadata", function () {
    test("creates an object with CoreAddress as a scope", function () {
        const localNotification = IdentityMetadata.from({
            id: CoreId.from("anId"),
            value: {},
            reference: "id1"
        });

        expect(localNotification).toBeInstanceOf(IdentityMetadata);
        expect(localNotification.value).toBeInstanceOf(JSONWrapper);
        expect(localNotification.reference).toBeInstanceOf(CoreAddress);
    });
});
