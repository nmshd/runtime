set -e

npm ci
npm run build --workspaces
npm run lint:eslint
npm run lint:prettier
npx -ws license-check
npx better-npm-audit audit
