import path from "path";
import { GenericContainer, StartedTestContainer, Wait } from "testcontainers";

export async function startEudiplo(): Promise<StartedTestContainer> {
    return await new GenericContainer("ghcr.io/openwallet-foundation-labs/eudiplo:4.1.0@sha256:14bc55723f8cdca0837b91541c80466e406e753c1febd07a26400fab1ca37e2d")
        .withEnvironment({
            PUBLIC_URL: "http://localhost:3000", // eslint-disable-line @typescript-eslint/naming-convention
            MASTER_SECRET: "OgwrDcgVQQ2yZwcFt7kPxQm3nUF+X3etF6MdLTstZAY=", // eslint-disable-line @typescript-eslint/naming-convention
            AUTH_CLIENT_ID: "root", // eslint-disable-line @typescript-eslint/naming-convention
            AUTH_CLIENT_SECRET: "test", // eslint-disable-line @typescript-eslint/naming-convention
            CONFIG_IMPORT: "true", // eslint-disable-line @typescript-eslint/naming-convention
            CONFIG_FOLDER: "/app/assets/config", // eslint-disable-line @typescript-eslint/naming-convention
            PORT: "3000" // eslint-disable-line @typescript-eslint/naming-convention
        } as Record<string, string>)
        .withExposedPorts({ container: 3000, host: 3000 })
        .withCopyDirectoriesToContainer([
            {
                source: path.resolve(path.join(__dirname, "config")),
                target: "/app/assets/config"
            }
        ])
        .withStartupTimeout(60000)
        .withWaitStrategy(Wait.forHealthCheck())
        .start();
}
