import { ILokiJsDatabaseFactory } from "@js-soft/docdb-access-loki";
import loki from "lokijs";

export class NativeDatabaseFactoryMock implements ILokiJsDatabaseFactory {
    public create(name: string, options?: Partial<LokiConstructorOptions> & Partial<LokiConfigOptions> & Partial<ThrottledSaveDrainOptions>): Loki {
        return new loki(name, options);
    }
}
