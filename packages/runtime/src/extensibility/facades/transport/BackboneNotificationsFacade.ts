import { Result } from "@js-soft/ts-utils";
import { Inject } from "@nmshd/typescript-ioc";
import { SendBackboneNotificationRequest, SendBackboneNotificationUseCase } from "../../../useCases";

export class BackboneNotificationsFacade {
    public constructor(@Inject private readonly sendBackboneNotificationUseCase: SendBackboneNotificationUseCase) {}

    public async getAnnouncements(request: SendBackboneNotificationRequest): Promise<Result<void>> {
        return await this.sendBackboneNotificationUseCase.execute(request);
    }
}
