import { CoreDate, CoreId } from "@nmshd/core-types";
import { DbCollectionName } from "../../core/DbCollectionName.js";
import { TransportCoreErrors } from "../../core/index.js";
import { ControllerName, TransportController } from "../../core/TransportController.js";
import { PasswordGenerator } from "../../util/index.js";
import { AccountController } from "../accounts/AccountController.js";
import { ChallengeType } from "../challenges/data/Challenge.js";
import { SynchronizedCollection } from "../sync/SynchronizedCollection.js";
import { DeviceAuthClient } from "./backbone/DeviceAuthClient.js";
import { Device, DeviceType } from "./local/Device.js";
import { ISendDeviceParameters, SendDeviceParameters } from "./local/SendDeviceParameters.js";
import { DeviceSharedSecret } from "./transmission/DeviceSharedSecret.js";

export class DevicesController extends TransportController {
    private devices: SynchronizedCollection;
    private client: DeviceAuthClient;

    public constructor(parent: AccountController) {
        super(ControllerName.Devices, parent);
    }

    public override async init(): Promise<DevicesController> {
        await super.init();

        this.client = new DeviceAuthClient(this.config, this.parent.authenticator, this.transport.correlator);
        this.devices = await this.parent.getSynchronizedCollection(DbCollectionName.Devices);
        return this;
    }

    public async get(id: CoreId): Promise<Device | undefined> {
        const result = await this.devices.read(id.toString());
        if (!result) {
            return undefined;
        }

        return Device.from(result);
    }

    public async addExistingDevice(device: Device): Promise<void> {
        await this.devices.create(device);
    }

    public async sendDevice(parameters: ISendDeviceParameters): Promise<Device> {
        const parsedParams = SendDeviceParameters.from(parameters);
        const device = await this.createDevice(parsedParams);

        await this.devices.create(device);

        return device;
    }

    private async createDevice(params: SendDeviceParameters): Promise<Device> {
        const [signedChallenge, devicePwdDn] = await Promise.all([this.parent.challenges.createChallenge(ChallengeType.Identity), PasswordGenerator.createStrongPassword(45, 50)]);

        this.log.trace("Device Creation Challenge signed. Creating device on Backbone...");

        const response = (
            await this.client.createDevice({
                signedChallenge: signedChallenge.toJSON(),
                devicePassword: devicePwdDn,
                isBackupDevice: params.isBackupDevice
            })
        ).value;

        this.log.trace(`Created device with id ${response.id}.`);

        const device = Device.from({
            createdAt: CoreDate.from(response.createdAt),
            createdByDevice: CoreId.from(response.createdByDevice),
            id: CoreId.from(response.id),
            name: params.name,
            description: params.description,
            type: DeviceType.Unknown,
            username: response.username,
            initialPassword: devicePwdDn,
            isAdmin: params.isAdmin,
            isBackupDevice: response.isBackupDevice
        });

        return device;
    }

    public async getSharedSecret(id: CoreId, profileName?: string): Promise<DeviceSharedSecret> {
        const deviceDoc = await this.devices.read(id.toString());
        if (!deviceDoc) {
            throw TransportCoreErrors.general.recordNotFound(Device, id.toString());
        }

        const count = await this.devices.count();
        const device = Device.from(deviceDoc);

        if (device.publicKey) throw TransportCoreErrors.device.alreadyOnboarded();

        const isAdmin = device.isAdmin === true;

        const secret = await this.parent.activeDevice.secrets.createDeviceSharedSecret(device, count, isAdmin, profileName);
        return secret;
    }

    public async update(device: Device): Promise<void> {
        const deviceDoc = await this.devices.read(device.id.toString());
        if (!deviceDoc) {
            throw TransportCoreErrors.general.recordNotFound(Device, device.id.toString());
        }
        await this.devices.update(deviceDoc, device);
    }

    public async delete(device: Device): Promise<void> {
        if (device.publicKey) throw TransportCoreErrors.device.couldNotDeleteDevice("Device is already onboarded.");

        const result = await this.client.deleteDevice(device.id.toString());
        if (result.isError) {
            throw TransportCoreErrors.device.couldNotDeleteDevice("Backbone did not authorize deletion.", result.error);
        }

        await this.devices.delete(device);
    }

    public async list(): Promise<Device[]> {
        const items = await this.devices.list();
        return this.parseArray<Device>(items, Device);
    }
}
