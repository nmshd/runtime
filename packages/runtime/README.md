# Runtime

[![npm version](https://badge.fury.io/js/@nmshd%2fruntime.svg)](https://www.npmjs.com/package/@nmshd/runtime)

The enmeshed Runtime defines a framework for enmeshed applications. This framework brings a module architecture: if the developer using this framework inherits from the provided `Runtime` class, they can reuse so called modules. Modules can be written by third party developers. One example for such a module could be the handling of enmeshed messages with a specific `@type`.

In order to simplify the development of those modules, this project delivers wrappers around the functionality of the [transport](https://www.npmjs.com/package/@nmshd/transport)- and [consumption](https://www.npmjs.com/package/@nmshd/consumption)-library which map the data types from their rather technical format to a more consumer-friendly format.

Both the enmeshed Connector and the official enmeshed Apps implement this runtime.

## Documentation

You can find the documentation for enmeshed on [enmeshed.eu](https://enmeshed.eu).

To get started developing in this repository, see the [developer's guide](README_dev.md).

## Feedback

Please file any bugs or feature requests by creating an [issue](https://github.com/nmshd/feedback/issues).

Share your feedback with the enmeshed team by contributing to the [discussions](https://github.com/nmshd/feedback/discussions).

## Contribute

Contribution to this project is highly appreciated. Head over to our [contribution guide](https://github.com/nmshd/.github/blob/main/CONTRIBUTING.md) to learn more.

## License

[MIT](LICENSE)
