/* eslint-disable no-console */
import { AgentDependencies } from "@credo-ts/core";
import { EventEmitter } from "events";
import { Agent, fetch as undiciFetch } from "undici";
import webSocket from "ws";
import { EnmeshedHolderFileSystem } from "./EnmeshedHolderFileSystem";

export const agentDependencies: AgentDependencies = {
    // eslint-disable-next-line @typescript-eslint/naming-convention
    FileSystem: EnmeshedHolderFileSystem,
    // eslint-disable-next-line @typescript-eslint/naming-convention
    EventEmitterClass: EventEmitter,
    fetch: (async (input, init) => {
        console.log("############### agentDependencies-fetch-input #################", input);
        console.log("############### agentDependencies-fetch-init #################", init);

        try {
            const response = await undiciFetch(input as any, {
                ...(init as any),
                dispatcher: new Agent({ connectTimeout: 10_000, connections: 1_000, connect: { rejectUnauthorized: false } })
            });

            console.log("############### agentDependencies-fetch-response #################", response);

            return response;
        } catch (error) {
            console.error("############### agentDependencies-fetch-error #################", error);
            console.error("############### agentDependencies-fetch-error-stack #################", (error as any).stack);
            throw error;
        }
    }) as typeof fetch,
    // eslint-disable-next-line @typescript-eslint/naming-convention
    WebSocketClass: webSocket
};
