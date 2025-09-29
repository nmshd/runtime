/* eslint-disable no-console */
import { DownloadToFileOptions, FileSystem } from "@credo-ts/core";

export class FakeFileSystem implements FileSystem {
    public readonly dataPath: string;
    public readonly cachePath: string;
    public readonly tempPath: string;

    private readonly fileSystem: Map<string, string> = new Map();
    private readonly directories: Map<string, boolean> = new Map();

    public constructor() {
        // check if the globalThis object already knows a fake file system
        if ((globalThis as any)._fakeFileSystem) {
            console.log("FFS: Reusing existing FakeFileSystem");
            // if a fake file system already exists use its value to initialize this instance
            const existingFs = (globalThis as any)._fakeFileSystem as FakeFileSystem;
            this.fileSystem = existingFs.fileSystem;
            this.directories = existingFs.directories;

            this.dataPath = existingFs.dataPath;
            this.cachePath = existingFs.cachePath;
            this.tempPath = existingFs.tempPath;
        } else {
            console.log("FFS: Initializing the FakeFileSystem");
            this.dataPath = "/data";
            this.cachePath = "/cache";
            this.tempPath = "/temp";

            // initialize the directories map with the known paths
            this.directories.set(this.dataPath, true);
            this.directories.set(this.cachePath, true);
            this.directories.set(this.tempPath, true);
            // store this instance in the globalThis object
            FakeFileSystem.updateGlobalInstance(this);
        }
    }

    public static updateGlobalInstance(toStore: FakeFileSystem): void {
        (globalThis as any)._fakeFileSystem = toStore;
    }

    public exists(path: string): Promise<boolean> {
        console.log(`FFS: Checking existence of path ${path}`);
        if (this.directories.has(path) || this.fileSystem.has(path)) {
            return Promise.resolve(true);
        }

        return Promise.resolve(false);
    }

    public createDirectory(path: string): Promise<void> {
        console.log(`FFS: Creating directory at path ${path}`);
        this.directories.set(path, true);
        FakeFileSystem.updateGlobalInstance(this);
        return Promise.resolve();
    }

    public async copyFile(sourcePath: string, destinationPath: string): Promise<void> {
        console.log(`FFS: Copying file from ${sourcePath} to ${destinationPath}`);
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
        console.log(`FFS: Writing data to path ${path}`);
        // if the path doe not yet exist set it as a file
        if (!this.directories.has(path)) {
            this.directories.set(path, false); // mark as file
        }
        this.fileSystem.set(path, data);
        FakeFileSystem.updateGlobalInstance(this);
        return Promise.resolve();
    }

    public async read(path: string): Promise<string> {
        console.log(`FFS: Reading data from path ${path}`);
        const exists = await this.exists(path);
        if (!exists) {
            // eslint-disable-next-line no-console
            console.log(`File ${path} does not exist`);
        }

        if (this.directories.get(path)) {
            throw new Error(`Path ${path} is a directory, not a file`);
        }

        return this.fileSystem.get(path) ?? "";
    }

    public async delete(path: string): Promise<void> {
        console.log(`FFS: Deleting path ${path}`);
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
        FakeFileSystem.updateGlobalInstance(this);
        return;
    }

    public downloadToFile(url: string, path: string, options?: DownloadToFileOptions): Promise<void> {
        console.log(`FFS: Downloading from ${url} to ${path}`);

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
