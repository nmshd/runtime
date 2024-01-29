const path = require("path");
const CopyWebpackPlugin = require("copy-webpack-plugin");

module.exports = {
    mode: "development",
    node: {
        global: true
    },
    plugins: [
        new CopyWebpackPlugin({
            patterns: [
                { from: "../../node_modules/@nmshd/crypto/lib-web" },
                { from: "../../node_modules/@js-soft/ts-serval/lib-web" },
                { from: "../../node_modules/lokijs/build/lokijs.min.js" },
                { from: "../../node_modules/js-logger/src/logger.js" }
            ]
        })
    ],
    entry: {
        "nmshd.transport": "./dist/index"
    },
    output: {
        path: path.resolve(__dirname, "lib-web"),
        filename: "[name].js",
        library: "NMSHDTransport",
        umdNamedDefine: true
    },
    resolve: {
        extensions: [".js", ".json"],
        alias: {
            src: path.resolve(__dirname, "tmp-browser/src/")
        }
    },
    devtool: "source-map",
    externals: {
        lokijs: "loki",
        http: "NMSHDCrypto",
        https: "NMSHDCrypto",
        process: "NMSHDCrypto",
        path: "NMSHDCrypto",
        "fs-extra": "NMSHDCrypto",
        fs: "NMSHDCrypto",
        "graceful-fs": "NMSHDCrypto",
        "@js-soft/node-logger": "NMSHDCrypto",
        "@nmshd/crypto": "NMSHDCrypto",
        "@js-soft/ts-serval": "TSServal"
    }
};
