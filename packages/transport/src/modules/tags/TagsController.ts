import { ControllerName, TransportController } from "../../core/TransportController";
import { AccountController } from "../accounts/AccountController";
import { TagClient } from "./backbone/TagClient";
import { TagList } from "./data/TagList";

export class TagsController extends TransportController {
    private client: TagClient;

    public constructor(parent: AccountController) {
        super(ControllerName.Tag, parent);
    }

    public override async init(): Promise<this> {
        await super.init();

        this.client = new TagClient(this.config, this.parent.authenticator, this.transport.correlator);

        return this;
    }

    public async getTags(): Promise<TagList> {
        const backboneTagList = (await this.client.getTags()).value;
        return TagList.fromAny(backboneTagList);
    }
}
