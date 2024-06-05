import { ParsingError } from "@js-soft/ts-serval";
import { Website } from "../../src";

describe("Test valid URLs", () => {
    const validUrls = [
        "www.google.com",
        "https://döner.cooking",
        "http://inwind.it",
        "https://enmeshed.de/blog/meilenstein-enmeshed-als-komponente-ablage-in-mein-bildungsraum-geht-in-die-testphase-der-beta-version/",
        "www.foo.www.www.enmeshed.eu",
        "https://example.org:8080/mein/ordner/bericht"
    ];

    test.each(validUrls)("url %s is recognized as valid", (url) => {
        const validWebsite = Website.from({ value: url });
        expect(validWebsite.value.toString()).toBe(url);
    });
});

describe("Test invalid URLs", () => {
    const invalidUrls = ["google-.de", "www.google", "www.-google", "https://inwind.test it"];

    test.each(invalidUrls)("url %s is recognized as invalid", (url) => {
        const invalidWebsiteCall = () => {
            Website.from({
                value: url
            });
        };
        expect(invalidWebsiteCall).toThrow(
            new ParsingError(
                "Website",
                "value",
                "Value does not match regular expression /^([A-Za-z]+:\\/\\/)?(www\\.([A-Za-z0-9ÄäÖöÜüß]([A-Za-zÄäÖöÜüß0-9-]{0,61}[A-Za-zÄäÖöÜüß0-9])?\\.)+|((?!www[.])([A-Za-z0-9ÄäÖöÜüß]([A-Za-zÄäÖöÜüß0-9-]{0,61}[A-Za-zÄäÖöÜüß0-9])?[.]))([A-Za-z0-9ÄäÖöÜüß]([A-Za-zÄäÖöÜüß0-9-]{0,61}[A-Za-zÄäÖöÜüß0-9])?\\.)*)[A-Za-zÄäÖöÜüß0-9]([A-Za-zÄäÖöÜüß0-9-]{0,61}[A-Za-zÄäÖöÜüß0-9])([:][0-9]+)*(\\/[A-Za-zÄäÖöÜüß0-9?#@!$&'()*+,;=%-]*)*$/"
            )
        );
    });
});
