import { DownloadToFileOptions, FileSystem } from "@credo-ts/core";

export class EnmeshedHolderFileSystem implements FileSystem {
    public readonly dataPath: string;
    public readonly cachePath: string;
    public readonly tempPath: string;

    private readonly fileSystem: Map<string, string> = new Map();
    private readonly directories: Map<string, boolean> = new Map();

    public constructor() {
        // check if the globalThis object already knows a fake file system
        if ((globalThis as any).enmeshedFileSystem) {
            // if a fake file system already exists use its value to initialize this instance
            const existingFs = (globalThis as any).enmeshedFileSystem as EnmeshedHolderFileSystem;
            this.fileSystem = existingFs.fileSystem;
            this.directories = existingFs.directories;

            this.dataPath = existingFs.dataPath;
            this.cachePath = existingFs.cachePath;
            this.tempPath = existingFs.tempPath;
        } else {
            this.dataPath = "/data";
            this.cachePath = "/cache";
            this.tempPath = "/temp";

            // initialize the directories map with the known paths
            this.directories.set(this.dataPath, true);
            this.directories.set(this.cachePath, true);
            this.directories.set(this.tempPath, true);
            // store this instance in the globalThis object
            EnmeshedHolderFileSystem.updateGlobalInstance(this);
        }
    }

    public static updateGlobalInstance(toStore: EnmeshedHolderFileSystem): void {
        (globalThis as any).enmeshedFileSystem = toStore;
    }

    public exists(path: string): Promise<boolean> {
        if (this.directories.has(path) || this.fileSystem.has(path)) {
            return Promise.resolve(true);
        }

        return Promise.resolve(false);
    }

    public createDirectory(path: string): Promise<void> {
        this.directories.set(path, true);
        EnmeshedHolderFileSystem.updateGlobalInstance(this);
        return Promise.resolve();
    }

    public async copyFile(sourcePath: string, destinationPath: string): Promise<void> {
        const exists = await this.exists(sourcePath);
        if (!exists) {
            throw new Error(`Source file ${sourcePath} does not exist`);
        }

        if (this.directories.get(sourcePath)) {
            throw new Error(`Source path ${sourcePath} is a directory, not a file`);
        }

        await this.write(destinationPath, this.fileSystem.get(sourcePath)!);
        return;
    }

    public write(path: string, data: string): Promise<void> {
        // if the path doe not yet exist set it as a file
        if (!this.directories.has(path)) {
            this.directories.set(path, false); // mark as file
        }
        this.fileSystem.set(path, data);
        EnmeshedHolderFileSystem.updateGlobalInstance(this);
        return Promise.resolve();
    }

    public async read(path: string): Promise<string> {
        const exists = await this.exists(path);
        if (!exists) {
            throw new Error(`Path ${path} does not exist`);
        }

        if (this.directories.get(path)) {
            throw new Error(`Path ${path} is a directory, not a file`);
        }

        return this.fileSystem.get(path) ?? "";
    }

    public async delete(path: string): Promise<void> {
        if (!(await this.exists(path))) {
            throw new Error(`Path ${path} does not exist`);
        }
        if (this.directories.get(path)) {
            throw new Error(`Path ${path} is a directory, not a file`);
        }

        if (this.fileSystem.has(path)) {
            this.fileSystem.delete(path);
            this.directories.delete(path);
        }
        EnmeshedHolderFileSystem.updateGlobalInstance(this);
        return;
    }

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    public downloadToFile(url: string, path: string, options?: DownloadToFileOptions): Promise<void> {
        throw new Error("Method not implemented.");
    }
}
