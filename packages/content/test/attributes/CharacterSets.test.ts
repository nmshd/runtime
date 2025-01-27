import { ParsingError, Serializable } from "@js-soft/ts-serval";
import { Consent } from "../../src";
import { characterSets } from "../../src/attributes/constants/CharacterSets";

const mapping = [
    {
        datatype: "A",
        downloaded:
            "(&#x0020;|&#x0027;|[&#x002C;-\&#x002E;]|[&#x0041;-&#x005A;]|[&#x0060;-&#x007A;]|&#x007E;|&#x00A8;|&#x00B4;|&#x00B7;|[&#x00C0;-&#x00D6;]|[&#x00D8;-&#x00F6;]|[&#x00F8;-&#x017E;]|[&#x0187;-&#x0188;]|&#x018F;|&#x0197;|[&#x01A0;-&#x01A1;]|[&#x01AF;-&#x01B0;]|&#x01B7;|[&#x01CD;-&#x01DC;]|[&#x01DE;-&#x01DF;]|[&#x01E2;-&#x01F0;]|[&#x01F4;-&#x01F5;]|[&#x01F8;-&#x01FF;]|[&#x0212;-&#x0213;]|[&#x0218;-&#x021B;]|[&#x021E;-&#x021F;]|[&#x0227;-&#x0233;]|&#x0259;|&#x0268;|&#x0292;|[&#x02B9;-&#x02BA;]|[&#x02BE;-&#x02BF;]|&#x02C8;|&#x02CC;|[&#x1E02;-&#x1E03;]|[&#x1E06;-&#x1E07;]|[&#x1E0A;-&#x1E11;]|&#x1E17;|[&#x1E1C;-&#x1E2B;]|[&#x1E2F;-&#x1E37;]|[&#x1E3A;-&#x1E3B;]|[&#x1E40;-&#x1E49;]|[&#x1E52;-&#x1E5B;]|[&#x1E5E;-&#x1E63;]|[&#x1E6A;-&#x1E6F;]|[&#x1E80;-&#x1E87;]|[&#x1E8C;-&#x1E97;]|&#x1E9E;|[&#x1EA0;-&#x1EF9;]|&#x2019;|&#x2021;|&#x0041;&#x030B;|&#x0043;(&#x0300;|&#x0304;|&#x0306;|&#x0308;|&#x0315;|&#x0323;|&#x0326;|&#x0328;&#x0306;)|&#x0044;&#x0302;|&#x0046;(&#x0300;|&#x0304;)|&#x0047;&#x0300;|&#x0048;(&#x0304;|&#x0326;|&#x0331;)|&#x004A;(&#x0301;|&#x030C;)|&#x004B;(&#x0300;|&#x0302;|&#x0304;|&#x0307;|&#x0315;|&#x031B;|&#x0326;|&#x035F;&#x0048;|&#x035F;&#x0068;)|&#x004C;(&#x0302;|&#x0325;|&#x0325;&#x0304;|&#x0326;)|&#x004D;(&#x0300;|&#x0302;|&#x0306;|&#x0310;)|&#x004E;(&#x0302;|&#x0304;|&#x0306;|&#x0326;)|&#x0050;(&#x0300;|&#x0304;|&#x0315;|&#x0323;)|&#x0052;(&#x0306;|&#x0325;|&#x0325;&#x0304;)|&#x0053;(&#x0300;|&#x0304;|&#x031B;&#x0304;|&#x0331;)|&#x0054;(&#x0300;|&#x0304;|&#x0308;|&#x0315;|&#x031B;)|&#x0055;&#x0307;|&#x005A;(&#x0300;|&#x0304;|&#x0306;|&#x0308;|&#x0327;)|&#x0061;&#x030B;|&#x0063;(&#x0300;|&#x0304;|&#x0306;|&#x0308;|&#x0315;|&#x0323;|&#x0326;|&#x0328;&#x0306;)|&#x0064;&#x0302;|&#x0066;(&#x0300;|&#x0304;)|&#x0067;&#x0300;|&#x0068;(&#x0304;|&#x0326;)|&#x006A;&#x0301;|&#x006B;(&#x0300;|&#x0302;|&#x0304;|&#x0307;|&#x0315;|&#x031B;|&#x0326;|&#x035F;&#x0068;)|&#x006C;(&#x0302;|&#x0325;|&#x0325;&#x0304;|&#x0326;)|&#x006D;(&#x0300;|&#x0302;|&#x0306;|&#x0310;)|&#x006E;(&#x0302;|&#x0304;|&#x0306;|&#x0326;)|&#x0070;(&#x0300;|&#x0304;|&#x0315;|&#x0323;)|&#x0072;(&#x0306;|&#x0325;|&#x0325;&#x0304;)|&#x0073;(&#x0300;|&#x0304;|&#x031B;&#x0304;|&#x0331;)|&#x0074;(&#x0300;|&#x0304;|&#x0315;|&#x031B;)|&#x0075;&#x0307;|&#x007A;(&#x0300;|&#x0304;|&#x0306;|&#x0308;|&#x0327;)|&#x00C7;&#x0306;|&#x00DB;&#x0304;|&#x00E7;&#x0306;|&#x00FB;&#x0304;|&#x00FF;&#x0301;|&#x010C;(&#x0315;|&#x0323;)|&#x010D;(&#x0315;|&#x0323;)|&#x0113;&#x030D;|&#x012A;&#x0301;|&#x012B;&#x0301;|&#x014D;&#x030D;|&#x017D;(&#x0326;|&#x0327;)|&#x017E;(&#x0326;|&#x0327;)|&#x1E32;&#x0304;|&#x1E33;&#x0304;|&#x1E62;&#x0304;|&#x1E63;&#x0304;|&#x1E6C;&#x0304;|&#x1E6D;&#x0304;|&#x1EA0;&#x0308;|&#x1EA1;&#x0308;|&#x1ECC;&#x0308;|&#x1ECD;&#x0308;|&#x1EE4;(&#x0304;|&#x0308;)|&#x1EE5;(&#x0304;|&#x0308;))*",
        ours: characterSets.din91379DatatypeA
    },
    {
        datatype: "B",
        downloaded:
            "([&#x0020;-&#x007E;]|[&#x00A1;-&#x00A3;]|&#x00A5;|[&#x00A7;-&#x00AC;]|[&#x00AE;-&#x00B7;]|[&#x00B9;-&#x00BB;]|[&#x00BF;-&#x017E;]|[&#x0187;-&#x0188;]|&#x018F;|&#x0197;|[&#x01A0;-&#x01A1;]|[&#x01AF;-&#x01B0;]|&#x01B7;|[&#x01CD;-&#x01DC;]|[&#x01DE;-&#x01DF;]|[&#x01E2;-&#x01F0;]|[&#x01F4;-&#x01F5;]|[&#x01F8;-&#x01FF;]|[&#x0212;-&#x0213;]|[&#x0218;-&#x021B;]|[&#x021E;-&#x021F;]|[&#x0227;-&#x0233;]|&#x0259;|&#x0268;|&#x0292;|[&#x02B9;-&#x02BA;]|[&#x02BE;-&#x02BF;]|&#x02C8;|&#x02CC;|[&#x1E02;-&#x1E03;]|[&#x1E06;-&#x1E07;]|[&#x1E0A;-&#x1E11;]|&#x1E17;|[&#x1E1C;-&#x1E2B;]|[&#x1E2F;-&#x1E37;]|[&#x1E3A;-&#x1E3B;]|[&#x1E40;-&#x1E49;]|[&#x1E52;-&#x1E5B;]|[&#x1E5E;-&#x1E63;]|[&#x1E6A;-&#x1E6F;]|[&#x1E80;-&#x1E87;]|[&#x1E8C;-&#x1E97;]|&#x1E9E;|[&#x1EA0;-&#x1EF9;]|&#x2019;|&#x2021;|&#x20AC;|&#x0041;&#x030B;|&#x0043;(&#x0300;|&#x0304;|&#x0306;|&#x0308;|&#x0315;|&#x0323;|&#x0326;|&#x0328;&#x0306;)|&#x0044;&#x0302;|&#x0046;(&#x0300;|&#x0304;)|&#x0047;&#x0300;|&#x0048;(&#x0304;|&#x0326;|&#x0331;)|&#x004A;(&#x0301;|&#x030C;)|&#x004B;(&#x0300;|&#x0302;|&#x0304;|&#x0307;|&#x0315;|&#x031B;|&#x0326;|&#x035F;&#x0048;|&#x035F;&#x0068;)|&#x004C;(&#x0302;|&#x0325;|&#x0325;&#x0304;|&#x0326;)|&#x004D;(&#x0300;|&#x0302;|&#x0306;|&#x0310;)|&#x004E;(&#x0302;|&#x0304;|&#x0306;|&#x0326;)|&#x0050;(&#x0300;|&#x0304;|&#x0315;|&#x0323;)|&#x0052;(&#x0306;|&#x0325;|&#x0325;&#x0304;)|&#x0053;(&#x0300;|&#x0304;|&#x031B;&#x0304;|&#x0331;)|&#x0054;(&#x0300;|&#x0304;|&#x0308;|&#x0315;|&#x031B;)|&#x0055;&#x0307;|&#x005A;(&#x0300;|&#x0304;|&#x0306;|&#x0308;|&#x0327;)|&#x0061;&#x030B;|&#x0063;(&#x0300;|&#x0304;|&#x0306;|&#x0308;|&#x0315;|&#x0323;|&#x0326;|&#x0328;&#x0306;)|&#x0064;&#x0302;|&#x0066;(&#x0300;|&#x0304;)|&#x0067;&#x0300;|&#x0068;(&#x0304;|&#x0326;)|&#x006A;&#x0301;|&#x006B;(&#x0300;|&#x0302;|&#x0304;|&#x0307;|&#x0315;|&#x031B;|&#x0326;|&#x035F;&#x0068;)|&#x006C;(&#x0302;|&#x0325;|&#x0325;&#x0304;|&#x0326;)|&#x006D;(&#x0300;|&#x0302;|&#x0306;|&#x0310;)|&#x006E;(&#x0302;|&#x0304;|&#x0306;|&#x0326;)|&#x0070;(&#x0300;|&#x0304;|&#x0315;|&#x0323;)|&#x0072;(&#x0306;|&#x0325;|&#x0325;&#x0304;)|&#x0073;(&#x0300;|&#x0304;|&#x031B;&#x0304;|&#x0331;)|&#x0074;(&#x0300;|&#x0304;|&#x0315;|&#x031B;)|&#x0075;&#x0307;|&#x007A;(&#x0300;|&#x0304;|&#x0306;|&#x0308;|&#x0327;)|&#x00C7;&#x0306;|&#x00DB;&#x0304;|&#x00E7;&#x0306;|&#x00FB;&#x0304;|&#x00FF;&#x0301;|&#x010C;(&#x0315;|&#x0323;)|&#x010D;(&#x0315;|&#x0323;)|&#x0113;&#x030D;|&#x012A;&#x0301;|&#x012B;&#x0301;|&#x014D;&#x030D;|&#x017D;(&#x0326;|&#x0327;)|&#x017E;(&#x0326;|&#x0327;)|&#x1E32;&#x0304;|&#x1E33;&#x0304;|&#x1E62;&#x0304;|&#x1E63;&#x0304;|&#x1E6C;&#x0304;|&#x1E6D;&#x0304;|&#x1EA0;&#x0308;|&#x1EA1;&#x0308;|&#x1ECC;&#x0308;|&#x1ECD;&#x0308;|&#x1EE4;(&#x0304;|&#x0308;)|&#x1EE5;(&#x0304;|&#x0308;))*",
        ours: characterSets.din91379DatatypeB
    },
    {
        datatype: "C",
        downloaded:
            "([&#x0009;-&#x000A;]|&#x000D;|[&#x0020;-&#x007E;]|[&#x00A0;-&#x00AC;]|[&#x00AE;-&#x017E;]|[&#x0187;-&#x0188;]|&#x018F;|&#x0197;|[&#x01A0;-&#x01A1;]|[&#x01AF;-&#x01B0;]|&#x01B7;|[&#x01CD;-&#x01DC;]|[&#x01DE;-&#x01DF;]|[&#x01E2;-&#x01F0;]|[&#x01F4;-&#x01F5;]|[&#x01F8;-&#x01FF;]|[&#x0212;-&#x0213;]|[&#x0218;-&#x021B;]|[&#x021E;-&#x021F;]|[&#x0227;-&#x0233;]|&#x0259;|&#x0268;|&#x0292;|[&#x02B9;-&#x02BA;]|[&#x02BE;-&#x02BF;]|&#x02C8;|&#x02CC;|[&#x1E02;-&#x1E03;]|[&#x1E06;-&#x1E07;]|[&#x1E0A;-&#x1E11;]|&#x1E17;|[&#x1E1C;-&#x1E2B;]|[&#x1E2F;-&#x1E37;]|[&#x1E3A;-&#x1E3B;]|[&#x1E40;-&#x1E49;]|[&#x1E52;-&#x1E5B;]|[&#x1E5E;-&#x1E63;]|[&#x1E6A;-&#x1E6F;]|[&#x1E80;-&#x1E87;]|[&#x1E8C;-&#x1E97;]|&#x1E9E;|[&#x1EA0;-&#x1EF9;]|&#x2019;|&#x2021;|&#x20AC;|&#x0041;&#x030B;|&#x0043;(&#x0300;|&#x0304;|&#x0306;|&#x0308;|&#x0315;|&#x0323;|&#x0326;|&#x0328;&#x0306;)|&#x0044;&#x0302;|&#x0046;(&#x0300;|&#x0304;)|&#x0047;&#x0300;|&#x0048;(&#x0304;|&#x0326;|&#x0331;)|&#x004A;(&#x0301;|&#x030C;)|&#x004B;(&#x0300;|&#x0302;|&#x0304;|&#x0307;|&#x0315;|&#x031B;|&#x0326;|&#x035F;&#x0048;|&#x035F;&#x0068;)|&#x004C;(&#x0302;|&#x0325;|&#x0325;&#x0304;|&#x0326;)|&#x004D;(&#x0300;|&#x0302;|&#x0306;|&#x0310;)|&#x004E;(&#x0302;|&#x0304;|&#x0306;|&#x0326;)|&#x0050;(&#x0300;|&#x0304;|&#x0315;|&#x0323;)|&#x0052;(&#x0306;|&#x0325;|&#x0325;&#x0304;)|&#x0053;(&#x0300;|&#x0304;|&#x031B;&#x0304;|&#x0331;)|&#x0054;(&#x0300;|&#x0304;|&#x0308;|&#x0315;|&#x031B;)|&#x0055;&#x0307;|&#x005A;(&#x0300;|&#x0304;|&#x0306;|&#x0308;|&#x0327;)|&#x0061;&#x030B;|&#x0063;(&#x0300;|&#x0304;|&#x0306;|&#x0308;|&#x0315;|&#x0323;|&#x0326;|&#x0328;&#x0306;)|&#x0064;&#x0302;|&#x0066;(&#x0300;|&#x0304;)|&#x0067;&#x0300;|&#x0068;(&#x0304;|&#x0326;)|&#x006A;&#x0301;|&#x006B;(&#x0300;|&#x0302;|&#x0304;|&#x0307;|&#x0315;|&#x031B;|&#x0326;|&#x035F;&#x0068;)|&#x006C;(&#x0302;|&#x0325;|&#x0325;&#x0304;|&#x0326;)|&#x006D;(&#x0300;|&#x0302;|&#x0306;|&#x0310;)|&#x006E;(&#x0302;|&#x0304;|&#x0306;|&#x0326;)|&#x0070;(&#x0300;|&#x0304;|&#x0315;|&#x0323;)|&#x0072;(&#x0306;|&#x0325;|&#x0325;&#x0304;)|&#x0073;(&#x0300;|&#x0304;|&#x031B;&#x0304;|&#x0331;)|&#x0074;(&#x0300;|&#x0304;|&#x0315;|&#x031B;)|&#x0075;&#x0307;|&#x007A;(&#x0300;|&#x0304;|&#x0306;|&#x0308;|&#x0327;)|&#x00C7;&#x0306;|&#x00DB;&#x0304;|&#x00E7;&#x0306;|&#x00FB;&#x0304;|&#x00FF;&#x0301;|&#x010C;(&#x0315;|&#x0323;)|&#x010D;(&#x0315;|&#x0323;)|&#x0113;&#x030D;|&#x012A;&#x0301;|&#x012B;&#x0301;|&#x014D;&#x030D;|&#x017D;(&#x0326;|&#x0327;)|&#x017E;(&#x0326;|&#x0327;)|&#x1E32;&#x0304;|&#x1E33;&#x0304;|&#x1E62;&#x0304;|&#x1E63;&#x0304;|&#x1E6C;&#x0304;|&#x1E6D;&#x0304;|&#x1EA0;&#x0308;|&#x1EA1;&#x0308;|&#x1ECC;&#x0308;|&#x1ECD;&#x0308;|&#x1EE4;(&#x0304;|&#x0308;)|&#x1EE5;(&#x0304;|&#x0308;))*",
        ours: characterSets.din91379DatatypeC
    }
];

