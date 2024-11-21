import { Result } from "@js-soft/ts-utils";
import { PublicRelationshipTemplateReferencesController } from "@nmshd/transport";
import { Inject } from "@nmshd/typescript-ioc";
import { PublicRelationshipTemplateReferenceDTO } from "../../../types/transport/PublicRelationshipTemplateReferenceDTO";
import { UseCase } from "../../common";
import { PublicRelationshipTemplateReferenceMapper } from "./PublicRelationshipTemplateReferenceMapper";

export class GetPublicRelationshipTemplateReferencesUseCase extends UseCase<void, PublicRelationshipTemplateReferenceDTO[]> {
    public constructor(@Inject private readonly publicRelationshipTemplateReferencesController: PublicRelationshipTemplateReferencesController) {
        super();
    }

    protected async executeInternal(): Promise<Result<PublicRelationshipTemplateReferenceDTO[]>> {
        const publicRelationshipTemplateReferences = await this.publicRelationshipTemplateReferencesController.getPublicRelationshipTemplateReferences();
        const templateReferences = PublicRelationshipTemplateReferenceMapper.toPublicRelationshipTemplateReferenceDTOList(publicRelationshipTemplateReferences);

        return Result.ok(templateReferences);
    }
}
