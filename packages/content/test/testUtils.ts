import { IDatabaseConnection } from "@js-soft/docdb-access-abstractions";
import { LokiJsConnection } from "@js-soft/docdb-access-loki";
import { MongoDbConnection } from "@js-soft/docdb-access-mongo";
import { NodeLoggerFactory } from "@js-soft/node-logger";
import { EventBus, EventEmitter2EventBus } from "@js-soft/ts-utils";
import { IConfigOverwrite, Transport } from "@nmshd/transport";

export const loggerFactory = new NodeLoggerFactory({
    appenders: {
        consoleAppender: {
            type: "stdout",
            layout: { type: "pattern", pattern: "%[[%p] %c - %m%]" }
        },
        console: {
            type: "logLevelFilter",
            level: "Warn",
            appender: "consoleAppender"
        }
    },

    categories: {
        default: {
            appenders: ["console"],
            level: "TRACE"
        }
    }
});

export async function createConnection(): Promise<IDatabaseConnection> {
    let dbConnection;
    if (process.env.USE_LOKIJS === "true") {
        dbConnection = LokiJsConnection.inMemory();
    } else {
        dbConnection = new MongoDbConnection(process.env.CONNECTION_STRING!);
        await dbConnection.connect();
    }
    return dbConnection;
}

export function createTransport(
    connection: IDatabaseConnection,
    eventBus: EventBus = new EventEmitter2EventBus(() => {
        // ignore errors
    })
): Transport {
    return new Transport(connection, createConfig(), eventBus, loggerFactory);
}

export function createConfig(): IConfigOverwrite {
    const notDefinedEnvironmentVariables = ["NMSHD_TEST_BASEURL", "NMSHD_TEST_CLIENTID", "NMSHD_TEST_CLIENTSECRET"].filter((env) => !process.env[env]);

    if (notDefinedEnvironmentVariables.length > 0) {
        throw new Error(`Missing environment variable(s): ${notDefinedEnvironmentVariables.join(", ")}}`);
    }

    return {
        baseUrl: globalThis.process.env.NMSHD_TEST_BASEURL!,
        platformClientId: globalThis.process.env.NMSHD_TEST_CLIENTID!,
        platformClientSecret: globalThis.process.env.NMSHD_TEST_CLIENTSECRET!,
        addressGenerationHostnameOverride: globalThis.process.env.NMSHD_TEST_ADDRESS_GENERATION_HOSTNAME_OVERRIDE,
        debug: true,
        supportedIdentityVersion: 1
    };
}

export function expectThrows(method: Function, errorMessage = ""): void {
    let error: Error | undefined;
    try {
        if (typeof method === "function") {
            method();
        }
    } catch (err: unknown) {
        if (!(err instanceof Error)) throw err;

        error = err;
    }

    expect(error, "No Error was thrown!").not.toBeNull();
    expect(error).toBeInstanceOf(Error);
    if (errorMessage) {
        expect(error!.message, `Error Message: ${error!.message}`).toMatch(new RegExp(`^${errorMessage}`));
    }
}
