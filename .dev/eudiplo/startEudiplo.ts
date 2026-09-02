import { GenericContainer, StartedTestContainer, Wait } from "testcontainers";
import { fileURLToPath } from "url";

export async function startEudiplo(): Promise<StartedTestContainer> {
    return await new GenericContainer("ghcr.io/openwallet-foundation/eudiplo:7.4.0@sha256:8658f65b4ea06c5d399cedca6facf666170b1034b65a718f509f9f7428b40057")
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
