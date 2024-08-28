import { buildInformation as servalBuildInformation } from "@js-soft/ts-serval";

export const buildInformation = {
    version: "{{version}}",
    build: "{{build}}",
    date: "{{date}}",
    commit: "{{commit}}",
    dependencies: "{{dependencies}}",
    libraries: { serval: servalBuildInformation }
};
