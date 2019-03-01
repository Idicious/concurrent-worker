import { Input } from "./types";

// tslint:disable:no-string-literal
// tslint:disable:interface-name

declare global {
  interface WorkerGlobalScope {
    terminateOnError: boolean;
    run<T extends Array<unknown>, R>(...args: T): R;
    getTransferrables<T>(val: T): Transferable[];
    getError(e: any): any;
  }
}

export const noop = () => [];

/**
 * Calling functions through strings makes sure that aggressive minification
 * does not break the call. The same applies to the apply call, this ensures no polyfill
 * is assumed for a rest spread which would also break the worker script.
 *
 * Tested with Webpack dev and prod mode, Closure Compiler ADVANCED mode with ES3, ES5 and ES6 target.
 * @param message
 */
export const onmessage = <T extends Array<unknown>, R>(message: Input<T>) => {
  return new Promise<R>(resolve => {
    resolve(self["run"].apply<null, T, R>(null, message.data[1]));
  })
    .then(result => {
      const transferrable = self["getTransferrables"]<R>(result);
      postMessage([message.data[0], result, false], transferrable);
    })
    .catch(e => {
      const error = self["getError"](e);
      postMessage([message.data[0], error, true]);

      if (self["terminateOnError"]) {
        close();
      }
    });
};

export const getError = (e: any) => {
  if (typeof e === "string") {
    return e;
  }

  if (typeof e === "object") {
    const props = Object.getOwnPropertyNames(e);
    return props.reduce(
      (acc, prop) => {
        acc[prop] = e[prop];
        return acc;
      },
      {} as any
    );
  }

  return "Unknown error in Worker";
};
