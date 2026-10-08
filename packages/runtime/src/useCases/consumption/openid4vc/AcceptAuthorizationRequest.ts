import { OpenId4VpResolvedAuthorizationRequest } from "@nmshd/content";
import { Result } from "@js-soft/ts-utils";
import { AttributesController, isVerifiableCredentialAttribute, LocalAttribute, OpenId4VcController } from "@nmshd/consumption";
import { CoreId } from "@nmshd/core-types";
import { Inject } from "@nmshd/typescript-ioc";
import { AttributeIdString, RuntimeErrors, SchemaRepository, SchemaValidator, UseCase } from "../../common";

export interface AbstractAcceptAuthorizationRequestRequest<T> {
    authorizationRequest: T;
    attributeId: AttributeIdString;
}

export interface AcceptAuthorizationRequestRequest extends AbstractAcceptAuthorizationRequestRequest<OpenId4VpResolvedAuthorizationRequest> {}

export interface AcceptAuthorizationRequestResponse {
    status: number;
    message: string;
}

class Validator extends SchemaValidator<AcceptAuthorizationRequestRequest> {
    public constructor(@Inject schemaRepository: SchemaRepository) {
        super(schemaRepository.getSchema("AcceptAuthorizationRequestRequest"));
    }
}

export class AcceptAuthorizationRequestUseCase extends UseCase<AcceptAuthorizationRequestRequest, AcceptAuthorizationRequestResponse> {
    public constructor(
        @Inject private readonly openId4VcController: OpenId4VcController,
        @Inject private readonly attributesController: AttributesController,
        @Inject validator: Validator
    ) {
        super(validator);
    }

    protected override async executeInternal(request: AcceptAuthorizationRequestRequest): Promise<Result<AcceptAuthorizationRequestResponse>> {
        const credential = await this.attributesController.getLocalAttribute(CoreId.from(request.attributeId));
        if (!isVerifiableCredentialAttribute(credential)) return Result.fail(RuntimeErrors.general.recordNotFound(LocalAttribute));

        const result = await this.openId4VcController.acceptAuthorizationRequest(request.authorizationRequest, credential);
        return Result.ok({ status: result.status, message: JSON.stringify(result.message ?? {}) });
    }
}
