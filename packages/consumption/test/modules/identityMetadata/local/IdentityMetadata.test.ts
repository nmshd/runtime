import { JSONWrapper } from "@js-soft/ts-serval";
import { CoreAddress, CoreId } from "@nmshd/core-types";
import { IdentityMetadata } from "../../../../src";

describe("IdentityMetadata", function () {
    test("creates an object with CoreAddress as a scope", function () {
        const identityMetadata = IdentityMetadata.from({
            id: CoreId.from("anId"),
            value: {},
            reference: "id1"
        });

        expect(identityMetadata).toBeInstanceOf(IdentityMetadata);
        expect(identityMetadata.value).toBeInstanceOf(JSONWrapper);
        expect(identityMetadata.reference).toBeInstanceOf(CoreAddress);
    });
});
