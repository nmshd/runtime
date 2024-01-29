import { DeviceMapper, DeviceOnboardingInfoDTO } from "@nmshd/runtime";
import { CoreId, Realm } from "@nmshd/transport";
import { AppRuntimeErrors } from "../AppRuntimeErrors";
import { MultiAccountController } from "./MultiAccountController";
import { LocalAccountDTO } from "./data/LocalAccountDTO";
import { LocalAccountMapper } from "./data/LocalAccountMapper";

export class AccountServices {
    public constructor(protected readonly multiAccountController: MultiAccountController) {}

    public async createAccount(realm: Realm, name: string): Promise<LocalAccountDTO> {
        // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
        if (realm !== Realm.Dev && realm !== Realm.Prod && realm !== Realm.Stage) {
            throw AppRuntimeErrors.multiAccount.wrongRealm();
        }

        const [localAccount] = await this.multiAccountController.createAccount(realm, name);
        return LocalAccountMapper.toLocalAccountDTO(localAccount);
    }

    public async onboardAccount(onboardingInfo: DeviceOnboardingInfoDTO): Promise<LocalAccountDTO> {
        const sharedSecret = DeviceMapper.toDeviceSharedSecret(onboardingInfo);
        const [localAccount] = await this.multiAccountController.onboardDevice(sharedSecret);
        return LocalAccountMapper.toLocalAccountDTO(localAccount);
    }

    public async getAccounts(): Promise<LocalAccountDTO[]> {
        const localAccounts = await this.multiAccountController.getAccounts();
        return localAccounts.map((account) => LocalAccountMapper.toLocalAccountDTO(account));
    }

    public async getAccount(id: string): Promise<LocalAccountDTO> {
        const localAccount = await this.multiAccountController.getAccount(CoreId.from(id));
        return LocalAccountMapper.toLocalAccountDTO(localAccount);
    }

    public async getAccountByAddress(address: string): Promise<LocalAccountDTO> {
        const localAccount = await this.multiAccountController.getAccountByAddress(address);
        return LocalAccountMapper.toLocalAccountDTO(localAccount);
    }

    public async clearAccounts(): Promise<void> {
        await this.multiAccountController.clearAccounts();
    }

    public async renameAccount(localAccountId: string, newAccountName: string): Promise<void> {
        await this.multiAccountController.renameLocalAccount(CoreId.from(localAccountId), newAccountName);
    }
}
