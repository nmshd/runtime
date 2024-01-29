import { CoreAddress } from "@nmshd/transport";

export class TestIdentity {
    public static readonly SENDER = CoreAddress.from("{{Sender}}");
    public static readonly RECIPIENT = CoreAddress.from("{{Recipient}}");
    public static readonly EMPTY = CoreAddress.from("{{Empty}}");
    public static readonly UNDEFINED = CoreAddress.from("{{Undefined}}");
    public static readonly SOMEONE_ELSE = CoreAddress.from("{{SomeoneElse}}");
}
