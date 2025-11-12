import { AppRuntimeErrors } from "./AppRuntimeErrors.js";
import { LocalAccountSession } from "./multiAccount/index.js";

export class SessionStorage {
    private readonly _availableSessions: LocalAccountSession[] = [];
    private _currentSession?: LocalAccountSession;

    public set currentSession(session: LocalAccountSession) {
        this._currentSession = session;
    }

    public get currentSession(): LocalAccountSession {
        if (!this._currentSession) {
            throw AppRuntimeErrors.general.currentSessionUnavailable();
        }
        return this._currentSession;
    }

    public getSessions(): LocalAccountSession[] {
        return this._availableSessions;
    }

    public findSession(accountReference: string): LocalAccountSession | undefined {
        return this._availableSessions.find((item) => item.account.address === accountReference || item.account.id === accountReference);
    }

    public addSession(session: LocalAccountSession): void {
        if (this.findSession(session.account.id)) throw new Error("Session already exists");

        this._availableSessions.push(session);
    }

    public removeSession(accountReference: string): void {
        const session = this.findSession(accountReference);
        if (!session) return;

        this._availableSessions.splice(this._availableSessions.indexOf(session), 1);
    }
}
