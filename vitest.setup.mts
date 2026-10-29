import { beforeAll } from "vitest";
import { SodiumWrapper } from "@nmshd/crypto";

beforeAll(async () => {
    await SodiumWrapper.ready();
});
