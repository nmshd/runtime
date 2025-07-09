import { IdentityDeletionProcess } from "../accounts/data/IdentityDeletionProcess";
import { File } from "../files/local/File";
import { Message } from "../messages/local/Message";
import { Relationship } from "../relationships/local/Relationship";

export interface IChangedItems {
    relationships: Relationship[];
    messages: Message[];
    identityDeletionProcesses: IdentityDeletionProcess[];
    files: File[];
}

export class ChangedItems implements IChangedItems {
    public constructor(
        public readonly relationships: Relationship[] = [],
        public readonly messages: Message[] = [],
        public readonly identityDeletionProcesses: IdentityDeletionProcess[] = [],
        public readonly files: File[] = [],
        public readonly changedObjectIdentifiersDuringDatawalletSync: string[] = []
    ) {}

    public addItem(item: Relationship | Message | IdentityDeletionProcess | File): void {
        if (item instanceof Message) {
            this.messages.push(item);
        } else if (item instanceof Relationship) {
            this.relationships.push(item);
        } else if (item instanceof IdentityDeletionProcess) {
            this.identityDeletionProcesses.push(item);
        } else if (item instanceof File) {
            this.files.push(item);
        }
    }

    public addChangedObjectsIdentifiersDuringDatawalletSync(identifiers: string[]): void {
        this.changedObjectIdentifiersDuringDatawalletSync.push(...identifiers);
    }
}
