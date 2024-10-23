import { AccountController, ControllerName, TransportController } from "../..";
import { BackboneGetTag } from "./backbone/BackboneGetTag";
import { TagClient } from "./backbone/TagClient";

export class TagController extends TransportController {
    private client: TagClient;

    public constructor(parent: AccountController) {
        super(ControllerName.Tag, parent);
    }

    public override async init(): Promise<this> {
        await super.init();

        this.client = new TagClient(this.config, this.parent.authenticator, this.transport.correlator);

        return this;
    }

    public async getTags(): Promise<BackboneGetTag> {
        const tags = (await this.client.getTags()).value;
        return tags;
    }
}
