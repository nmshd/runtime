const { SodiumWrapper } = require("@nmshd/crypto");

beforeAll(async () => {
    await SodiumWrapper.ready();
});
