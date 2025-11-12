import { Result } from "@js-soft/ts-utils";
import { BackboneNotificationsController } from "@nmshd/transport";
import { Inject } from "@nmshd/typescript-ioc";
import { AddressString, SchemaRepository, SchemaValidator, UseCase } from "../../common/index.js";

export interface SendBackboneNotificationRequest {
    recipients: AddressString[];
    code: string;
}

class Validator extends SchemaValidator<SendBackboneNotificationRequest> {
    public constructor(@Inject schemaRepository: SchemaRepository) {
        super(schemaRepository.getSchema("SendBackboneNotificationRequest"));
    }
}

export class SendBackboneNotificationUseCase extends UseCase<SendBackboneNotificationRequest, void> {
    public constructor(
        @Inject private readonly backboneNotificationsController: BackboneNotificationsController,
        @Inject validator: Validator
    ) {
        super(validator);
    }

    protected async executeInternal(request: SendBackboneNotificationRequest): Promise<Result<void>> {
        await this.backboneNotificationsController.sendNotification(request);

        return Result.ok(undefined);
    }
}
