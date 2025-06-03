import { Result } from "@js-soft/ts-utils";
import { AccountController } from "@nmshd/transport";
import { Inject } from "@nmshd/typescript-ioc";
import { FileDTO, IdentityDeletionProcessDTO, MessageDTO, RelationshipDTO } from "../../../types";
import { UseCase } from "../../common";
import { FileMapper } from "../files";
import { IdentityDeletionProcessMapper } from "../identityDeletionProcesses";
import { MessageMapper } from "../messages/MessageMapper";
import { RelationshipMapper } from "../relationships/RelationshipMapper";

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
