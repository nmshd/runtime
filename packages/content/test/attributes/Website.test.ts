import { ParsingError } from "@js-soft/ts-serval";
import { Website } from "@nmshd/content";

describe("Test valid URLs", () => {
    const validUrls = [
        "www.google.com",
        "https://inwänd.it",
        "http://inwind.it",
        "https://enmeshed.de/blog/meilenstein-enmeshed-als-komponente-ablage-in-mein-bildungsraum-geht-in-die-testphase-der-beta-version/",
        "www.foo.www.www.enmeshed.eu",
        "https://example.org:8080/mein/ordner/bericht"
    ];

    test.each(validUrls)("URL %s is recognized as valid", (url) => {
        const validWebsite = Website.from({ value: url });
        expect(validWebsite.value.toString()).toBe(url);
    });
});

describe("Test invalid URLs", () => {
    const invalidUrls = ["google-.de", "www.google", "www.-google", "https://inwind.test it"];

    test.each(invalidUrls)("URL %s is recognized as invalid", (url) => {
        const invalidWebsiteCall = () => {
            Website.from({
                value: url
            });
        };
        expect(invalidWebsiteCall).toThrow(
            new ParsingError(
                "Website",
                "value",
                "Value does not match regular expression /^([A-Za-z]+:\\/\\/)?((www\\.)|(?!www\\.))([A-Za-z0-9ÄäÖöÜüß]([A-Za-zÄäÖöÜüß0-9-]{0,61}[A-Za-zÄäÖöÜüß0-9])?\\.)+([A-Za-z0-9ÄäÖöÜüß]([A-Za-zÄäÖöÜüß0-9-]{0,61}[A-Za-zÄäÖöÜüß0-9])?)(:[0-9]+)?(\\/[A-Za-zÄäÖöÜüß0-9?#@!$&'()*+,;=%-]*)*$/"
            )
        );
    });

    test("returns an error when trying to create an Attribute Value Type Website wich is empty", function () {
        const invalidWebsiteCall = () => {
            Website.from({
                value: ""
            });
        };
        expect(invalidWebsiteCall).toThrow(new ParsingError("Website", "value", "Value is shorter than 3 characters"));
    });
});
