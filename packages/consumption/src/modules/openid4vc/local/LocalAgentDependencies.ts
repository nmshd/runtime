/* eslint-disable no-console */
import { AgentDependencies } from "@credo-ts/core";
import axios from "axios";
import { EventEmitter } from "events";
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
            //     const response = await undiciFetch(input as any, init as any);
            const response = await axios({
                method: init?.method ?? "GET",
                url: input.toString(),
                headers: init?.headers as Record<string, string> | undefined,
                data: init?.body
            });

            console.log("############### agentDependencies-fetch-response #################", response);

            // return response;
            return new Response(response.data, { ...response } as ResponseInit);
        } catch (error) {
            console.error("############### agentDependencies-fetch-error #################", error);
            console.error("############### agentDependencies-fetch-error-stack #################", (error as any).stack);
            throw error;
        }
    }) as typeof fetch,
    // eslint-disable-next-line @typescript-eslint/naming-convention
    WebSocketClass: webSocket
};
