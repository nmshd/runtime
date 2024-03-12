var path = require("path");

const pathPrefix = path.resolve(__dirname);
module.exports = {
    entry: `${pathPrefix}/app.js`,
    output: {
        path: pathPrefix,
        filename: "_bundle.js"
    }
};
