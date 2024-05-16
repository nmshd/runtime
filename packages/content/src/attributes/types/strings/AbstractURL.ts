import { serialize, validate } from "@js-soft/ts-serval";
import { RenderHints, RenderHintsDataType, RenderHintsEditType, ValueHints } from "../../../attributes/hints";
import { AbstractString } from "../AbstractString";

export abstract class AbstractURL extends AbstractString {
    @serialize()
    @validate({
        min: 3,
        max: 1024,
        regExp: new RegExp(
            /^(?:|[A-Za-z]{3,9}:(?:[/][/])?|[:](?:[/][/])?|(?:[/][/]))(?:(www[.])(?:[A-Za-z0-9\u00c4\u00e4\u00d6\u00f6\u00dc\u00fc\u00df](?:[A-Za-z\u00c4\u00e4\u00d6\u00f6\u00dc\u00fc\u00df0-9-]{0,61}[A-Za-z\u00c4\u00e4\u00d6\u00f6\u00dc\u00fc\u00df0-9]){0,1}[.])|((?!www[.])(?:[A-Za-z0-9\u00c4\u00e4\u00d6\u00f6\u00dc\u00fc\u00df](?:[A-Za-z\u00c4\u00e4\u00d6\u00f6\u00dc\u00fc\u00df0-9-]{0,61}[A-Za-z\u00c4\u00e4\u00d6\u00f6\u00dc\u00fc\u00df0-9]){0,1}[.])))[A-Za-z\u00c4\u00e4\u00d6\u00f6\u00dc\u00fc\u00df0-9](?:[A-Za-z\u00c4\u00e4\u00d6\u00f6\u00dc\u00fc\u00df0-9-]{0,61}[A-Za-z\u00c4\u00e4\u00d6\u00f6\u00dc\u00fc\u00df0-9])(?:[:][0-9]+){0,}(?:[/][A-Za-z\u00c4\u00e4\u00d6\u00f6\u00dc\u00fc\u00df0-9?#@!$&'()*+/,;=%-]{0,}){0,}$/
        )
    })
    public override value: string;

    public static override get valueHints(): ValueHints {
        return super.valueHints.copyWith({
            min: 3,
            max: 1024,
            pattern:
                "/^(?:|[A-Za-z]{3,9}:(?:[/][/])?|[:](?:[/][/])?|(?:[/][/]))(?:(www[.])(?:[A-Za-z0-9\u00c4\u00e4\u00d6\u00f6\u00dc\u00fc\u00df](?:[A-Za-z\u00c4\u00e4\u00d6\u00f6\u00dc\u00fc\u00df0-9-]{0,61}[A-Za-z\u00c4\u00e4\u00d6\u00f6\u00dc\u00fc\u00df0-9]){0,1}[.])|((?!www[.])(?:[A-Za-z0-9\u00c4\u00e4\u00d6\u00f6\u00dc\u00fc\u00df](?:[A-Za-z\u00c4\u00e4\u00d6\u00f6\u00dc\u00fc\u00df0-9-]{0,61}[A-Za-z\u00c4\u00e4\u00d6\u00f6\u00dc\u00fc\u00df0-9]){0,1}[.])))[A-Za-z\u00c4\u00e4\u00d6\u00f6\u00dc\u00fc\u00df0-9](?:[A-Za-z\u00c4\u00e4\u00d6\u00f6\u00dc\u00fc\u00df0-9-]{0,61}[A-Za-z\u00c4\u00e4\u00d6\u00f6\u00dc\u00fc\u00df0-9])(?:[:][0-9]+){0,}(?:[/][A-Za-z\u00c4\u00e4\u00d6\u00f6\u00dc\u00fc\u00df0-9?#@!$&'()*+/,;=%-]{0,}){0,}$/"
        });
    }

    public static override get renderHints(): RenderHints {
        return super.renderHints.copyWith({
            editType: RenderHintsEditType.InputLike,
            dataType: RenderHintsDataType.URL
        });
    }
}
