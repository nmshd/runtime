import { ParsingError } from "@js-soft/ts-serval";
import { Website } from "../../src";

describe("creation of RepositoryAttributes of Attribute Value Type Website", function () {
    test("can create a RepositoryAttribute of Attribute Value Type Website", function () {
        const validWebsite = Website.from({
            value: "https://inwind.it"
        });
        expect(validWebsite.value.toString()).toBe("https://inwind.it");
    });
    test("can create a RepositoryAttribute of Attribute Value Type Website with the German 'ä' in its domain", function () {
        const validWebsite = Website.from({
            value: "https://inwänd.it"
        });
        expect(validWebsite.value.toString()).toBe("https://inwänd.it");
    });
    test("can create a RepositoryAttribute of Attribute Value Type Website without www.", function () {
        const validWebsite = Website.from({
            value: "//google.it"
        });
        expect(validWebsite.value.toString()).toBe("//google.it");
    });
    test("can create a RepositoryAttribute of Attribute Value Type Website with a enhanced path", function () {
        const validWebsite = Website.from({
            value: "https://enmeshed.de/blog/meilenstein-enmeshed-als-komponente-ablage-in-mein-bildungsraum-geht-in-die-testphase-der-beta-version/"
        });
        expect(validWebsite.value.toString()).toBe(
            "https://enmeshed.de/blog/meilenstein-enmeshed-als-komponente-ablage-in-mein-bildungsraum-geht-in-die-testphase-der-beta-version/"
        );
    });
    test("returns an error when trying to create an Attribute Value Type Website with a blank in the value for Website", function () {
        const invalidWebsiteCall = () => {
            Website.from({
                value: "Hugo https://inwind.it"
            });
        };
        expect(invalidWebsiteCall).toThrow(
            new ParsingError(
                "Website",
                "value",
                "Value does not match regular expression /^(?:|[A-Za-z]{3,9}:(?:\\/\\/)?|[:](?:\\/\\/)?|(?:\\/\\/))(?:(www[.])(?:[a-z0-9\\u00c4\\u00e4\\u00d6\\u00f6\\u00dc\\u00fc\\u00df](?:[A-Za-z\\u00c4\\u00e4\\u00d6\\u00f6\\u00dc\\u00fc\\u00df0-9-]{0,61}[A-Za-z\\u00c4\\u00e4\\u00d6\\u00f6\\u00dc\\u00fc\\u00df0-9]){0,1}[.])|((?!www.)(?:[a-z0-9\\u00c4\\u00e4\\u00d6\\u00f6\\u00dc\\u00fc\\u00df](?:[A-Za-z\\u00c4\\u00e4\\u00d6\\u00f6\\u00dc\\u00fc\\u00df0-9-]{0,61}[A-Za-z\\u00c4\\u00e4\\u00d6\\u00f6\\u00dc\\u00fc\\u00df0-9]){0,1}[.])))[A-Za-z\\u00c4\\u00e4\\u00d6\\u00f6\\u00dc\\u00fc\\u00df0-9](?:[A-Za-z\\u00c4\\u00e4\\u00d6\\u00f6\\u00dc\\u00fc\\u00df0-9-]{0,61}[A-Za-z\\u00c4\\u00e4\\u00d6\\u00f6\\u00dc\\u00fc\\u00df0-9])(\\:[0-9]+){0,}(?:[/][\\w\\u00c4\\u00e4\\u00d6\\u00f6\\u00dc\\u00fc\\u00df\\-_?#@!\\$&'\\(\\)\\*\\+,;=]{0,}){0,}$/"
            )
        );
    });
    test("returns an error when trying to create an Attribute Value Type Website without the right ending when it starts with www.", function () {
        const invalidWebsiteCall = () => {
            Website.from({
                value: "www.google"
            });
        };
        expect(invalidWebsiteCall).toThrow(
            new ParsingError(
                "Website",
                "value",
                "Value does not match regular expression /^(?:|[A-Za-z]{3,9}:(?:\\/\\/)?|[:](?:\\/\\/)?|(?:\\/\\/))(?:(www[.])(?:[a-z0-9\\u00c4\\u00e4\\u00d6\\u00f6\\u00dc\\u00fc\\u00df](?:[A-Za-z\\u00c4\\u00e4\\u00d6\\u00f6\\u00dc\\u00fc\\u00df0-9-]{0,61}[A-Za-z\\u00c4\\u00e4\\u00d6\\u00f6\\u00dc\\u00fc\\u00df0-9]){0,1}[.])|((?!www.)(?:[a-z0-9\\u00c4\\u00e4\\u00d6\\u00f6\\u00dc\\u00fc\\u00df](?:[A-Za-z\\u00c4\\u00e4\\u00d6\\u00f6\\u00dc\\u00fc\\u00df0-9-]{0,61}[A-Za-z\\u00c4\\u00e4\\u00d6\\u00f6\\u00dc\\u00fc\\u00df0-9]){0,1}[.])))[A-Za-z\\u00c4\\u00e4\\u00d6\\u00f6\\u00dc\\u00fc\\u00df0-9](?:[A-Za-z\\u00c4\\u00e4\\u00d6\\u00f6\\u00dc\\u00fc\\u00df0-9-]{0,61}[A-Za-z\\u00c4\\u00e4\\u00d6\\u00f6\\u00dc\\u00fc\\u00df0-9])(\\:[0-9]+){0,}(?:[/][\\w\\u00c4\\u00e4\\u00d6\\u00f6\\u00dc\\u00fc\\u00df\\-_?#@!\\$&'\\(\\)\\*\\+,;=]{0,}){0,}$/"
            )
        );
    });
    test("returns an error when trying to create an Attribute Value Type Website with a - before the . in the value for Website", function () {
        const invalidWebsiteCall = () => {
            Website.from({
                value: "google-.de"
            });
        };
        expect(invalidWebsiteCall).toThrow(
            new ParsingError(
                "Website",
                "value",
                "Value does not match regular expression /^(?:|[A-Za-z]{3,9}:(?:\\/\\/)?|[:](?:\\/\\/)?|(?:\\/\\/))(?:(www[.])(?:[a-z0-9\\u00c4\\u00e4\\u00d6\\u00f6\\u00dc\\u00fc\\u00df](?:[A-Za-z\\u00c4\\u00e4\\u00d6\\u00f6\\u00dc\\u00fc\\u00df0-9-]{0,61}[A-Za-z\\u00c4\\u00e4\\u00d6\\u00f6\\u00dc\\u00fc\\u00df0-9]){0,1}[.])|((?!www.)(?:[a-z0-9\\u00c4\\u00e4\\u00d6\\u00f6\\u00dc\\u00fc\\u00df](?:[A-Za-z\\u00c4\\u00e4\\u00d6\\u00f6\\u00dc\\u00fc\\u00df0-9-]{0,61}[A-Za-z\\u00c4\\u00e4\\u00d6\\u00f6\\u00dc\\u00fc\\u00df0-9]){0,1}[.])))[A-Za-z\\u00c4\\u00e4\\u00d6\\u00f6\\u00dc\\u00fc\\u00df0-9](?:[A-Za-z\\u00c4\\u00e4\\u00d6\\u00f6\\u00dc\\u00fc\\u00df0-9-]{0,61}[A-Za-z\\u00c4\\u00e4\\u00d6\\u00f6\\u00dc\\u00fc\\u00df0-9])(\\:[0-9]+){0,}(?:[/][\\w\\u00c4\\u00e4\\u00d6\\u00f6\\u00dc\\u00fc\\u00df\\-_?#@!\\$&'\\(\\)\\*\\+,;=]{0,}){0,}$/"
            )
        );
    });
});
