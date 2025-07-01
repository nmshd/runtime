import { ApplicationError } from "@js-soft/ts-utils";

class AppStringProcessor {
    public wrongURL(): ApplicationError {
        return new ApplicationError("error.appruntime.appStringProcessor.wrongURL", "The given URL is in a wrong format.");
    }

    public wrongCode(): ApplicationError {
        return new ApplicationError("error.appruntime.appStringProcessor.wrongCode", "The given code is in a wrong format.");
    }

    public invalidReference(): ApplicationError {
        return new ApplicationError("error.appruntime.appStringProcessor.invalidReference", "The given code does not contain a valid truncated reference.");
    }

    public notSupportedTokenContent(): ApplicationError {
        return new ApplicationError("error.appruntime.appStringProcessor.notSupportedTokenContent", "The scanned code is not supported in this context.");
    }

    public deviceOnboardingNotAllowed(): ApplicationError {
        return new ApplicationError(
            "error.appruntime.appStringProcessor.deviceOnboardingNotAllowed",
            "The Token contains a device onboarding info, but this is not allowed in this context."
        );
    }

    public passwordNotProvided(): ApplicationError {
        return new ApplicationError("error.appruntime.appStringProcessor.passwordNotProvided", "No password was provided.");
    }

    public passwordRetryLimitReached(): ApplicationError {
        return new ApplicationError("error.appruntime.appStringProcessor.passwordRetryLimitReached", "The maximum number of attempts to enter the password was reached.");
    }

    public noDeviceOnboardingCode(): ApplicationError {
        return new ApplicationError(
            "error.appruntime.appStringProcessor.noDeviceOnboardingCode",
            "The scanned code does not contain a device onboarding info, but this scanner is only able to process device onboarding codes."
        );
    }
}

class General {
    public currentSessionUnavailable(): ApplicationError {
        return new ApplicationError("error.appruntime.general.currentSessionUnavailable", "The currentSession is not available. Try to execute login before this operation.");
    }

    public addressUnavailable(): ApplicationError {
        return new ApplicationError(
            "error.appruntime.general.addressUnavailable",
            "The address of the account is not available. This might be a permanent problem caused by a failed login."
        );
    }

    public appServicesUnavailable(): ApplicationError {
        return new ApplicationError("error.appruntime.general.appServicesUnavailable", "The app services are not available. Try to execute login before this operation.");
    }

    public noAccountAvailable(error?: Error): ApplicationError {
        return new ApplicationError("error.appruntime.general.noAccountAvailable", "There is no account available for this action.", error);
    }

    public noAccountAvailableForIdentityTruncated(): ApplicationError {
        return new ApplicationError(
            "error.appruntime.general.noAccountAvailableForIdentityTruncated",
            "There is no account matching the given 'forIdentityTruncated'.",
            "It seems no eligible account is available for this action, because the scanned code is intended for a specific Identity that is not available on this device."
        );
    }
}

class Startup {
    public uiBridgeAlreadyRegistered(): ApplicationError {
        return new ApplicationError("error.appruntime.startup.uiBridgeAlreadyRegistered", "The UI bridge was already registered for this Runtime instance.");
    }
}

class PushNotificationModule {
    public tokenRegistrationNotPossible(details: string, rootError?: Error): ApplicationError {
        return new ApplicationError(
            "error.runtime.module.PushNotificationModule.TokenRegistrationNotPossible",
            `Registering the Push Notification Token for the account was not possible. Root cause: '${details}'`,
            rootError
        );
    }
}

class Modules {
    public readonly pushNotificationModule = new PushNotificationModule();
}

export class AppRuntimeErrors {
    public static readonly appStringProcessor = new AppStringProcessor();
    public static readonly general = new General();
    public static readonly startup = new Startup();
    public static readonly modules = new Modules();
}
