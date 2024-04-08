import { Message } from "../messages/local/Message";
import { Relationship } from "../relationships/local/Relationship";

export class ChangedItems {
    public constructor(
        public readonly relationships: Relationship[] = [],
        public readonly messages: Message[] = []
    ) {}

    public addItem(item: Relationship | Message): void {
        if (item instanceof Message) {
            this.messages.push(item);
        } else if (item instanceof Relationship) {
            this.relationships.push(item);
        }
    }
}
