/* eslint-disable @typescript-eslint/naming-convention -- Standard OpenID4VC and DCQL fields. */
import { OpenId4VpDcqlQuery, OpenId4VpResolvedAuthorizationRequest } from "@nmshd/content";
import { SchemaRepository } from "../../src/useCases/common/SchemaRepository";

const schemas = new SchemaRepository();
beforeAll(async () => await schemas.loadSchemas());

function authorizationRequest(query: OpenId4VpDcqlQuery): OpenId4VpResolvedAuthorizationRequest {
    return {
        version: 100,
        authorizationRequestPayload: {
            client_id: "https://verifier.example",
            nonce: "nonce",
            response_type: "vp_token",
            response_mode: "direct_post",
            response_uri: "https://verifier.example/response",
            dcql_query: query
        }
    };
}

test.each<{ format: string; query: OpenId4VpDcqlQuery }>([
    { format: "dc+sd-jwt", query: { credentials: [{ id: "credential", format: "dc+sd-jwt", meta: { vct_values: ["urn:test"] }, claims: [{ path: ["name"] }] }] } },
    {
        format: "mso_mdoc",
        query: {
            credentials: [{ id: "credential", format: "mso_mdoc", meta: { doctype_value: "org.iso.18013.5.1.mDL" }, claims: [{ path: ["org.iso.18013.5.1", "given_name"] }] }]
        }
    },
    {
        format: "jwt_vc_json",
        query: {
            credentials: [
                { id: "credential", format: "jwt_vc_json", meta: { type_values: [["VerifiableCredential", "TestCredential"]] }, claims: [{ path: ["credentialSubject", "name"] }] }
            ]
        }
    }
])("accepts JSON-roundtripped $format DCQL requests in the generated schema", ({ query }) => {
    const request = { authorizationRequest: authorizationRequest(query), attributeId: "ATT00000000000000000" };

    expect(schemas.getSchema("AcceptAuthorizationRequestRequest").validate(JSON.parse(JSON.stringify(request)))).toStrictEqual({ isValid: true, errors: undefined });
});

test("accepts DCQL claim and credential sets, wildcard paths and trusted authorities", () => {
    const query: OpenId4VpDcqlQuery = {
        credentials: [
            {
                id: "credential",
                format: "dc+sd-jwt",
                claims: [{ id: "name", path: ["names", null, 0, "name"], values: ["Alice", 42, true] }],
                claim_sets: [["name"]],
                trusted_authorities: [{ type: "aki", values: ["AQID"] }]
            }
        ],
        credential_sets: [{ options: [["credential"]], required: true, purpose: { description: "Test" } }]
    };

    expect(
        schemas.getSchema("AcceptAuthorizationRequestRequest").validate({ authorizationRequest: authorizationRequest(query), attributeId: "ATT00000000000000000" }).isValid
    ).toBe(true);
});

test.each([
    { credentials: {} },
    { credentials: [{ id: 42, format: "dc+sd-jwt" }] },
    { credentials: [{ id: "credential", format: "dc+sd-jwt", claims: [{ path: "name" }] }] },
    { credentials: [{ id: "credential", format: "dc+sd-jwt", meta: { vct_values: [42] } }] }
])("rejects malformed DCQL protocol fields in the generated schema: %j", (dcqlQuery) => {
    const resolved = authorizationRequest({ credentials: [] });
    const authorization = { ...resolved, authorizationRequestPayload: { ...resolved.authorizationRequestPayload, dcql_query: dcqlQuery } };

    expect(schemas.getSchema("AcceptAuthorizationRequestRequest").validate({ authorizationRequest: authorization, attributeId: "ATT00000000000000000" }).isValid).toBe(false);
});

test("rejects malformed display metadata on credential responses", () => {
    expect(
        schemas
            .getSchema("StoreCredentialsRequest")
            .validate({ credentialResponses: [{ claimFormat: "dc+sd-jwt", encoded: "credential", displayInformation: [{ logo: { uri: 42 } }] }] }).isValid
    ).toBe(false);
});
