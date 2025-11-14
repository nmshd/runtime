import { Result } from "@js-soft/ts-utils";
import { PublicRelationshipTemplateReferenceDTO } from "@nmshd/runtime-types";
import { Inject } from "@nmshd/typescript-ioc";
import { GetPublicRelationshipTemplateReferencesUseCase } from "../../../useCases/index.js";

export class PublicRelationshipTemplateReferencesFacade {
    public constructor(@Inject private readonly getPublicRelationshipTemplateReferencesUseCase: GetPublicRelationshipTemplateReferencesUseCase) {}

    public async getPublicRelationshipTemplateReferences(): Promise<Result<PublicRelationshipTemplateReferenceDTO[]>> {
        return await this.getPublicRelationshipTemplateReferencesUseCase.execute();
    }
}