test.each(mapping)("used regex matches the downloaded regex for datatype $datatype", ({ downloaded, ours }) => {
    const jsCharacterSet = downloaded.replaceAll("&#x", "\\u").replaceAll(";", "");
    const oursToString = ours.toString();

    expect(jsCharacterSet).toBe(oursToString);
});

const errorMessageA =
    "Value does not match regular expression /^( |'|[,-.]|[A-Z]|[`-z]|~|¨|´|·|[À-Ö]|[Ø-ö]|[ø-ž]|[Ƈ-ƈ]|Ə|Ɨ|[Ơ-ơ]|[Ư-ư]|Ʒ|[Ǎ-ǜ]|[Ǟ-ǟ]|[Ǣ-ǰ]|[Ǵ-ǵ]|[Ǹ-ǿ]|[Ȓ-ȓ]|[Ș-ț]|[Ȟ-ȟ]|[ȧ-ȳ]|ə|ɨ|ʒ|[ʹ-ʺ]|[ʾ-ʿ]|ˈ|ˌ|[Ḃ-ḃ]|[Ḇ-ḇ]|[Ḋ-ḑ]|ḗ|[Ḝ-ḫ]|[ḯ-ḷ]|[Ḻ-ḻ]|[Ṁ-ṉ]|[Ṓ-ṛ]|[Ṟ-ṣ]|[Ṫ-ṯ]|[Ẁ-ẇ]|[Ẍ-ẗ]|ẞ|[Ạ-ỹ]|’|‡|A̋|C(̀|̄|̆|̈|̕|̣|̦|̨̆)|D̂|F(̀|̄)|G̀|H(̄|̦|̱)|J(́|̌)|K(̀|̂|̄|̇|̕|̛|̦|͟H|͟h)|L(̂|̥|̥̄|̦)|M(̀|̂|̆|̐)|N(̂|̄|̆|̦)|P(̀|̄|̕|̣)|R(̆|̥|̥̄)|S(̀|̄|̛̄|̱)|T(̀|̄|̈|̕|̛)|U̇|Z(̀|̄|̆|̈|̧)|a̋|c(̀|̄|̆|̈|̕|̣|̦|̨̆)|d̂|f(̀|̄)|g̀|h(̄|̦)|j́|k(̀|̂|̄|̇|̕|̛|̦|͟h)|l(̂|̥|̥̄|̦)|m(̀|̂|̆|̐)|n(̂|̄|̆|̦)|p(̀|̄|̕|̣)|r(̆|̥|̥̄)|s(̀|̄|̛̄|̱)|t(̀|̄|̕|̛)|u̇|z(̀|̄|̆|̈|̧)|Ç̆|Û̄|ç̆|û̄|ÿ́|Č(̕|̣)|č(̕|̣)|ē̍|Ī́|ī́|ō̍|Ž(̦|̧)|ž(̦|̧)|Ḳ̄|ḳ̄|Ṣ̄|ṣ̄|Ṭ̄|ṭ̄|Ạ̈|ạ̈|Ọ̈|ọ̈|Ụ(̄|̈)|ụ(̄|̈))*$/";
