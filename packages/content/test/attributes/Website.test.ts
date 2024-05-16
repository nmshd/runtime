import { ParsingError } from "@js-soft/ts-serval";
import { Website } from "../../src";

describe("creation of RepositoryAttributes of Attribute value type Website", function () {
    test("can create a RepositoryAttribute of Attribute value type Website with the beginning www.", function () {
        const validWebsite = Website.from({
            value: "www.inwind.it"
        });
        expect(validWebsite.value.toString()).toBe("www.inwind.it");
    });
    test("can create a RepositoryAttribute of Attribute value type Website", function () {
        const validWebsite = Website.from({
            value: "https://inwind.it"
        });
        expect(validWebsite.value.toString()).toBe("https://inwind.it");
    });
    test("can create a RepositoryAttribute of Attribute value type Website with the German 'ä' in its domain", function () {
        const validWebsite = Website.from({
            value: "https://inwänd.it"
        });
        expect(validWebsite.value.toString()).toBe("https://inwänd.it");
    });
    test("can create a RepositoryAttribute of Attribute value type Website without www.", function () {
        const validWebsite = Website.from({
            value: "//google.it"
        });
        expect(validWebsite.value.toString()).toBe("//google.it");
    });
    test("can create a RepositoryAttribute of Attribute value type Website with an enhanced path", function () {
        const validWebsite = Website.from({
            value: "https://enmeshed.de/blog/meilenstein-enmeshed-als-komponente-ablage-in-mein-bildungsraum-geht-in-die-testphase-der-beta-version/"
        });
        expect(validWebsite.value.toString()).toBe(
            "https://enmeshed.de/blog/meilenstein-enmeshed-als-komponente-ablage-in-mein-bildungsraum-geht-in-die-testphase-der-beta-version/"
        );
    });
    test("can create a RepositoryAttribute of Attribute value type Website with an encoded url", function () {
        const validWebsite = Website.from({
            value: "https://inwind.test/%20it/"
        });
        expect(validWebsite.value.toString()).toBe("https://inwind.test/%20it/");
    });
    test("can create a RepositoryAttribute of Attribute value type Website with a port ", function () {
        const validWebsite = Website.from({
            value: "https://example.org:8080/mein/ordner/bericht"
        });
        expect(validWebsite.value.toString()).toBe("https://example.org:8080/mein/ordner/bericht");
    });
    test("returns an error when trying to create an Attribute value type Website with a blank in the value for Website", function () {
        const invalidWebsiteCall = () => {
            Website.from({
                value: "https://inwind.test it"
            });
        };
        expect(invalidWebsiteCall).toThrow(
            new ParsingError(
                "Website",
                "value",
                "Value does not match regular expression /^(?:|[A-Za-z]{3,9}:(?:[/][/])?|[:](?:[/][/])?|(?:[/][/]))(?:(www[.])(?:[A-Za-z0-9\\u00c4\\u00e4\\u00d6\\u00f6\\u00dc\\u00fc\\u00df](?:[A-Za-z\\u00c4\\u00e4\\u00d6\\u00f6\\u00dc\\u00fc\\u00df0-9-]{0,61}[A-Za-z\\u00c4\\u00e4\\u00d6\\u00f6\\u00dc\\u00fc\\u00df0-9]){0,1}[.])|((?!www[.])(?:[A-Za-z0-9\\u00c4\\u00e4\\u00d6\\u00f6\\u00dc\\u00fc\\u00df](?:[A-Za-z\\u00c4\\u00e4\\u00d6\\u00f6\\u00dc\\u00fc\\u00df0-9-]{0,61}[A-Za-z\\u00c4\\u00e4\\u00d6\\u00f6\\u00dc\\u00fc\\u00df0-9]){0,1}[.])))[A-Za-z\\u00c4\\u00e4\\u00d6\\u00f6\\u00dc\\u00fc\\u00df0-9](?:[A-Za-z\\u00c4\\u00e4\\u00d6\\u00f6\\u00dc\\u00fc\\u00df0-9-]{0,61}[A-Za-z\\u00c4\\u00e4\\u00d6\\u00f6\\u00dc\\u00fc\\u00df0-9])(?:[:][0-9]+){0,}(?:[/][A-Za-z\\u00c4\\u00e4\\u00d6\\u00f6\\u00dc\\u00fc\\u00df0-9?#@!$&'()*+/,;=%-]{0,}){0,}$/"
            )
        );
    });
    test("returns an error when trying to create an Attribute value type Website without the right ending when it starts with www.", function () {
        const invalidWebsiteCall = () => {
            Website.from({
                value: "www.google"
            });
        };
        expect(invalidWebsiteCall).toThrow(
            new ParsingError(
                "Website",
                "value",
                "Value does not match regular expression /^(?:|[A-Za-z]{3,9}:(?:[/][/])?|[:](?:[/][/])?|(?:[/][/]))(?:(www[.])(?:[A-Za-z0-9\\u00c4\\u00e4\\u00d6\\u00f6\\u00dc\\u00fc\\u00df](?:[A-Za-z\\u00c4\\u00e4\\u00d6\\u00f6\\u00dc\\u00fc\\u00df0-9-]{0,61}[A-Za-z\\u00c4\\u00e4\\u00d6\\u00f6\\u00dc\\u00fc\\u00df0-9]){0,1}[.])|((?!www[.])(?:[A-Za-z0-9\\u00c4\\u00e4\\u00d6\\u00f6\\u00dc\\u00fc\\u00df](?:[A-Za-z\\u00c4\\u00e4\\u00d6\\u00f6\\u00dc\\u00fc\\u00df0-9-]{0,61}[A-Za-z\\u00c4\\u00e4\\u00d6\\u00f6\\u00dc\\u00fc\\u00df0-9]){0,1}[.])))[A-Za-z\\u00c4\\u00e4\\u00d6\\u00f6\\u00dc\\u00fc\\u00df0-9](?:[A-Za-z\\u00c4\\u00e4\\u00d6\\u00f6\\u00dc\\u00fc\\u00df0-9-]{0,61}[A-Za-z\\u00c4\\u00e4\\u00d6\\u00f6\\u00dc\\u00fc\\u00df0-9])(?:[:][0-9]+){0,}(?:[/][A-Za-z\\u00c4\\u00e4\\u00d6\\u00f6\\u00dc\\u00fc\\u00df0-9?#@!$&'()*+/,;=%-]{0,}){0,}$/"
            )
        );
    });
    test("returns an error when trying to create an Attribute value type Website with a domain which ends with a - because this is not allowed for domains.", function () {
        const invalidWebsiteCall = () => {
            Website.from({
                value: "google-.de"
            });
        };
        expect(invalidWebsiteCall).toThrow(
            new ParsingError(
                "Website",
                "value",
                "Value does not match regular expression /^(?:|[A-Za-z]{3,9}:(?:[/][/])?|[:](?:[/][/])?|(?:[/][/]))(?:(www[.])(?:[A-Za-z0-9\\u00c4\\u00e4\\u00d6\\u00f6\\u00dc\\u00fc\\u00df](?:[A-Za-z\\u00c4\\u00e4\\u00d6\\u00f6\\u00dc\\u00fc\\u00df0-9-]{0,61}[A-Za-z\\u00c4\\u00e4\\u00d6\\u00f6\\u00dc\\u00fc\\u00df0-9]){0,1}[.])|((?!www[.])(?:[A-Za-z0-9\\u00c4\\u00e4\\u00d6\\u00f6\\u00dc\\u00fc\\u00df](?:[A-Za-z\\u00c4\\u00e4\\u00d6\\u00f6\\u00dc\\u00fc\\u00df0-9-]{0,61}[A-Za-z\\u00c4\\u00e4\\u00d6\\u00f6\\u00dc\\u00fc\\u00df0-9]){0,1}[.])))[A-Za-z\\u00c4\\u00e4\\u00d6\\u00f6\\u00dc\\u00fc\\u00df0-9](?:[A-Za-z\\u00c4\\u00e4\\u00d6\\u00f6\\u00dc\\u00fc\\u00df0-9-]{0,61}[A-Za-z\\u00c4\\u00e4\\u00d6\\u00f6\\u00dc\\u00fc\\u00df0-9])(?:[:][0-9]+){0,}(?:[/][A-Za-z\\u00c4\\u00e4\\u00d6\\u00f6\\u00dc\\u00fc\\u00df0-9?#@!$&'()*+/,;=%-]{0,}){0,}$/"
            )
        );
    });
    test("returns an error when trying to create an Attribute value type Website with a domain which begins with a - because this is not allowed for domains.", function () {
        const invalidWebsiteCall = () => {
            Website.from({
                value: "-google.de"
            });
        };
        expect(invalidWebsiteCall).toThrow(
            new ParsingError(
                "Website",
                "value",
                "Value does not match regular expression /^(?:|[A-Za-z]{3,9}:(?:[/][/])?|[:](?:[/][/])?|(?:[/][/]))(?:(www[.])(?:[A-Za-z0-9\\u00c4\\u00e4\\u00d6\\u00f6\\u00dc\\u00fc\\u00df](?:[A-Za-z\\u00c4\\u00e4\\u00d6\\u00f6\\u00dc\\u00fc\\u00df0-9-]{0,61}[A-Za-z\\u00c4\\u00e4\\u00d6\\u00f6\\u00dc\\u00fc\\u00df0-9]){0,1}[.])|((?!www[.])(?:[A-Za-z0-9\\u00c4\\u00e4\\u00d6\\u00f6\\u00dc\\u00fc\\u00df](?:[A-Za-z\\u00c4\\u00e4\\u00d6\\u00f6\\u00dc\\u00fc\\u00df0-9-]{0,61}[A-Za-z\\u00c4\\u00e4\\u00d6\\u00f6\\u00dc\\u00fc\\u00df0-9]){0,1}[.])))[A-Za-z\\u00c4\\u00e4\\u00d6\\u00f6\\u00dc\\u00fc\\u00df0-9](?:[A-Za-z\\u00c4\\u00e4\\u00d6\\u00f6\\u00dc\\u00fc\\u00df0-9-]{0,61}[A-Za-z\\u00c4\\u00e4\\u00d6\\u00f6\\u00dc\\u00fc\\u00df0-9])(?:[:][0-9]+){0,}(?:[/][A-Za-z\\u00c4\\u00e4\\u00d6\\u00f6\\u00dc\\u00fc\\u00df0-9?#@!$&'()*+/,;=%-]{0,}){0,}$/"
            )
        );
    });
});
