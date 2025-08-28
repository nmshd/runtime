/* eslint-disable @typescript-eslint/naming-convention */
import { AgentDependencies } from "@credo-ts/core";
import { EventEmitter } from "events";
import WebSocket from "ws";
import { FakeFileSystem } from "./FakeFileSystem";
// Example fetch implementation (using node-fetch or global fetch)
const fetchImpl = globalThis.fetch;

// Example WebSocket implementation (using ws)
const webSocketImpl = WebSocket;

export const agentDependencies: AgentDependencies = {
    FileSystem: FakeFileSystem,
    EventEmitterClass: EventEmitter,
    fetch: fetchImpl,
    WebSocketClass: webSocketImpl
};
