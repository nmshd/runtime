import { Result } from "@js-soft/ts-utils";
import { OpenId4VcController } from "@nmshd/consumption";
import { LocalAttributeDTO } from "@nmshd/runtime-types";
import { Inject } from "@nmshd/typescript-ioc";
import { UseCase } from "../../common";
import { AttributeMapper } from "../attributes/AttributeMapper";

export interface ExecuteDCQLQueryRequest {
    dcql: any;
}

export type ExecuteDCQLQueryResponse = {
    attribute: LocalAttributeDTO;
    presentation: unknown;
}[];

export class ExecuteDCQLQueryUseCase extends UseCase<ExecuteDCQLQueryRequest, ExecuteDCQLQueryResponse> {
    public constructor(@Inject private readonly openId4VcController: OpenId4VcController) {
        super();
    }

    protected override async executeInternal(request: ExecuteDCQLQueryRequest): Promise<Result<ExecuteDCQLQueryResponse>> {
        const result = await this.openId4VcController.getMatchingCredentialsForDcql(request.dcql);
        return Result.ok(
            result.map((c) => {
                return { attribute: AttributeMapper.toAttributeDTO(c.attribute), presentation: c.presentation };
            })
        );
    }
}
