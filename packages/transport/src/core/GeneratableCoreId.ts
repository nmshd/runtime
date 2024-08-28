import { CoreId } from "@nmshd/core-types";
import { Random, RandomCharacterRange } from "../util";

export class GeneratableCoreId extends CoreId {
    public static async generate(prefix = ""): Promise<CoreId> {
        if (prefix.length > 6) {
            throw new Error(`The prefix "${prefix}" is too long. It must not be longer than 6 characters.`);
        }

        const random = await Random.string(20 - prefix.length, RandomCharacterRange.Alphanumeric);
        return this.from(prefix.toUpperCase() + random);
    }
}
