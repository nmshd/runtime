import { DatabaseType, IDatabaseCollection } from "@js-soft/docdb-access-abstractions";
import { Collection } from "lokijs";

export class FakeDatabaseCollection implements IDatabaseCollection {
    private readonly collection: Collection<any>;

    public readonly name: string;
    public readonly databaseType = DatabaseType.LokiJs;

    public constructor(name: string) {
        this.name = name;
        this.collection = new Collection<any>(name);
    }

    public create(object: any): Promise<any> {
        let document;
        if (typeof object.toJSON === "function") {
            document = object.toJSON();
        } else {
            document = object;
        }

        this.collection.insert(document);

        return Promise.resolve(object);
    }

    public read(id: string): Promise<any> {
        const results = this.collection.chain().find({ id: id }).limit(1).data();

        return Promise.resolve(results[0]);
    }

    public patch(_oldDocument: any, _newObject: any): Promise<any> {
        throw new Error("Method not implemented. Use update() instead.");
    }

    public update(oldDocument: any, data: any): Promise<any> {
        let document;
        if (typeof data.toJSON === "function") {
            document = data.toJSON();
        } else {
            document = data;
        }

        document.$loki = oldDocument.$loki;
        document.meta = oldDocument.meta;

        this.collection.update(document);
        return Promise.resolve(data);
    }

    public delete(object: any): Promise<boolean> {
        if (typeof object === "string") {
            this.collection.chain().find({ id: object }).remove();
            return Promise.resolve(true);
        } else if (typeof object === "object") {
            this.collection.chain().find(object).remove();
            return Promise.resolve(true);
        }

        return Promise.resolve(false);
    }

    public list(): Promise<any[]> {
        return Promise.resolve(this.collection.chain().data());
    }

    public find(object: any): Promise<any[]> {
        const results = this.collection.chain().find(object).data();
        return Promise.resolve(results);
    }

    public findOne(query: object): Promise<any> {
        const results = this.collection.chain().find(query).limit(1).data();
        return Promise.resolve(results[0]);
    }

    public count(_query: object): Promise<number> {
        throw new Error("Method not implemented.");
    }

    public exists(_query: object): Promise<boolean> {
        throw new Error("Method not implemented.");
    }
}
