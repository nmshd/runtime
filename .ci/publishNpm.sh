#!/usr/bin/env bash
set -e

if [ -z "$VERSION" ]; then
    echo "The environment variable 'VERSION' must be set."
    exit 1
fi

if printf -- "$VERSION" | grep -q " "; then
    echo '$VERSION must not contain whitespaces'
    exit 1
fi

# set the version of all packages in the workspace to $VERSION
npm version --workspaces $VERSION

# replace all dependencies from the current workspace that are marked with "*" with the version that gets published
find . -regex "./packages/[A-Za-z-]*/package\.json$" -exec sed -i -e "s/\"\*\"/\"$VERSION\"/g" {} \;

# npm i to update the lockfile
npm i

# publish all packages
npm exec --workspaces -c 'enhanced-publish --if-possible --use-preid-as-tag'
