import { Result } from "@js-soft/ts-utils";
import { FileDTO, MessageDTO, MessageWithAttachmentsDTO } from "@nmshd/runtime-types";
import { Inject } from "@nmshd/typescript-ioc";
import {
    DownloadAttachmentRequest,
    DownloadAttachmentResponse,
    DownloadAttachmentUseCase,
    GetAttachmentMetadataRequest,
    GetAttachmentMetadataUseCase,
    GetMessageRequest,
    GetMessagesPagedRequest,
    GetMessagesPagedResponse,
    GetMessagesPagedUseCase,
    GetMessagesRequest,
    GetMessagesUseCase,
    GetMessageUseCase,
    MarkMessageAsReadRequest,
    MarkMessageAsReadUseCase,
    MarkMessageAsUnreadRequest,
    MarkMessageAsUnreadUseCase,
    SendMessageRequest,
    SendMessageUseCase
} from "../../../useCases";

export class MessagesFacade {
    public constructor(
        @Inject private readonly downloadAttachmentUseCase: DownloadAttachmentUseCase,
        @Inject private readonly getAttachmentMetadataUseCase: GetAttachmentMetadataUseCase,
        @Inject private readonly getMessageUseCase: GetMessageUseCase,
        @Inject private readonly getMessagesUseCase: GetMessagesUseCase,
        @Inject private readonly getMessagesPagedUseCase: GetMessagesPagedUseCase,
        @Inject private readonly markMessageAsReadUseCase: MarkMessageAsReadUseCase,
        @Inject private readonly markMessageAsUnreadUseCase: MarkMessageAsUnreadUseCase,
        @Inject private readonly sendMessageUseCase: SendMessageUseCase
    ) {}

    public async sendMessage(request: SendMessageRequest): Promise<Result<MessageDTO>> {
        return await this.sendMessageUseCase.execute(request);
    }

    public async getMessages(request: GetMessagesRequest): Promise<Result<MessageDTO[]>> {
        return await this.getMessagesUseCase.execute(request);
    }

    public async getMessagesPaged(request: GetMessagesPagedRequest): Promise<Result<GetMessagesPagedResponse>> {
        return await this.getMessagesPagedUseCase.execute(request);
    }

    public async getMessage(request: GetMessageRequest): Promise<Result<MessageWithAttachmentsDTO>> {
        return await this.getMessageUseCase.execute(request);
    }

    public async downloadAttachment(request: DownloadAttachmentRequest): Promise<Result<DownloadAttachmentResponse>> {
        return await this.downloadAttachmentUseCase.execute(request);
    }

    public async getAttachmentMetadata(request: GetAttachmentMetadataRequest): Promise<Result<FileDTO>> {
        return await this.getAttachmentMetadataUseCase.execute(request);
    }

    public async markMessageAsRead(request: MarkMessageAsReadRequest): Promise<Result<MessageDTO>> {
        return await this.markMessageAsReadUseCase.execute(request);
    }

    public async markMessageAsUnread(request: MarkMessageAsUnreadRequest): Promise<Result<MessageDTO>> {
        return await this.markMessageAsUnreadUseCase.execute(request);
    }
}
