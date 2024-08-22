set -e

npm ci
npm run build:node
npm run lint:eslint
npm run lint:prettier
npx -ws license-check
npx better-npm-audit audit --exclude 1098615,1098615
