import { buildInformation as servalBuildInformation } from "@js-soft/ts-serval";
import { buildInformation as cryptoBuildInformation } from "@nmshd/crypto";

export const buildInformation = {
    version: "{{version}}",
    build: "{{build}}",
    date: "{{date}}",
    commit: "{{commit}}",
    dependencies: "{{dependencies}}",
    libraries: {
        serval: servalBuildInformation,
        crypto: cryptoBuildInformation
    }
};
