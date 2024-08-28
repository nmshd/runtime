import { CoreId } from "@nmshd/core-types";
import { RandomCharacterRange } from "../util";
import { GeneratableCoreId } from "./GeneratableCoreId";
import { TransportError } from "./TransportError";

export class CoreIdHelper {
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

        return await GeneratableCoreId.generate(this.prefix);
    }

    public async generateUnsafe(): Promise<CoreId> {
        return await GeneratableCoreId.generate(this.prefix);
    }

    public validate(id: string | CoreId): boolean {
        if (id instanceof CoreId) id = id.toString();

        return this.coreIdRegex.test(id);
    }
}
