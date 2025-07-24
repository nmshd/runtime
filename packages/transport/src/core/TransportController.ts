import { IDatabaseCollectionProvider } from "@js-soft/docdb-access-abstractions";
import { ILogger } from "@js-soft/logging-abstractions";
import { Serializable } from "@js-soft/ts-serval";
import { EventBus } from "@js-soft/ts-utils";
import { AccountController } from "../modules/accounts/AccountController";
import { IConfig, Transport } from "./Transport";
import { TransportError } from "./TransportError";
import { TransportLoggerFactory } from "./TransportLoggerFactory";

export enum ControllerName {
    Account = "Account",
    Attribute = "Attribute",
    Certificate = "Certificate",
    CertificateIssuer = "CertificateIssuer",
    CertificateValidator = "CertificateValidator",
    Challenge = "Challenge",
    Device = "Device",
    Devices = "Devices",
    DeviceSecret = "DeviceSecret",
    File = "File",
    Identity = "Identity",
    Message = "Message",
    BackboneNotifications = "BackboneNotifications",
    PublicRelationshipTemplateReferences = "PublicRelationshipTemplateReferences",
    Relationship = "Relationship",
    Relationships = "Relationships",
    RelationshipTemplate = "RelationshipTemplate",
    RelationshipRequest = "RelationshipRequest",
    RelationshipRequestor = "RelationshipRequestor",
    RelationshipSecret = "RelationshipSecret",
    RelationshipTemplator = "RelationshipTemplator",
    Secret = "Secret",
    Sync = "Sync",
    Token = "Token"
}

export class TransportController {
    protected _initialized = false;
    public get initialized(): boolean {
        return this._initialized;
    }

    protected _dbClosed = false;

    protected _log: ILogger;
    public get log(): ILogger {
        return this._log;
    }

    public get parent(): AccountController {
        return this._parent;
    }

    public get config(): IConfig {
        return this._parent.config;
    }

    public get db(): IDatabaseCollectionProvider {
        return this._parent.db;
    }

    public get transport(): Transport {
        return this._parent.transport;
    }

    public get controllerName(): ControllerName {
        return this._controllerName;
    }

    public get eventBus(): EventBus {
        return this.transport.eventBus;
    }

    public constructor(
        protected readonly _controllerName: ControllerName,
        protected readonly _parent: AccountController
    ) {
        let loggerName: string = _controllerName;
        if (this.config.debug && this.parent.activeDeviceOrUndefined?.deviceOrUndefined) {
            loggerName += ` of ${this.parent.activeDevice.device.id}`;
        }
        this._log = TransportLoggerFactory.getLogger(loggerName);
    }

    public init(..._args: any[]): Promise<TransportController> {
        if (this._initialized) {
            throw new TransportError(`The controller ${this.controllerName} is already initialized.`);
        }

        this._initialized = true;
        return Promise.resolve(this);
    }

    protected parseArray<T extends Serializable>(values: Object[], type: new () => T): T[] {
        return values.map((v) => (type as any).fromAny(v));
    }

    protected newCacheEmptyError(entityName: string | Function, id: string): Error {
        return new TransportError(`The cache of ${entityName instanceof Function ? entityName.name : entityName} with id "${id}" is empty.`);
    }
}
