import { CoreIdHelper } from "@nmshd/core-types";

export class TransportIds {
    public static readonly generic = new CoreIdHelper("");
    public static readonly secret = new CoreIdHelper("TRPSEC");
    public static readonly relationshipSecret = new CoreIdHelper("TRPRSE");
    public static readonly relationshipTemplateKey = new CoreIdHelper("TRPRTK");
    public static readonly datawalletModification = new CoreIdHelper("TRPDWM");
}
