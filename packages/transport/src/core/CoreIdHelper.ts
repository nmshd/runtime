import { CoreId, ICoreIdHelper } from "@nmshd/core-types";
import { Random, RandomCharacterRange } from "../util";
import { TransportError } from "./TransportError";

export class CoreIdHelper implements ICoreIdHelper {
    public static notPrefixed = new CoreIdHelper("");

    private readonly coreIdRegex: RegExp;

    public constructor(
        public readonly prefix: string,
        private readonly validateOnly = false
    ) {
        this.coreIdRegex = new RegExp(`${prefix}[${RandomCharacterRange.Alphanumeric}]{${20 - prefix.length}}`);
    }

    public async generate(): Promise<CoreId> {
        if (this.validateOnly) {
            throw new TransportError("This CoreIdHelper is set up for validation only.");
        }

        return await this.generateUnsafe();
    }

    public async generateUnsafe(): Promise<CoreId> {
        if (this.prefix.length > 6) {
            throw new Error(`The prefix "${this.prefix}" is too long. It must not be longer than 6 characters.`);
        }

        const random = await Random.string(20 - this.prefix.length, RandomCharacterRange.Alphanumeric);
        return CoreId.from(this.prefix.toUpperCase() + random);
    }

    public validate(id: string | CoreId): boolean {
        if (id instanceof CoreId) id = id.toString();

        return this.coreIdRegex.test(id);
    }
}