const errorMessageB =
    "Value does not match regular expression /^([ -~]|[¡-£]|¥|[§-¬]|[®-·]|[¹-»]|[¿-ž]|[Ƈ-ƈ]|Ə|Ɨ|[Ơ-ơ]|[Ư-ư]|Ʒ|[Ǎ-ǜ]|[Ǟ-ǟ]|[Ǣ-ǰ]|[Ǵ-ǵ]|[Ǹ-ǿ]|[Ȓ-ȓ]|[Ș-ț]|[Ȟ-ȟ]|[ȧ-ȳ]|ə|ɨ|ʒ|[ʹ-ʺ]|[ʾ-ʿ]|ˈ|ˌ|[Ḃ-ḃ]|[Ḇ-ḇ]|[Ḋ-ḑ]|ḗ|[Ḝ-ḫ]|[ḯ-ḷ]|[Ḻ-ḻ]|[Ṁ-ṉ]|[Ṓ-ṛ]|[Ṟ-ṣ]|[Ṫ-ṯ]|[Ẁ-ẇ]|[Ẍ-ẗ]|ẞ|[Ạ-ỹ]|’|‡|€|A̋|C(̀|̄|̆|̈|̕|̣|̦|̨̆)|D̂|F(̀|̄)|G̀|H(̄|̦|̱)|J(́|̌)|K(̀|̂|̄|̇|̕|̛|̦|͟H|͟h)|L(̂|̥|̥̄|̦)|M(̀|̂|̆|̐)|N(̂|̄|̆|̦)|P(̀|̄|̕|̣)|R(̆|̥|̥̄)|S(̀|̄|̛̄|̱)|T(̀|̄|̈|̕|̛)|U̇|Z(̀|̄|̆|̈|̧)|a̋|c(̀|̄|̆|̈|̕|̣|̦|̨̆)|d̂|f(̀|̄)|g̀|h(̄|̦)|j́|k(̀|̂|̄|̇|̕|̛|̦|͟h)|l(̂|̥|̥̄|̦)|m(̀|̂|̆|̐)|n(̂|̄|̆|̦)|p(̀|̄|̕|̣)|r(̆|̥|̥̄)|s(̀|̄|̛̄|̱)|t(̀|̄|̕|̛)|u̇|z(̀|̄|̆|̈|̧)|Ç̆|Û̄|ç̆|û̄|ÿ́|Č(̕|̣)|č(̕|̣)|ē̍|Ī́|ī́|ō̍|Ž(̦|̧)|ž(̦|̧)|Ḳ̄|ḳ̄|Ṣ̄|ṣ̄|Ṭ̄|ṭ̄|Ạ̈|ạ̈|Ọ̈|ọ̈|Ụ(̄|̈)|ụ(̄|̈))*$/";
