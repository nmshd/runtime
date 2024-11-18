import { Result } from "@js-soft/ts-utils";
import { PublicRelationshipTemplateReferenceController } from "@nmshd/transport";
import { Inject } from "@nmshd/typescript-ioc";
import { PublicRelationshipTemplateReferenceDTO } from "../../../types/transport/PublicRelationshipTemplateReferenceDTO";
import { UseCase } from "../../common";

export class GetPublicRelationshipTemplateReferencesUseCase extends UseCase<void, PublicRelationshipTemplateReferenceDTO[]> {
    public constructor(@Inject private readonly publicRelationshipTemplateReferenceController: PublicRelationshipTemplateReferenceController) {
        super();
    }

    protected async executeInternal(): Promise<Result<PublicRelationshipTemplateReferenceDTO[]>> {
        const templateReferences = await this.publicRelationshipTemplateReferenceController.getPublicRelationshipTemplateReferences();

        return Result.ok(templateReferences);
    }
}
