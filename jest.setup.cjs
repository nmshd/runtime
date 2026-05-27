beforeAll(async () => {
    const { SodiumWrapper } = require("@nmshd/crypto");
    await SodiumWrapper.ready();
});
