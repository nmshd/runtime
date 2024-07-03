set -e

npm ci
npm run build:node
npm run lint:eslint -- --rule 'jest/no-conditional-in-test: off'
npm run lint:prettier
npx -ws license-check
npx better-npm-audit audit --exclude 1096302
