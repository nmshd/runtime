import { Result } from "@js-soft/ts-utils";
import { LanguageISO639 } from "@nmshd/core-types";
import { AnnouncementDTO } from "@nmshd/runtime-types";
import { AnnouncementController } from "@nmshd/transport";
import { Inject } from "@nmshd/typescript-ioc";
import { SchemaRepository, SchemaValidator, UseCase } from "../../common";
import { AnnouncementMapper } from "./AnnouncementMapper";

export interface GetAnnouncementsRequest {
    language: LanguageISO639;
}

class Validator extends SchemaValidator<GetAnnouncementsRequest> {
    public constructor(@Inject schemaRepository: SchemaRepository) {
        super(schemaRepository.getSchema("GetAnnouncementsRequest"));
    }
}

export class GetAnnouncementsUseCase extends UseCase<GetAnnouncementsRequest, AnnouncementDTO[]> {
    public constructor(
        @Inject private readonly announcementController: AnnouncementController,
        @Inject validator: Validator
    ) {
        super(validator);
    }

    protected async executeInternal(request: GetAnnouncementsRequest): Promise<Result<AnnouncementDTO[]>> {
        const announcements = await this.announcementController.getAnnouncements(request.language);

        return Result.ok(announcements.map((a) => AnnouncementMapper.toAnnouncementDTO(a)));
    }
}
