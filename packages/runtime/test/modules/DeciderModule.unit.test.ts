import { NodeLoggerFactory } from "@js-soft/node-logger";
import { IdentityAttribute } from "@nmshd/content";
import {
    AcceptResponseConfig,
    AuthenticationRequestItemConfig,
    ConsentRequestItemConfig,
    CreateAttributeRequestItemConfig,
    DeleteAttributeAcceptResponseConfig,
    DeleteAttributeRequestItemConfig,
    FreeTextAcceptResponseConfig,
    FreeTextRequestItemConfig,
    GeneralRequestConfig,
    ProposeAttributeRequestItemConfig,
    ProposeAttributeWithNewAttributeAcceptResponseConfig,
    ReadAttributeRequestItemConfig,
    ReadAttributeWithNewAttributeAcceptResponseConfig,
    RegisterAttributeListenerRequestItemConfig,
    RejectResponseConfig,
    ShareAttributeRequestItemConfig
} from "src/modules/decide";
import { DeciderModule } from "../../src";
import { RuntimeServiceProvider } from "../lib";

const runtimeServiceProvider = new RuntimeServiceProvider();

afterAll(async () => await runtimeServiceProvider.stop());

describe("DeciderModule unit tests", () => {
    let deciderModule: DeciderModule;
    beforeAll(() => {
        const runtime = runtimeServiceProvider["runtimes"][0];

        const deciderConfig = {
            enabled: false,
            displayName: "Decider Module",
            name: "DeciderModule",
            location: "@nmshd/runtime:DeciderModule"
        };

        const loggerFactory = new NodeLoggerFactory({
            appenders: {
                consoleAppender: {
                    type: "stdout",
                    layout: { type: "pattern", pattern: "%[[%d] [%p] %c - %m%]" }
                },
                console: {
                    type: "logLevelFilter",
                    level: "ERROR",
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
        const testLogger = loggerFactory.getLogger("DeciderModule.test");

        deciderModule = new DeciderModule(runtime, deciderConfig, testLogger);
    });

    describe("validateAutomationConfig", () => {
        const rejectResponseConfig: RejectResponseConfig = {
            accept: false
        };

        const simpleAcceptResponseConfig: AcceptResponseConfig = {
            accept: true
        };

        const deleteAttributeAcceptResponseConfig: DeleteAttributeAcceptResponseConfig = {
            accept: true,
            deletionDate: "deletionDate"
        };

        const freeTextAcceptResponseConfig: FreeTextAcceptResponseConfig = {
            accept: true,
            freeText: "freeText"
        };

        const proposeAttributeWithNewAttributeAcceptResponseConfig: ProposeAttributeWithNewAttributeAcceptResponseConfig = {
            accept: true,
            attribute: IdentityAttribute.from({
                value: {
                    "@type": "GivenName",
                    value: "aGivenName"
                },
                owner: "owner"
            })
        };

        const readAttributeWithNewAttributeAcceptResponseConfig: ReadAttributeWithNewAttributeAcceptResponseConfig = {
            accept: true,
            newAttribute: IdentityAttribute.from({
                value: {
                    "@type": "GivenName",
                    value: "aGivenName"
                },
                owner: "owner"
            })
        };

        const generalRequestConfig: GeneralRequestConfig = {
            peer: ["peerA", "peerB"]
        };

        const authenticationRequestItemConfig: AuthenticationRequestItemConfig = {
            "content.item.@type": "AuthenticationRequestItem"
        };

        const consentRequestItemConfig: ConsentRequestItemConfig = {
            "content.item.@type": "ConsentRequestItem"
        };

        const createAttributeRequestItemConfig: CreateAttributeRequestItemConfig = {
            "content.item.@type": "CreateAttributeRequestItem"
        };

        const deleteAttributeRequestItemConfig: DeleteAttributeRequestItemConfig = {
            "content.item.@type": "DeleteAttributeRequestItem"
        };

        const freeTextRequestItemConfig: FreeTextRequestItemConfig = {
            "content.item.@type": "FreeTextRequestItem",
            "content.item.freeText": "A free text"
        };

        const proposeAttributeRequestItemConfig: ProposeAttributeRequestItemConfig = {
            "content.item.@type": "ProposeAttributeRequestItem"
        };

        const readAttributeRequestItemConfig: ReadAttributeRequestItemConfig = {
            "content.item.@type": "ReadAttributeRequestItem"
        };

        const registerAttributeListenerRequestItemConfig: RegisterAttributeListenerRequestItemConfig = {
            "content.item.@type": "RegisterAttributeListenerRequestItem"
        };

        const shareAttributeRequestItemConfig: ShareAttributeRequestItemConfig = {
            "content.item.@type": "ShareAttributeRequestItem"
        };

        test.each([
            [generalRequestConfig, rejectResponseConfig, true],
            [generalRequestConfig, simpleAcceptResponseConfig, true],
            [generalRequestConfig, deleteAttributeAcceptResponseConfig, false],
            [generalRequestConfig, freeTextAcceptResponseConfig, false],
            [generalRequestConfig, proposeAttributeWithNewAttributeAcceptResponseConfig, false],
            [generalRequestConfig, readAttributeWithNewAttributeAcceptResponseConfig, false],

            [authenticationRequestItemConfig, rejectResponseConfig, true],
            [authenticationRequestItemConfig, simpleAcceptResponseConfig, true],
            [authenticationRequestItemConfig, deleteAttributeAcceptResponseConfig, false],
            [authenticationRequestItemConfig, freeTextAcceptResponseConfig, false],
            [authenticationRequestItemConfig, proposeAttributeWithNewAttributeAcceptResponseConfig, false],
            [authenticationRequestItemConfig, readAttributeWithNewAttributeAcceptResponseConfig, false],

            [consentRequestItemConfig, rejectResponseConfig, true],
            [consentRequestItemConfig, simpleAcceptResponseConfig, true],
            [consentRequestItemConfig, deleteAttributeAcceptResponseConfig, false],
            [consentRequestItemConfig, freeTextAcceptResponseConfig, false],
            [consentRequestItemConfig, proposeAttributeWithNewAttributeAcceptResponseConfig, false],
            [consentRequestItemConfig, readAttributeWithNewAttributeAcceptResponseConfig, false],

            [createAttributeRequestItemConfig, rejectResponseConfig, true],
            [createAttributeRequestItemConfig, simpleAcceptResponseConfig, true],
            [createAttributeRequestItemConfig, deleteAttributeAcceptResponseConfig, false],
            [createAttributeRequestItemConfig, freeTextAcceptResponseConfig, false],
            [createAttributeRequestItemConfig, proposeAttributeWithNewAttributeAcceptResponseConfig, false],
            [createAttributeRequestItemConfig, readAttributeWithNewAttributeAcceptResponseConfig, false],

            [deleteAttributeRequestItemConfig, rejectResponseConfig, true],
            [deleteAttributeRequestItemConfig, simpleAcceptResponseConfig, false],
            [deleteAttributeRequestItemConfig, deleteAttributeAcceptResponseConfig, true],
            [deleteAttributeRequestItemConfig, freeTextAcceptResponseConfig, false],
            [deleteAttributeRequestItemConfig, proposeAttributeWithNewAttributeAcceptResponseConfig, false],
            [deleteAttributeRequestItemConfig, readAttributeWithNewAttributeAcceptResponseConfig, false],

            [freeTextRequestItemConfig, rejectResponseConfig, true],
            [freeTextRequestItemConfig, simpleAcceptResponseConfig, false],
            [freeTextRequestItemConfig, deleteAttributeAcceptResponseConfig, false],
            [freeTextRequestItemConfig, freeTextAcceptResponseConfig, true],
            [freeTextRequestItemConfig, proposeAttributeWithNewAttributeAcceptResponseConfig, false],
            [freeTextRequestItemConfig, readAttributeWithNewAttributeAcceptResponseConfig, false],

            [proposeAttributeRequestItemConfig, rejectResponseConfig, true],
            [proposeAttributeRequestItemConfig, simpleAcceptResponseConfig, false],
            [proposeAttributeRequestItemConfig, deleteAttributeAcceptResponseConfig, false],
            [proposeAttributeRequestItemConfig, freeTextAcceptResponseConfig, false],
            [proposeAttributeRequestItemConfig, proposeAttributeWithNewAttributeAcceptResponseConfig, true],
            [proposeAttributeRequestItemConfig, readAttributeWithNewAttributeAcceptResponseConfig, false],

            [readAttributeRequestItemConfig, rejectResponseConfig, true],
            [readAttributeRequestItemConfig, simpleAcceptResponseConfig, false],
            [readAttributeRequestItemConfig, deleteAttributeAcceptResponseConfig, false],
            [readAttributeRequestItemConfig, freeTextAcceptResponseConfig, false],
            [readAttributeRequestItemConfig, proposeAttributeWithNewAttributeAcceptResponseConfig, false],
            [readAttributeRequestItemConfig, readAttributeWithNewAttributeAcceptResponseConfig, true],

            [registerAttributeListenerRequestItemConfig, rejectResponseConfig, true],
            [registerAttributeListenerRequestItemConfig, simpleAcceptResponseConfig, true],
            [registerAttributeListenerRequestItemConfig, deleteAttributeAcceptResponseConfig, false],
            [registerAttributeListenerRequestItemConfig, freeTextAcceptResponseConfig, false],
            [registerAttributeListenerRequestItemConfig, proposeAttributeWithNewAttributeAcceptResponseConfig, false],
            [registerAttributeListenerRequestItemConfig, readAttributeWithNewAttributeAcceptResponseConfig, false],

            [shareAttributeRequestItemConfig, rejectResponseConfig, true],
            [shareAttributeRequestItemConfig, simpleAcceptResponseConfig, true],
            [shareAttributeRequestItemConfig, deleteAttributeAcceptResponseConfig, false],
            [shareAttributeRequestItemConfig, freeTextAcceptResponseConfig, false],
            [shareAttributeRequestItemConfig, proposeAttributeWithNewAttributeAcceptResponseConfig, false],
            [shareAttributeRequestItemConfig, readAttributeWithNewAttributeAcceptResponseConfig, false]
        ])("%p and %p should return %p as validation result", (requestConfig, responseConfig, expectedCompatibility) => {
            const result = deciderModule["validateAutomationConfig"](requestConfig, responseConfig);
            expect(result).toBe(expectedCompatibility);
        });
    });
});
