set -e

npm ci
npm run build:node
npm run lint:eslint
npm run lint:prettier
npm run --workspaces cdep
npx --workspaces license-check
npx better-npm-audit audit --exclude 1112030,1114592,1114594,1114638,1114640,1114642
