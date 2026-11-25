import { GenericContainer, StartedTestContainer, Wait } from "testcontainers";
import { resolve } from "node:path";

export async function startEudiplo(): Promise<StartedTestContainer> {
    return await new GenericContainer("ghcr.io/eudiplo/eudiplo:10.1.0@sha256:917406fe2be9843a2dadfa3d835ec6da1b00b19fee65523f282ca97134065462")
        .withEnvironment({
            PUBLIC_URL: "http://localhost:3000", // eslint-disable-line @typescript-eslint/naming-convention
            MASTER_SECRET: "OgwrDcgVQQ2yZwcFt7kPxQm3nUF+X3etF6MdLTstZAY=", // eslint-disable-line @typescript-eslint/naming-convention
            AUTH_CLIENT_ID: "root", // eslint-disable-line @typescript-eslint/naming-convention
            AUTH_CLIENT_SECRET: "test", // eslint-disable-line @typescript-eslint/naming-convention
            CONFIG_IMPORT_MODE: "upsert", // eslint-disable-line @typescript-eslint/naming-convention
            CONFIG_FOLDER: "/app/assets/config", // eslint-disable-line @typescript-eslint/naming-convention
            PORT: "3000" // eslint-disable-line @typescript-eslint/naming-convention
        })
        .withExposedPorts({ container: 3000, host: 3000 })
        .withCopyDirectoriesToContainer([
            {
                source: resolve(process.cwd(), "../../.dev/eudiplo/config"),
                target: "/app/assets/config"
            }
        ])
        .withStartupTimeout(60000)
        .withWaitStrategy(Wait.forHealthCheck())
        .start();
}
