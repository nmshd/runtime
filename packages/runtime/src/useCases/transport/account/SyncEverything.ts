import { Result } from "@js-soft/ts-utils";
import { FileDTO, IdentityDeletionProcessDTO, MessageDTO, RelationshipDTO } from "@nmshd/runtime-types";
import { AccountController } from "@nmshd/transport";
import { Inject } from "@nmshd/typescript-ioc";
import { UseCase } from "../../common/index.js";
import { FileMapper } from "../files/index.js";
import { IdentityDeletionProcessMapper } from "../identityDeletionProcesses/index.js";
import { MessageMapper } from "../messages/MessageMapper.js";
import { RelationshipMapper } from "../relationships/RelationshipMapper.js";

export interface SyncEverythingResponse {
    relationships: RelationshipDTO[];
    messages: MessageDTO[];
    identityDeletionProcesses: IdentityDeletionProcessDTO[];
    files: FileDTO[];
}

export class SyncEverythingUseCase extends UseCase<void, SyncEverythingResponse> {
    public constructor(@Inject private readonly accountController: AccountController) {
        super();
    }

    private currentSync?: Promise<Result<SyncEverythingResponse>>;

    protected async executeInternal(): Promise<Result<SyncEverythingResponse>> {
        if (this.currentSync) {
            return await this.currentSync;
        }

        this.currentSync = this._executeInternal();

        try {
            return await this.currentSync;
        } finally {
            this.currentSync = undefined;
        }
    }

    private async _executeInternal() {
        const changedItems = await this.accountController.syncEverything();

        const messageDTOs = MessageMapper.toMessageDTOList(changedItems.messages);
        const relationshipDTOs = RelationshipMapper.toRelationshipDTOList(changedItems.relationships);
        const identityDeletionProcessDTOs = IdentityDeletionProcessMapper.toIdentityDeletionProcessDTOList(changedItems.identityDeletionProcesses);
        const fileDTOs = FileMapper.toFileDTOList(changedItems.files);

        return Result.ok({
            messages: messageDTOs,
            relationships: relationshipDTOs,
            identityDeletionProcesses: identityDeletionProcessDTOs,
            files: fileDTOs
        });
    }
}
