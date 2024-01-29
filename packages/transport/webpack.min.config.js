const path = require("path");
const TerserPlugin = require("terser-webpack-plugin");

module.exports = {
    mode: "production",
    node: {
        global: true
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
        "nmshd.transport.min": "./dist/index"
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
        "@js-soft/node-logger": "NMSHDCrypto",
        "@nmshd/crypto": "NMSHDCrypto",
        "@js-soft/ts-serval": "TSServal"
    }
};
