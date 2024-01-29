import { INativeDirectory, INativeFile, INativeFileAccess, INativeFileMetadata, NativeFileStorage } from "@js-soft/native-abstractions";
import { Result } from "@js-soft/ts-utils";
import { CoreBuffer } from "@nmshd/crypto";

export class NativeFileAccessMock implements INativeFileAccess {
    public infoFile(path: string, storage?: NativeFileStorage): Promise<Result<INativeFileMetadata>> {
        return Promise.resolve(
            Result.ok({
                name: "MockFileName",
                path: `${path}`,
                storage,
                mimeType: "plain/txt",
                size: 50,
                modifiedAt: "1990-12-31T00:00:00Z"
            })
        );
    }
    public readFileAsText(path: string, storage?: NativeFileStorage): Promise<Result<string>> {
        return Promise.resolve(Result.ok(`MockFileContent for ${path} within ${storage}`));
    }
    public readFileAsBinary(path: string, storage?: NativeFileStorage): Promise<Result<Uint8Array>> {
        const buffer = CoreBuffer.fromUtf8(`MockFileContent for ${path} within ${storage}`);
        return Promise.resolve(Result.ok(buffer.buffer));
    }
    public writeFile(/* path: string, data: Uint8Array | string, storage?: NativeFileStorage*/): Promise<Result<void>> {
        return Promise.resolve(Result.ok(undefined));
    }
    public deleteFile(/* path: string, storage?: NativeFileStorage */): Promise<Result<void>> {
        return Promise.resolve(Result.ok(undefined));
    }
    public existsFile(/* path: string, storage?: NativeFileStorage */): Promise<Result<boolean>> {
        return Promise.resolve(Result.ok(true));
    }
    public infoDirectory(path: string, storage?: NativeFileStorage): Promise<Result<INativeDirectory>> {
        return Promise.resolve(
            Result.ok({
                files: [],
                directories: [],
                metadata: {
                    modifiedAt: "1990-12-31T00:00:00Z",
                    path,
                    storage
                }
            })
        );
    }
    public createDirectory(/* path: string, storage?: NativeFileStorage */): Promise<Result<void>> {
        return Promise.resolve(Result.ok(undefined));
    }
    public deleteDirectory(/* path: string, storage?: NativeFileStorage */): Promise<Result<void>> {
        return Promise.resolve(Result.ok(undefined));
    }
    public existsDirectory(/* path: string, storage?: NativeFileStorage */): Promise<Result<boolean>> {
        return Promise.resolve(Result.ok(true));
    }
    public async select(): Promise<Result<INativeFile>> {
        return Result.ok({
            data: "Mock data of text selection",
            metadata: (await this.infoFile("/mock.txt")).value
        });
    }
    public openFile(/* path: string, storage?: NativeFileStorage */): Promise<Result<void>> {
        return Promise.resolve(Result.ok(undefined));
    }
    public openFileContent(/* content: Uint8Array, metadata: INativeFileMetadata */): Promise<Result<void>> {
        return Promise.resolve(Result.ok(undefined));
    }
    public init(): Promise<Result<void>> {
        return Promise.resolve(Result.ok(undefined));
    }
}
