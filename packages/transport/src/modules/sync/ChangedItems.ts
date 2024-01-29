import { Message } from "../messages/local/Message";
import { Relationship } from "../relationships/local/Relationship";

export class ChangedItems {
    public constructor(
        public readonly relationships: Relationship[] = [],
        public readonly messages: Message[] = []
    ) {}

    public addRelationship(relationship: Relationship): void {
        this.relationships.push(relationship);
    }

    public addMessage(message: Message): void {
        this.messages.push(message);
    }
}
