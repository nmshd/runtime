FROM node:26.13.0

COPY . .

ENTRYPOINT cd packages/transport && npx vitest run --config vitest.performance.config.mts
