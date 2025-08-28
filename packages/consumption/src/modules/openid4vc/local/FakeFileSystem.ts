import { DownloadToFileOptions, FileSystem } from "@credo-ts/core";

export class FakeFileSystem implements FileSystem {
    public readonly dataPath: string;

    public readonly cachePath: string;

    public readonly tempPath: string;

    private readonly fileSystem: Map<string, string> = new Map();

    private readonly directories: Map<string, boolean> = new Map();

    public constructor() {
        this.dataPath = "/data";
        this.cachePath = "/cache";
        this.tempPath = "/temp";

        // initialize the directories map with the known paths
        this.directories.set(this.dataPath, true);
        this.directories.set(this.cachePath, true);
        this.directories.set(this.tempPath, true);
    }

    public exists(path: string): Promise<boolean> {
        if (this.directories.has(path) || this.fileSystem.has(path)) {
            return Promise.resolve(true);
        }

        return Promise.resolve(false);
    }

    public createDirectory(path: string): Promise<void> {
        this.directories.set(path, true);

        return Promise.resolve();
    }

    public copyFile(sourcePath: string, destinationPath: string): Promise<void> {
        if (this.fileSystem.has(sourcePath)) {
            this.fileSystem.set(destinationPath, this.fileSystem.get(sourcePath)!);

            return Promise.resolve();
        }

        return Promise.reject(new Error(`Source file ${sourcePath} does not exist`));
    }

    public write(path: string, data: string): Promise<void> {
        this.fileSystem.set(path, data);

        if (!this.directories.has(path)) {
            this.directories.set(path, false); // mark as file
        }

        return Promise.resolve();
    }

    public read(path: string): Promise<string> {
        if (!this.fileSystem.has(path)) {
            return Promise.reject(new Error(`File ${path} does not exist`));
        }

        return Promise.resolve(this.fileSystem.get(path) ?? "");
    }

    public delete(path: string): Promise<void> {
        if (this.fileSystem.has(path)) {
            this.fileSystem.delete(path);
        }

        return Promise.resolve();
    }

    public downloadToFile(url: string, path: string, options?: DownloadToFileOptions): Promise<void> {
        // Simulate a download by writing a placeholder content
        let content = `Downloaded content from ${url}`;

        if (options) {
            if (options.verifyHash) {
                // Here you would implement hash verification logic if needed
                // eslint-disable-next-line prefer-template
                content = content + ` with hash verification: ${options.verifyHash}`;
            }
        }

        this.fileSystem.set(path, content);

        return Promise.resolve();
    }
}
