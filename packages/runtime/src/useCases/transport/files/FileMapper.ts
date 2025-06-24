import { CoreBuffer } from "@nmshd/crypto";
import { File } from "@nmshd/transport";
import { Container } from "@nmshd/typescript-ioc";
import { ConfigHolder } from "../../../ConfigHolder";
import { FileDTO } from "../../../types";
import { RuntimeErrors } from "../../common";
import { DownloadFileResponse } from "./DownloadFile";

export class FileMapper {
    public static toDownloadFileResponse(buffer: CoreBuffer, file: File): DownloadFileResponse {
        if (!file.cache) {
            throw RuntimeErrors.general.cacheEmpty(File, file.id.toString());
        }

        return {
            content: buffer.buffer,
            filename: file.cache.filename ? file.cache.filename : file.id.toString(),
            mimetype: file.cache.mimetype
        };
    }

    public static toFileDTO(file: File): FileDTO {
        if (!file.cache) {
            throw RuntimeErrors.general.cacheEmpty(File, file.id.toString());
        }

        const backboneBaseUrl = Container.get<ConfigHolder>(ConfigHolder).getConfig().transportLibrary.baseUrl;
        const reference = file.toFileReference(backboneBaseUrl);

        return {
            id: file.id.toString(),
            isOwn: file.isOwn,
            filename: file.cache.filename,
            tags: file.cache.tags,
            filesize: file.cache.filesize,
            createdAt: file.cache.createdAt.toString(),
            createdBy: file.cache.createdBy.toString(),
            createdByDevice: file.cache.createdByDevice.toString(),
            expiresAt: file.cache.expiresAt.toString(),
            mimetype: file.cache.mimetype,
            title: file.cache.title,
            description: file.cache.description,
            reference: {
                truncated: reference.truncate(),
                url: reference.toUrl()
            },
            ownershipToken: file.ownershipToken,
            ownershipIsLocked: file.ownershipIsLocked
        };
    }

    public static toFileDTOList(files: File[]): FileDTO[] {
        return files.map((file) => this.toFileDTO(file));
    }
}
