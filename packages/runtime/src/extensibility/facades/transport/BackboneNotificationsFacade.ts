import { Result } from "@js-soft/ts-utils";
import { Inject } from "@nmshd/typescript-ioc";
import { SendBackboneNotificationRequest, SendBackboneNotificationUseCase } from "../../../useCases/index.js";

export class BackboneNotificationsFacade {
    public constructor(@Inject private readonly sendBackboneNotificationUseCase: SendBackboneNotificationUseCase) {}

    public async sendBackboneNotification(request: SendBackboneNotificationRequest): Promise<Result<void>> {
        return await this.sendBackboneNotificationUseCase.execute(request);
    }
}
