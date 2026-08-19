import { GenericContainer, StartedTestContainer, Wait } from "testcontainers";
import { fileURLToPath } from "url";

export async function startEudiplo(): Promise<StartedTestContainer> {
    return await new GenericContainer("ghcr.io/openwallet-foundation/eudiplo:7.2.0@sha256:9ea50673acaa8a69bea2043c3abba5c38bc1a994dafa5a2484e72b5d003fd7d1")
        .withEnvironment({
            PUBLIC_URL: "http://localhost:3000", // eslint-disable-line @typescript-eslint/naming-convention
            MASTER_SECRET: "OgwrDcgVQQ2yZwcFt7kPxQm3nUF+X3etF6MdLTstZAY=", // eslint-disable-line @typescript-eslint/naming-convention
            AUTH_CLIENT_ID: "root", // eslint-disable-line @typescript-eslint/naming-convention
            AUTH_CLIENT_SECRET: "test", // eslint-disable-line @typescript-eslint/naming-convention
            CONFIG_IMPORT: "true", // eslint-disable-line @typescript-eslint/naming-convention
            CONFIG_IMPORT_FORCE: "true", // eslint-disable-line @typescript-eslint/naming-convention
            CONFIG_FOLDER: "/app/assets/config", // eslint-disable-line @typescript-eslint/naming-convention
            PORT: "3000" // eslint-disable-line @typescript-eslint/naming-convention
        })
        .withExposedPorts({ container: 3000, host: 3000 })
        .withCopyDirectoriesToContainer([
            {
                source: fileURLToPath(new URL("config", import.meta.url)),
                target: "/app/assets/config"
            }
        ])
        .withStartupTimeout(60000)
        .withWaitStrategy(Wait.forHealthCheck())
        .start();
}
