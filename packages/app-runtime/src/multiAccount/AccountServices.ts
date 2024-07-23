import { DeviceMapper, DeviceOnboardingInfoDTO } from "@nmshd/runtime";
import { CoreId } from "@nmshd/transport";
import { MultiAccountController } from "./MultiAccountController";
import { LocalAccountDTO } from "./data/LocalAccountDTO";
import { LocalAccountMapper } from "./data/LocalAccountMapper";

export class AccountServices {
    public constructor(protected readonly multiAccountController: MultiAccountController) {}

    public async createAccount(name: string): Promise<LocalAccountDTO> {
        const [localAccount] = await this.multiAccountController.createAccount(name);
        return LocalAccountMapper.toLocalAccountDTO(localAccount);
    }

    public async onboardAccount(onboardingInfo: DeviceOnboardingInfoDTO, name?: string): Promise<LocalAccountDTO> {
        const sharedSecret = DeviceMapper.toDeviceSharedSecret(onboardingInfo);
        const [localAccount] = await this.multiAccountController.onboardDevice(sharedSecret, name);
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

    public async deleteAccount(id: string): Promise<void> {
        await this.multiAccountController.deleteAccount(CoreId.from(id));
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
