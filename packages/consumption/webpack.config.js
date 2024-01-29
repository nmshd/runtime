const path = require("path");
const CopyWebpackPlugin = require("copy-webpack-plugin");

module.exports = {
    mode: "development",
    node: {
        global: false
    },
    plugins: [
        new CopyWebpackPlugin({
            patterns: [
                { from: "../../node_modules/@nmshd/content/lib-web" },
                { from: "../../node_modules/@nmshd/transport/lib-web" },
                { from: "../../node_modules/@nmshd/crypto/lib-web" },
                { from: "../../node_modules/@js-soft/ts-serval/lib-web" },
                { from: "../../node_modules/lokijs/build/lokijs.min.js" },
                { from: "../../node_modules/js-logger/src/logger.js" }
            ]
        })
    ],
    entry: {
        "nmshd.consumption": "./dist/index"
    },
    output: {
        path: path.resolve(__dirname, "lib-web"),
        filename: "[name].js",
        library: "NMSHDConsumption",
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
        chai: "chai",
        lokijs: "loki",
        agentkeepalive: "NMSHDTransport",
        process: "NMSHDTransport",
        path: "NMSHDTransport",
        "fs-extra": "NMSHDTransport",
        fs: "NMSHDTransport",
        "graceful-fs": "NMSHDTransport",
        "@nmshd/content": "NMSHDContent",
        "@js-soft/node-logger": "NMSHDTransport",
        "@nmshd/transport": "NMSHDTransport",
        "@nmshd/crypto": "NMSHDCrypto",
        "@js-soft/ts-serval": "TSServal"
    }
};
