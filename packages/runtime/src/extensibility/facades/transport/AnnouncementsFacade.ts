import { Result } from "@js-soft/ts-utils";
import { Inject } from "@nmshd/typescript-ioc";
import { AnnouncementDTO } from "../../../types";
import { GetAnnouncementsRequest, GetAnnouncementsUseCase } from "../../../useCases";

export class AnnouncementsFacade {
    public constructor(@Inject private readonly getAnnouncementsUseCase: GetAnnouncementsUseCase) {}

    public async getAnnouncements(request: GetAnnouncementsRequest): Promise<Result<AnnouncementDTO[]>> {
        return await this.getAnnouncementsUseCase.execute(request);
    }
}