const errorMessageC =
    "Value does not match regular expression /^([\\u0009-\\u000A]|\\u000D|[ -~]|[ -¬]|[®-ž]|[Ƈ-ƈ]|Ə|Ɨ|[Ơ-ơ]|[Ư-ư]|Ʒ|[Ǎ-ǜ]|[Ǟ-ǟ]|[Ǣ-ǰ]|[Ǵ-ǵ]|[Ǹ-ǿ]|[Ȓ-ȓ]|[Ș-ț]|[Ȟ-ȟ]|[ȧ-ȳ]|ə|ɨ|ʒ|[ʹ-ʺ]|[ʾ-ʿ]|ˈ|ˌ|[Ḃ-ḃ]|[Ḇ-ḇ]|[Ḋ-ḑ]|ḗ|[Ḝ-ḫ]|[ḯ-ḷ]|[Ḻ-ḻ]|[Ṁ-ṉ]|[Ṓ-ṛ]|[Ṟ-ṣ]|[Ṫ-ṯ]|[Ẁ-ẇ]|[Ẍ-ẗ]|ẞ|[Ạ-ỹ]|’|‡|€|A̋|C(̀|̄|̆|̈|̕|̣|̦|̨̆)|D̂|F(̀|̄)|G̀|H(̄|̦|̱)|J(́|̌)|K(̀|̂|̄|̇|̕|̛|̦|͟H|͟h)|L(̂|̥|̥̄|̦)|M(̀|̂|̆|̐)|N(̂|̄|̆|̦)|P(̀|̄|̕|̣)|R(̆|̥|̥̄)|S(̀|̄|̛̄|̱)|T(̀|̄|̈|̕|̛)|U̇|Z(̀|̄|̆|̈|̧)|a̋|c(̀|̄|̆|̈|̕|̣|̦|̨̆)|d̂|f(̀|̄)|g̀|h(̄|̦)|j́|k(̀|̂|̄|̇|̕|̛|̦|͟h)|l(̂|̥|̥̄|̦)|m(̀|̂|̆|̐)|n(̂|̄|̆|̦)|p(̀|̄|̕|̣)|r(̆|̥|̥̄)|s(̀|̄|̛̄|̱)|t(̀|̄|̕|̛)|u̇|z(̀|̄|̆|̈|̧)|Ç̆|Û̄|ç̆|û̄|ÿ́|Č(̕|̣)|č(̕|̣)|ē̍|Ī́|ī́|ō̍|Ž(̦|̧)|ž(̦|̧)|Ḳ̄|ḳ̄|Ṣ̄|ṣ̄|Ṭ̄|ṭ̄|Ạ̈|ạ̈|Ọ̈|ọ̈|Ụ(̄|̈)|ụ(̄|̈))*$/";

