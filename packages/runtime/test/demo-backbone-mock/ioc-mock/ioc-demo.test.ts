import { Container, Inject } from "typescript-ioc";

class Original {
    public name: string;
    public constructor() {
        this.name = "Original";
    }
}

class Mock extends Original {
    public constructor() {
        super();
        this.name = "Mock";
    }
}

class User {
    @Inject
    public base: Original;
}

test("Test", () => {
    const snapshot = Container.snapshot();
    Container.bind(Original).to(Mock);
    const user = new User();
    expect(user.base.name).toBe("Mock");
    snapshot.restore();
    const user2 = new User();
    expect(user2.base.name).toBe("Original");
});
