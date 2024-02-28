import { ILogger } from "@js-soft/logging-abstractions";
import { AccountController } from "../../modules";
import { IConfig } from "../Transport";
import { CoreDate } from "../types/CoreDate";
import { AuthClient } from "./AuthClient";
import { CredentialsBasic } from "./RESTClientAuthenticate";

export abstract class AbstractAuthenticator {
    private request?: Promise<void>;
    private expiry?: CoreDate;
    private token?: string;

    private readonly authClient: AuthClient;
    public constructor(private readonly config: IConfig) {
        this.authClient = new AuthClient(config);
    }

    public async getToken(): Promise<string> {
        if (this.token && !this.isExpired()) {
            return this.token;
        }

        await this.authenticate();
        return this.token!;
    }

    public debugLog(_logger: ILogger): void {
        _logger.error("Current token is: ", this.token);
        _logger.error("Expiry is: ", this.expiry?.toISOString());
    }

    public clear(): void {
        this.token = undefined;
        this.expiry = undefined;
    }

    private isExpired(): boolean {
        if (!this.expiry) {
            return true;
        }

        // A token is also considered as expired when 10 seconds are left, to make up for network latency
        const expired = this.expiry.subtract({ seconds: 10 }).isExpired();
        return expired;
    }

    private async authenticate() {
        if (this.request) {
            return await this.request;
        }

        this.clear();
        this.request = this.authenticateInternal();

        try {
            await this.request;
        } finally {
            this.request = undefined;
        }
    }

    private async authenticateInternal() {
        const deviceCredentials = await this.getCredentials();
        const params = {
            grantType: "password",
            clientId: this.config.platformClientId,
            clientSecret: this.config.platformClientSecret,
            username: deviceCredentials.username,
            password: deviceCredentials.password
        };

        const result = await this.authClient.authenticate(params);
        this.token = result.value.token;
        this.expiry = result.value.expiry;
    }

    abstract getCredentials(): Promise<CredentialsBasic>;
}

export class Authenticator extends AbstractAuthenticator {
    public constructor(private readonly accountController: AccountController) {
        super(accountController.config);
    }

    public async getCredentials(): Promise<CredentialsBasic> {
        const activeDevice = await this.accountController.activeDevice.getCredentials();
        return {
            username: activeDevice.username,
            password: activeDevice.password
        };
    }
}
