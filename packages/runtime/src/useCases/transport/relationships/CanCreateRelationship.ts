import { Serializable } from "@js-soft/ts-serval";
import { Result } from "@js-soft/ts-utils";
import { ArbitraryRelationshipCreationContent, RelationshipCreationContent } from "@nmshd/content";
import { CoreId } from "@nmshd/core-types";
import { RelationshipsController, RelationshipTemplate, RelationshipTemplateController } from "@nmshd/transport";
import { Inject } from "@nmshd/typescript-ioc";
import { RuntimeErrors, UseCase } from "../../common";
import { CreateRelationshipRequest } from "./CreateRelationship";

export type CanCreateRelationshipResponse =
    | { isSuccess: true }
    | {
          isSuccess: false;
          code: string;
          message: string;
      };

export class CanCreateRelationshipUseCase extends UseCase<CreateRelationshipRequest, CanCreateRelationshipResponse> {
    public constructor(
        @Inject private readonly relationshipController: RelationshipsController,
        @Inject private readonly relationshipTemplateController: RelationshipTemplateController
    ) {
        super();
    }

    protected async executeInternal(request: CreateRelationshipRequest): Promise<Result<CanCreateRelationshipResponse>> {
        const template = await this.relationshipTemplateController.getRelationshipTemplate(CoreId.from(request.templateId));
        if (!template) {
            const error = RuntimeErrors.general.recordNotFound(RelationshipTemplate);
            return Result.ok({ isSuccess: false, code: error.code, message: error.message });
        }

        if (!template.cache) {
            const error = RuntimeErrors.general.cacheEmpty(RelationshipTemplate, template.id.toString());
            return Result.ok({ isSuccess: false, code: error.code, message: error.message });
        }

        const transformedCreationContent = Serializable.fromUnknown(request.creationContent);
        if (!(transformedCreationContent instanceof ArbitraryRelationshipCreationContent || transformedCreationContent instanceof RelationshipCreationContent)) {
            const error = RuntimeErrors.general.invalidPropertyValue(
                "The creationContent of a Relationship must either be an ArbitraryRelationshipCreationContent or a RelationshipCreationContent."
            );
            return Result.ok({ isSuccess: false, code: error.code, message: error.message });
        }

        const canSendRelationship = await this.relationshipController.canSendRelationship({ creationContent: request.creationContent, template });
        if (canSendRelationship.isError) return Result.ok({ isSuccess: false, code: canSendRelationship.error.code, message: canSendRelationship.error.reason });

        return Result.ok({ isSuccess: true });
    }
}
