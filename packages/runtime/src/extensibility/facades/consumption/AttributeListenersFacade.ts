import { Result } from "@js-soft/ts-utils";
import { LocalAttributeListenerDTO } from "@nmshd/runtime-types";
import { Inject } from "@nmshd/typescript-ioc";
import { GetAttributeListenerRequest, GetAttributeListenersUseCase, GetAttributeListenerUseCase } from "../../../useCases";

export class AttributeListenersFacade {
    public constructor(
        @Inject private readonly getAttributeListenerUseCase: GetAttributeListenerUseCase,
        @Inject private readonly getAttributeListenersUseCase: GetAttributeListenersUseCase
    ) {}

    public async getAttributeListener(request: GetAttributeListenerRequest): Promise<Result<LocalAttributeListenerDTO>> {
        return await this.getAttributeListenerUseCase.execute(request);
    }

    public async getAttributeListeners(): Promise<Result<LocalAttributeListenerDTO[]>> {
        return await this.getAttributeListenersUseCase.execute();
    }
}
