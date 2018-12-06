(function (global, factory) {
    typeof exports === 'object' && typeof module !== 'undefined' ? factory(exports) :
    typeof define === 'function' && define.amd ? define(['exports'], factory) :
    (factory((global.Task = {})));
}(this, (function (exports) { 'use strict';

    var noop = function () { return []; };
    /**
     * Calling functions through strings makes sure that aggressive minification
     * does not break the call. The same applies to the apply call, this ensures no polyfill
     * is assumed for a rest spread which would also break the worker script.
     *
     * Tested with Webpack dev and prod mode, Closure Compiler ADVANCED mode with ES3, ES5 and ES6 target.
     * @param message
     */
    /* istanbul ignore next */
    var onmessage = function (message) {
        try {
            // tslint:disable-next-line:no-string-literal
            var res = self["run"].apply(null, message.data[1]);
            Promise.resolve(res)
                .then(function (result) {
                // tslint:disable-next-line:no-string-literal
                var transferrable = self["getTransferrables"](result);
                self.postMessage([message.data[0], result, false], transferrable);
            })
                .catch(function (error) {
                self.postMessage([message.data[0], error, true], undefined);
            });
        }
        catch (e) {
            // tslint:disable-next-line:no-string-literal
            var error = self["getError"](e);
            self.postMessage([message.data[0], error, true], undefined);
        }
    };
    /* istanbul ignore next */
    var getError = function (e) {
        var props = Object.getOwnPropertyNames(e);
        return props.reduce(function (acc, prop) {
            acc[prop] = e[prop];
            return acc;
        }, {});
    };

    var getContextDeclaration = function (contextItem) {
        switch (typeof contextItem) {
            case "boolean":
            case "number":
                return contextItem;
            case "string":
                return "'" + contextItem + "'";
            case "function":
                return "" + contextItem;
            case "object":
                return JSON.stringify(contextItem, null, 2);
        }
    };
    var getContextString = function (context) {
        return context
            ? Object.keys(context)
                .map(function (key) { return "this." + key + " = " + getContextDeclaration(context[key]); })
                .join(";\r\n\r\n")
            : "";
    };
    var isUrlRelative = function (url) {
        return url.indexOf("://") === -1 && url.indexOf("//") === -1;
    };
    var getScriptImport = function (scripts, rootUrl) {
        if (rootUrl === void 0) { rootUrl = ""; }
        return scripts && scripts.length > 0
            ? "importScripts(" + scripts
                .map(function (script) {
                return isUrlRelative(script) ? "\"" + rootUrl + script + "\"" : "\"" + script + "\"";
            })
                .join(",") + ");"
            : "";
    };
    var getScript = function (execute, options) {
        return ("\n" + getScriptImport(options.scriptsPath, options.rootUrl) + "\n" + getContextString(options.context) + "\nself.getError = " + getError + ";\nself.getTransferrables = " + (options.outTransferable || noop) + ";\nself.run = " + execute + ";\nself.onmessage = " + onmessage + ";\n").trim();
    };
    var createWorkerUrl = function (execute, options) {
        var script = getScript(execute, options);
        var blob = new Blob([script], { type: "application/javascript" });
        return URL.createObjectURL(blob);
    };

    /**
     * Create a worker onmessage callback that resolves or rejects if the sync id matches.
     */
    var createWorkerCallback = function (worker, syncIdPing, resolve, reject) {
        return function cb(message) {
            var syncIdPong = message.data[0];
            var dataOrError = message.data[1];
            var hasError = message.data[2];
            if (syncIdPing === syncIdPong) {
                if (hasError) {
                    reject(dataOrError);
                }
                else {
                    resolve(dataOrError);
                }
                worker.removeEventListener("message", cb);
            }
        };
    };
    /**
     * Call worker with given arguments, returns a promise that resolves when onmessage is called
     * with matching syncId.
     */
    var executePromiseWorker = function (worker, syncId, args, transferrable) {
        return new Promise(function (resolve, reject) {
            worker.addEventListener("message", createWorkerCallback(worker, syncId, resolve, reject));
            worker.postMessage([syncId, args], transferrable);
        });
    };
    /**
     * Creates a task that can be run in a webworker. If you want to use functions and variables from
     * the outer scope you must pass them in via the context parameter, else they will not be available.
     * This creation method creates a new web worker for each call to it allowing multiple calls to run in paralel.
     *
     * @param task Function to execute off the main thread
     * @param context Worker context, properties of this object are available inside the worker
     * @param options Transferrable options
     */
    var create = function (task, options) {
        if (options === void 0) { options = {}; }
        var url = createWorkerUrl(task, options);
        var getTransferable = options.inTransferable || noop;
        var run = function (args) {
            var worker = new Worker(url);
            var transferable = getTransferable(args);
            return executePromiseWorker(worker, -1, args, transferable).then(function (result) {
                worker.terminate();
                return result;
            });
        };
        var kill = function () { return URL.revokeObjectURL(url); };
        return {
            kill: kill,
            run: run
        };
    };
    /**
     * Creates a task that can be run in a webworker. If you want to use functions and variables from
     * the outer scope you must pass them in via the context parameter, else they will not be available.
     * This creation method uses a single web worker for all calls to it, calls will be processed synchonously
     * in that worker. Has les overhead than `create` but does not run multiple calls in paralel.
     *
     * @param task Function to execute off the main thread
     * @param context Worker context, properties of this object are available inside the worker
     * @param options Transferrable options
     */
    var sync = function (task, options) {
        if (options === void 0) { options = {}; }
        var url = createWorkerUrl(task, options);
        var worker = new Worker(url);
        var getTransferable = options.inTransferable || noop;
        var syncId = 0;
        var run = function (args) {
            var transferable = getTransferable(args);
            return executePromiseWorker(worker, syncId++, args, transferable);
        };
        var kill = function () {
            worker.terminate();
            URL.revokeObjectURL(url);
        };
        return {
            kill: kill,
            run: run
        };
    };

    exports.create = create;
    exports.sync = sync;

    Object.defineProperty(exports, '__esModule', { value: true });

})));
