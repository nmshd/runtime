set -e

npm ci
npm run build:node
npm run lint:eslint
npm run lint:prettier
npx -ws license-check
npx better-npm-audit audit -p --exclude 1096302
