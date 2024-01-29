FROM node:15.5.1

COPY . .

ENTRYPOINT npx jest --testPathIgnorePatterns="[]" --testPathPattern="test/performance"
