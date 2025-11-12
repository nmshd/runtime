import { Serializable } from "@js-soft/ts-serval";
import { CoreDate, CoreId } from "@nmshd/core-types";
import { SynchronizedCollection } from "@nmshd/transport";
import { ConsumptionBaseController } from "../../consumption/ConsumptionBaseController.js";
import { ConsumptionController } from "../../consumption/ConsumptionController.js";
import { ConsumptionControllerName } from "../../consumption/ConsumptionControllerName.js";
import { ConsumptionError } from "../../consumption/ConsumptionError.js";
import { ConsumptionIds } from "../../consumption/ConsumptionIds.js";
import { Draft } from "./local/Draft.js";

export class DraftsController extends ConsumptionBaseController {
    private drafts: SynchronizedCollection;

    public constructor(parent: ConsumptionController) {
        super(ConsumptionControllerName.DraftsController, parent);
    }

    public override async init(): Promise<this> {
        await super.init();

        this.drafts = await this.parent.accountController.getSynchronizedCollection("Drafts");
        return this;
    }

    public async getDraft(id: CoreId): Promise<Draft | undefined> {
        const result = await this.drafts.read(id.toString());
        return result ? Draft.from(result) : undefined;
    }

    public async getDrafts(query?: any): Promise<Draft[]> {
        const items = await this.drafts.find(query);
        return this.parseArray(items, Draft);
    }

    public async createDraft(content: Serializable, type = ""): Promise<Draft> {
        const draft = Draft.from({
            id: await ConsumptionIds.draft.generate(),
            content,
            createdAt: new CoreDate(),
            lastModifiedAt: new CoreDate(),
            type: type
        });
        await this.drafts.create(draft);
        return draft;
    }

    public async updateDraft(draft: Draft): Promise<void> {
        const oldDraft = await this.drafts.read(draft.id.toString());
        if (!oldDraft) {
            throw new ConsumptionError("Draft Not Found");
        }
        await this.drafts.update(oldDraft, draft);
    }

    public async deleteDraft(draft: Draft): Promise<void> {
        await this.drafts.delete(draft);
    }
}
