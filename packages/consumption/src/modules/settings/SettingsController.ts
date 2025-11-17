import { log } from "@js-soft/ts-utils";
import { CoreDate, CoreId } from "@nmshd/core-types";
import { SynchronizedCollection, TransportCoreErrors } from "@nmshd/transport";
import { ConsumptionBaseController } from "../../consumption/ConsumptionBaseController.js";
import { ConsumptionController } from "../../consumption/ConsumptionController.js";
import { ConsumptionControllerName } from "../../consumption/ConsumptionControllerName.js";
import { ConsumptionIds } from "../../consumption/ConsumptionIds.js";
import { ICreateSettingParameters } from "./local/CreateSettingParameter.js";
import { Setting, SettingScope } from "./local/Setting.js";
export class SettingsController extends ConsumptionBaseController {
    private settings: SynchronizedCollection;

    public constructor(parent: ConsumptionController) {
        super(ConsumptionControllerName.SettingsController, parent);
    }

    public override async init(): Promise<this> {
        await super.init();

        this.settings = await this.parent.accountController.getSynchronizedCollection("Settings");
        return this;
    }

    public async getSetting(id: CoreId): Promise<Setting | undefined> {
        const result = await this.settings.read(id.toString());
        return result ? Setting.from(result) : undefined;
    }

    public async getSettings(query?: any): Promise<Setting[]> {
        const items = await this.settings.find(query);
        return this.parseArray(items, Setting);
    }

    public async createSetting(parameters: ICreateSettingParameters): Promise<Setting> {
        const setting = Setting.from({
            id: await ConsumptionIds.setting.generate(),
            createdAt: CoreDate.utc(),
            key: parameters.key,
            scope: parameters.scope ?? SettingScope.Identity,
            value: parameters.value,
            reference: parameters.reference,
            succeedsAt: parameters.succeedsAt,
            succeedsItem: parameters.succeedsItem
        });
        await this.settings.create(setting);
        return setting;
    }

    @log()
    public async updateSetting(setting: Setting): Promise<void> {
        const oldSetting = await this.settings.read(setting.id.toString());
        if (!oldSetting) throw TransportCoreErrors.general.recordNotFound(Setting, setting.id.toString());

        await this.settings.update(oldSetting, setting);
    }

    public async deleteSetting(setting: Setting): Promise<void> {
        await this.settings.delete(setting);
    }

    public async deleteSettingsForRelationship(relationshipId: CoreId): Promise<void> {
        const settings = await this.getSettings({ reference: relationshipId.toString(), scope: SettingScope.Relationship });
        for (const setting of settings) {
            await this.deleteSetting(setting);
        }
    }
}
