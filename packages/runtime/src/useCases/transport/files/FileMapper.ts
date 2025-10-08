import { CoreBuffer } from "@nmshd/crypto";
import { FileDTO } from "@nmshd/runtime-types";
import { File } from "@nmshd/transport";
import { Container } from "@nmshd/typescript-ioc";
import { ConfigHolder } from "../../../ConfigHolder";
import { DownloadFileResponse } from "./DownloadFile";

export class FileMapper {
    public static toDownloadFileResponse(buffer: CoreBuffer, file: File): DownloadFileResponse {
        return {
            content: buffer.buffer,
            filename: file.filename,
            mimetype: file.mimetype
        };
    }

    public static toFileDTO(file: File): FileDTO {
        const backboneBaseUrl = Container.get<ConfigHolder>(ConfigHolder).getConfig().transportLibrary.baseUrl;
        const reference = file.toFileReference(backboneBaseUrl);

        return {
            id: file.id.toString(),
            isOwn: file.isOwn,
            filename: file.filename,
            tags: file.tags,
            filesize: file.filesize,
            createdAt: file.createdAt.toString(),
            createdBy: file.createdBy.toString(),
            createdByDevice: file.createdByDevice.toString(),
            expiresAt: file.expiresAt.toString(),
            mimetype: file.mimetype,
            title: file.title,
            description: file.description,
            reference: {
                truncated: reference.truncate(),
                url: reference.toUrl()
            },
            owner: file.owner.toString(),
            ownershipToken: file.ownershipToken,
            ownershipIsLocked: file.ownershipIsLocked
        };
    }

    public static toFileDTOList(files: File[]): FileDTO[] {
        return files.map((file) => this.toFileDTO(file));
    }
}
