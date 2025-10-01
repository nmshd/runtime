/* eslint-disable @typescript-eslint/naming-convention */
import { AgentDependencies } from "@credo-ts/core";
import { EventEmitter } from "events";
import WebSocket from "ws";
import { EnmeshedHolderFileSystem } from "./EnmeshedHolderFileSystem";

const fetchImpl = globalThis.fetch;
const webSocketImpl = WebSocket;

export const agentDependencies: AgentDependencies = {
    FileSystem: EnmeshedHolderFileSystem,
    EventEmitterClass: EventEmitter,
    fetch: fetchImpl,
    WebSocketClass: webSocketImpl
};
