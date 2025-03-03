import { Result } from "@js-soft/ts-utils";
import { Inject } from "@nmshd/typescript-ioc";
import { PublicRelationshipTemplateReferenceDTO } from "../../../types";
import { GetPublicRelationshipTemplateReferencesUseCase } from "../../../useCases";

export class PublicRelationshipTemplateReferencesFacade {
    public constructor(@Inject private readonly getPublicRelationshipTemplateReferencesUseCase: GetPublicRelationshipTemplateReferencesUseCase) {}

    public async getPublicRelationshipTemplateReferences(): Promise<Result<PublicRelationshipTemplateReferenceDTO[]>> {
        return await this.getPublicRelationshipTemplateReferencesUseCase.execute();
    }
}
