import { ILogger } from "@js-soft/logging-abstractions";
import { Result } from "@js-soft/ts-utils";
import { AccountController } from "@nmshd/transport";
import { Inject } from "typescript-ioc";
import { RuntimeLoggerFactory } from "../../../RuntimeLoggerFactory";
import { IdentityDeletionProcessDTO, MessageDTO, RelationshipDTO } from "../../../types";
import { UseCase } from "../../common";
import { IdentityDeletionProcessMapper } from "../identityDeletionProcesses";
import { MessageMapper } from "../messages/MessageMapper";
import { RelationshipMapper } from "../relationships/RelationshipMapper";

export interface SyncEverythingResponse {
    relationships: RelationshipDTO[];
    messages: MessageDTO[];
    identityDeletionProcesses: IdentityDeletionProcessDTO[];
}

export interface SyncEverythingRequest {
    callback?(percentage: number, syncStep: string): void;
}

export class SyncEverythingUseCase extends UseCase<SyncEverythingRequest, SyncEverythingResponse> {
    private readonly logger: ILogger;
    public constructor(
        @Inject private readonly accountController: AccountController,
        @Inject loggerFactory: RuntimeLoggerFactory
    ) {
        super();

        this.logger = loggerFactory.getLogger(SyncEverythingUseCase);
    }

    private currentSync?: Promise<Result<SyncEverythingResponse>>;

    protected async executeInternal(request: SyncEverythingRequest): Promise<Result<SyncEverythingResponse>> {
        if (this.currentSync) {
            return await this.currentSync;
        }

        this.currentSync = this._executeInternal(request);

        try {
            return await this.currentSync;
        } finally {
            this.currentSync = undefined;
        }
    }

    private async _executeInternal(request: SyncEverythingRequest) {
        const changedItems = await this.accountController.syncEverything(request.callback);

        const messageDTOs = MessageMapper.toMessageDTOList(changedItems.messages);
        const relationshipDTOs = RelationshipMapper.toRelationshipDTOList(changedItems.relationships);
        const identityDeletionsProcessDTOs = IdentityDeletionProcessMapper.toIdentityDeletionProcessDTOList(changedItems.identityDeletionProcesses);

        return Result.ok({
            messages: messageDTOs,
            relationships: relationshipDTOs,
            identityDeletionProcesses: identityDeletionsProcessDTOs
        });
    }
}