describe("Test Attributes", () => {
    test("Consent is considered as valid", () => {
        const consent = Consent.from({ consent: "\u0009" });
        expect(consent.consent.toString()).toBe("\u0009");
    });

    test("Consent is considered as invalid", () => {
        const invalidCall = () => {
            Consent.from({
                consent: "\u0012"
            });
        };
        expect(invalidCall).toThrow(new ParsingError("Consent", "consent", errorMessageC));
    });

    const regularIdentityAttributeTypesA = ["BirthName", "GivenName", "HonorificPrefix", "HonorificSuffix", "MiddleName", "Pseudonym", "Surname"];
    const regularIdentityAttributeTypesB = ["City", "HouseNumber", "State", "Street", "ZipCode", "AffiliationOrganization", "DisplayName", "JobTitle"];
    const regularIdentityAttributeTypesC = ["AffiliationRole", "AffiliationUnit", "StatementPredicate"];

    const testMapping = regularIdentityAttributeTypesA
        .map((x) => ({ type: x, testValue: "Gräf", wrongTestValue: "€", errorMessage: errorMessageA }))
        .concat(regularIdentityAttributeTypesB.map((x) => ({ type: x, testValue: "€", wrongTestValue: "z-\u0009", errorMessage: errorMessageB })))
        .concat(regularIdentityAttributeTypesC.map((x) => ({ type: x, testValue: "z-\u0009", wrongTestValue: "\u0012", errorMessage: errorMessageC })));

    test.each(testMapping)("$testValue is considered as valid for type $type", ({ type, testValue }) => {
        const attribute = Serializable.fromUnknown({ "@type": type, value: testValue });
        expect((attribute as any).value).toBe(testValue);
    });

    test.each(testMapping)("$wrongTestValue is considered as invalid for type $type", ({ type, wrongTestValue, errorMessage }) => {
        const invalidCall = () => Serializable.fromUnknown({ "@type": type, value: wrongTestValue });
        expect(invalidCall).toThrow(new ParsingError(type, "value", errorMessage));
    });

    const regularRelationshipAttributeTypesC = ["ProprietaryString", "ProprietaryJSON", "ProprietaryXML"];

    test.each(regularRelationshipAttributeTypesC)("is considered as valid for type %s", (type) => {
        const attribute = Serializable.fromUnknown({ "@type": type, value: "z-\u0009", title: "aTitle" });
        expect((attribute as any).value).toBe("z-\u0009");
    });

    test.only.each(regularRelationshipAttributeTypesC)("is considered as invalid for type %s", (type) => {
        const invalidCall = () => {
            Serializable.fromUnknown({ "@type": type, value: "z-\u0012", title: "aTitle" });
        };
        expect(invalidCall).toThrow(new ParsingError(type, "value", errorMessageC));
    });

    const proprietaryAttributeTypes = [
        { type: "ProprietaryBoolean", value: true },
        { type: "ProprietaryCountry", value: "DE" },
        { type: "ProprietaryEMailAddress", value: "email@email.de" },
        { type: "ProprietaryFileReference", value: "FIL123456789012345678901234567" },
        { type: "ProprietaryFloat", value: 1 },
        { type: "ProprietaryHEXColor", value: "#000000" },
        { type: "ProprietaryInteger", value: 1 },
        { type: "ProprietaryLanguage", value: "de" },
        { type: "ProprietaryPhoneNumber", value: "1234567890" },
        { type: "ProprietaryString", value: "aString" },
        { type: "ProprietaryURL", value: "mail.de" },
        { type: "ProprietaryJSON", value: "aString" },
        { type: "ProprietaryXML", value: "aString" }
    ];

    test.each(proprietaryAttributeTypes)("title is considered as valid for type $type", ({ type, value }) => {
        const attribute = Serializable.fromUnknown({ "@type": type, value, title: "\u0009" });
        expect((attribute as any).title).toBe("\u0009");
    });

    test.each(proprietaryAttributeTypes)("title is considered as invalid for type $type", ({ type, value }) => {
        const invalidCall = () => {
            Serializable.fromUnknown({ "@type": type, value, title: "\u0012" });
        };
        expect(invalidCall).toThrow(new ParsingError(type, "title", errorMessageC));
    });

    test.each(proprietaryAttributeTypes)("description is considered as valid for type $type", ({ type, value }) => {
        const attribute = Serializable.fromUnknown({ "@type": type, value, title: "aTitle", description: "\u0009" });
        expect((attribute as any).description).toBe("\u0009");
    });

    test.each(proprietaryAttributeTypes)("description is considered as invalid for type $type", ({ type, value }) => {
        const invalidCall = () => {
            Serializable.fromUnknown({ "@type": type, value, title: "aTitle", description: "\u0012" });
        };
        expect(invalidCall).toThrow(new ParsingError(type, "description", errorMessageC));
    });
});
