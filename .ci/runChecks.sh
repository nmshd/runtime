set -e

npm ci
npm run build:node
npm run lint:eslint
npm run lint:prettier
npm run --workspaces cdep
npx --workspaces license-check
npx better-npm-audit audit --exclude 1108959
