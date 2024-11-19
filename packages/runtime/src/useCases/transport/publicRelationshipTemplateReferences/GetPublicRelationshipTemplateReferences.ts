import { Result } from "@js-soft/ts-utils";
import { PublicRelationshipTemplateReferencesController } from "@nmshd/transport";
import { Inject } from "@nmshd/typescript-ioc";
import { PublicRelationshipTemplateReferenceDTO } from "../../../types/transport/PublicRelationshipTemplateReferenceDTO";
import { UseCase } from "../../common";

export class GetPublicRelationshipTemplateReferencesUseCase extends UseCase<void, PublicRelationshipTemplateReferenceDTO[]> {
    public constructor(@Inject private readonly publicRelationshipTemplateReferencesController: PublicRelationshipTemplateReferencesController) {
        super();
    }

    protected async executeInternal(): Promise<Result<PublicRelationshipTemplateReferenceDTO[]>> {
        const templateReferences = await this.publicRelationshipTemplateReferencesController.getPublicRelationshipTemplateReferences();

        return Result.ok(templateReferences);
    }
}
