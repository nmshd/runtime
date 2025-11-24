import { DownloadToFileOptions, FileSystem } from "@credo-ts/core";

// File system is not used since we don't use Askar or AnonCreds.
export class EnmeshedHolderFileSystem implements FileSystem {
    public exists(_path: string): Promise<boolean> {
        throw new Error("File system not implemented because previously not needed.");
    }
    public createDirectory(_path: string): Promise<void> {
        throw new Error("File system not implemented because previously not needed.");
    }
    public copyFile(_sourcePath: string, _destinationPath: string): Promise<void> {
        throw new Error("File system not implemented because previously not needed.");
    }
    public write(_path: string, _data: string): Promise<void> {
        throw new Error("File system not implemented because previously not needed.");
    }
    public read(_path: string): Promise<string> {
        throw new Error("File system not implemented because previously not needed.");
    }
    public delete(_path: string): Promise<void> {
        throw new Error("File system not implemented because previously not needed.");
    }
    public downloadToFile(_url: string, _path: string, _options?: DownloadToFileOptions): Promise<void> {
        throw new Error("File system not implemented because previously not needed.");
    }
    public readonly dataPath: string;
    public readonly cachePath: string;
    public readonly tempPath: string;
}
