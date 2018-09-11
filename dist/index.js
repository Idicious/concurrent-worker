(function (global, factory) {
    typeof exports === 'object' && typeof module !== 'undefined' ? factory(exports) :
    typeof define === 'function' && define.amd ? define(['exports'], factory) :
    (factory((global.Task = {})));
}(this, (function (exports) { 'use strict';

    var noopArray = function () {
        var args = [];
        for (var _i = 0; _i < arguments.length; _i++) {
            args[_i] = arguments[_i];
        }
        return new Array();
    };

    var RUN = "run";
    var TRANSFERRABLE = "getTransferrables";
    var RUN_DECLARATION = "self." + RUN;
    var TRANSFERRABLE_DECLARATION = "self." + TRANSFERRABLE;
    var ONMESSAGE_DECLARATION = "self.onmessage";
    var CONTEXT_DELIMITER = ";\r\n\r\n";
    /**
     * Calling functions through string constants makes sure that aggressive minification
     * does not break the call. The same applies to the apply call, this ensures no polyfill
     * is assumed for a rest spread which would also break the worker script.
     *
     * Tested with Closure Compiler ADVANCED mode with ES3, ES5 and ES6 target.
     * @param message
     */
    var onmessage = function (message) {
        Promise.resolve(self[RUN].apply(null, message.data[1])).then(function (result) {
            var transferrable = self[TRANSFERRABLE](result);
            self.postMessage([message.data[0], result], transferrable);
        });
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
        return Object.keys(context)
            .map(function (key) { return "this." + key + " = " + getContextDeclaration(context[key]); })
            .join(CONTEXT_DELIMITER);
    };
    var getScript = function (execute, context, options) {
        return ("\n" + getContextString(context) + "\n\nself." + RUN + " = " + RUN + ";\nself." + TRANSFERRABLE + " = " + TRANSFERRABLE + ";\n\n" + TRANSFERRABLE_DECLARATION + " = " + (options.outTransferable || noopArray) + "\n\n" + RUN_DECLARATION + " = " + execute + "\n  \n" + ONMESSAGE_DECLARATION + " = " + onmessage + "\n").trim();
    };
    var createWorkerUrl = function (execute, context, options) {
        var script = getScript(execute, context, options);
        var blob = new Blob([script], { type: "application/javascript" });
        return URL.createObjectURL(blob);
    };

    var executePromiseWorker = function (worker, id, args, transferrable) {
        return new Promise(function (resolve, reject) {
            worker.addEventListener("message", function cb(message) {
                if (id === message.data[0]) {
                    worker.removeEventListener("message", cb);
                    resolve(message.data[1]);
                }
            });
            worker.addEventListener("error", function cb(error) {
                worker.removeEventListener("error", cb);
                reject(error);
            });
            worker.postMessage([id, args], transferrable);
        });
    };
    var run = function (task, args, transferable) {
        var url = createWorkerUrl(task, {}, {});
        var worker = new Worker(url);
        return executePromiseWorker(worker, -1, args, transferable).then(function (result) {
            URL.revokeObjectURL(url);
            worker.terminate();
            return result;
        });
    };
    /**
     * Creates a task that can be run in a webworker. If you want to use functions and variables from
     * the outer scope you must pass them in via the context parameter, else they will not be available.
     *
     * @param task Function to execute off the main thread
     * @param context Worker context, properties of this object are available inside the worker
     * @param options Transferrable options
     */
    var create = function (task, context, options) {
        if (options === void 0) { options = {
            inTransferable: function () { return []; },
            outTransferable: function () { return []; }
        }; }
        var url = createWorkerUrl(task, context || {}, options);
        var getTransferable = options.inTransferable || noopArray;
        var runner = function () {
            var args = [];
            for (var _i = 0; _i < arguments.length; _i++) {
                args[_i] = arguments[_i];
            }
            var worker = new Worker(url);
            var transferable = getTransferable.apply(void 0, args);
            return executePromiseWorker(worker, -1, args, transferable).then(function (result) {
                worker.terminate();
                return result;
            });
        };
        var kill = function () { return URL.revokeObjectURL(url); };
        return {
            kill: kill,
            run: runner
        };
    };
    var sync = function (task, context, options) {
        if (options === void 0) { options = {
            inTransferable: function () { return []; },
            outTransferable: function () { return []; }
        }; }
        var url = createWorkerUrl(task, context || {}, options);
        var worker = new Worker(url);
        var getTransferable = options.inTransferable || noopArray;
        var syncId = 0;
        var runner = function () {
            var args = [];
            for (var _i = 0; _i < arguments.length; _i++) {
                args[_i] = arguments[_i];
            }
            var transferable = getTransferable.apply(void 0, args);
            return executePromiseWorker(worker, syncId++, args, transferable);
        };
        var kill = function () {
            worker.terminate();
            URL.revokeObjectURL(url);
        };
        return {
            kill: kill,
            run: runner
        };
    };

    exports.create = create;
    exports.run = run;
    exports.sync = sync;

    Object.defineProperty(exports, '__esModule', { value: true });

})));
