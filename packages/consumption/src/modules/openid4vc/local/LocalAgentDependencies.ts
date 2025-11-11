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
        const response = await undiciFetch(input as any, {
            ...(init as any),
            dispatcher: new Agent({})
        });

        return response;
    }) as typeof fetch,
    // eslint-disable-next-line @typescript-eslint/naming-convention
    WebSocketClass: webSocket
};
