export enum TransportContext {
    Web = "Web",
    Cordova = "Cordova",
    Node = "Node"
}

export namespace TransportContext {
    let _currentContext: TransportContext | undefined;

    function _queryContext(): TransportContext {
        if (typeof window === "undefined") {
            return TransportContext.Node;
        }

        if (!(window as any).isCordovaApp) {
            return TransportContext.Web;
        }

        return TransportContext.Cordova;
    }

    export function currentContext(): TransportContext {
        if (!_currentContext) {
            _currentContext = _queryContext();
        }

        return _currentContext;
    }
}
