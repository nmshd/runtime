set -e

npm ci
npm run build:node
npm run lint:eslint
npm run lint:prettier
npm run -ws cdep
npx -ws license-check
npx better-npm-audit audit
