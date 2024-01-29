import { Result } from "@js-soft/ts-utils";
import { AttributeListenersController } from "@nmshd/consumption";
import { Inject } from "typescript-ioc";
import { LocalAttributeListenerDTO } from "../../../types";
import { UseCase } from "../../common";
import { AttributeListenerMapper } from "./AttributeListenerMapper";

export class GetAttributeListenersUseCase extends UseCase<void, LocalAttributeListenerDTO[]> {
    public constructor(@Inject private readonly attributeListenersController: AttributeListenersController) {
        super();
    }

    protected async executeInternal(): Promise<Result<LocalAttributeListenerDTO[]>> {
        const attributeListeners = await this.attributeListenersController.getAttributeListeners();
        const dtos = AttributeListenerMapper.toAttributeListenerDTOList(attributeListeners);

        return Result.ok(dtos);
    }
}
