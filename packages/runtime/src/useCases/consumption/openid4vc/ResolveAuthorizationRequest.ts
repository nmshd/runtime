import { OpenId4VpResolvedAuthorizationRequest } from "@credo-ts/openid4vc";
import { Result } from "@js-soft/ts-utils";
import { OpenId4VcController } from "@nmshd/consumption";
import { LocalAttributeDTO } from "@nmshd/runtime-types";
import { Inject } from "@nmshd/typescript-ioc";
import stringifySafe from "json-stringify-safe";
import { SchemaRepository, SchemaValidator, UseCase } from "../../common";
import { AttributeMapper } from "../attributes";

export interface ResolveAuthorizationRequestRequest {
    authorizationRequestUrl: string;
}

export interface ResolveAuthorizationRequestResponse {
    authorizationRequest: OpenId4VpResolvedAuthorizationRequest; // tief darin enthaltene CredentialRecord-Klassen erhalten?
    usedCredentials: LocalAttributeDTO[];
}

class Validator extends SchemaValidator<ResolveAuthorizationRequestRequest> {
    public constructor(@Inject schemaRepository: SchemaRepository) {
        super(schemaRepository.getSchema("ResolveAuthorizationRequestRequest"));
    }
}

export class ResolveAuthorizationRequestUseCase extends UseCase<ResolveAuthorizationRequestRequest, ResolveAuthorizationRequestResponse> {
    public constructor(
        @Inject private readonly openId4VcController: OpenId4VcController,
        @Inject validator: Validator
    ) {
        super(validator);
    }

    protected override async executeInternal(request: ResolveAuthorizationRequestRequest): Promise<Result<ResolveAuthorizationRequestResponse>> {
        const result = await this.openId4VcController.resolveAuthorizationRequest(request.authorizationRequestUrl);

        return Result.ok({
            authorizationRequest: JSON.parse(stringifySafe(materializeGetters(result.authorizationRequest))),
            usedCredentials: AttributeMapper.toAttributeDTOList(result.usedCredentials)
        });
    }
}

type AnyObject = Record<string, any>;

export function materializeGetters<T>(input: T): T {
    return deepCloneWithoutGetters(input) as T;
}

function deepCloneWithoutGetters(obj: any): any {
    if (obj === null || typeof obj !== "object") return obj;

    if (Array.isArray(obj)) {
        return obj.map((item) => deepCloneWithoutGetters(item));
    }

    const clone: AnyObject = {};

    const descriptors = Object.getOwnPropertyDescriptors(obj);

    for (const [key, desc] of Object.entries(descriptors)) {
        if (typeof desc.get === "function") {
            // Replace getter with value
            try {
                const value = desc.get.call(obj);
                clone[key] = deepCloneWithoutGetters(value);
            } catch {
                clone[key] = undefined;
            }
        } else if ("value" in desc) {
            clone[key] = deepCloneWithoutGetters(desc.value);
        } else {
            // Handle setter-only fields or weird descriptors
            clone[key] = undefined;
        }
    }

    return clone;
}
