import { DownloadToFileOptions, FileSystem } from "@credo-ts/core";

// File system is not used since we don't use Askar or AnonCreds.
export class EnmeshedHolderFileSystem implements FileSystem {
    private static readonly NOT_IMPLEMENTED_ERROR = "Not implemented: Credos file system support has not been needed so far and is therefore not implemented.";

    public exists(_path: string): Promise<boolean> {
        throw new Error(EnmeshedHolderFileSystem.NOT_IMPLEMENTED_ERROR);
    }
    public createDirectory(_path: string): Promise<void> {
        throw new Error(EnmeshedHolderFileSystem.NOT_IMPLEMENTED_ERROR);
    }
    public copyFile(_sourcePath: string, _destinationPath: string): Promise<void> {
        throw new Error(EnmeshedHolderFileSystem.NOT_IMPLEMENTED_ERROR);
    }
    public write(_path: string, _data: string): Promise<void> {
        throw new Error(EnmeshedHolderFileSystem.NOT_IMPLEMENTED_ERROR);
    }
    public read(_path: string): Promise<string> {
        throw new Error(EnmeshedHolderFileSystem.NOT_IMPLEMENTED_ERROR);
    }
    public delete(_path: string): Promise<void> {
        throw new Error(EnmeshedHolderFileSystem.NOT_IMPLEMENTED_ERROR);
    }
    public downloadToFile(_url: string, _path: string, _options?: DownloadToFileOptions): Promise<void> {
        throw new Error(EnmeshedHolderFileSystem.NOT_IMPLEMENTED_ERROR);
    }
    public readonly dataPath: string;
    public readonly cachePath: string;
    public readonly tempPath: string;
}
