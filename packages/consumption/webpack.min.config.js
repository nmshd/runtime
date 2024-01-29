const path = require("path");
const TerserPlugin = require("terser-webpack-plugin");

module.exports = {
    mode: "production",
    node: {
        global: false
    },
    optimization: {
        minimize: true,
        minimizer: [
            new TerserPlugin({
                terserOptions: {
                    keep_classnames: true,
                    keep_fnames: true
                }
            })
        ]
    },
    entry: {
        "nmshd.consumption.min": "./dist/index"
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
        "@nmshd/content": "NMSHDContent",
        "@js-soft/node-logger": "NMSHDTransport",
        "@nmshd/transport": "NMSHDTransport",
        "@nmshd/crypto": "NMSHDCrypto",
        "@js-soft/ts-serval": "TSServal"
    }
};
