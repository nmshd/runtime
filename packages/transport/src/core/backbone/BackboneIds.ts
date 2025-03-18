import { CoreIdHelper } from "@nmshd/core-types";

export class BackboneIds {
    public static readonly file = new CoreIdHelper("FIL", true);
    public static readonly relationship = new CoreIdHelper("REL", true);
    public static readonly message = new CoreIdHelper("MSG", true);
    public static readonly relationshipTemplate = new CoreIdHelper("RLT", true);
    public static readonly token = new CoreIdHelper("TOK", true);
    public static readonly device = new CoreIdHelper("DVC", true);
}
