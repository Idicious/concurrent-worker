import { Input } from "./types";

declare global {
  interface WorkerGlobalScope {
    terminateOnCompletion: boolean;
    run<T extends Array<unknown>, R>(...args: T): R;
    getTransferrables<T>(val: T): Transferable[];
    getError(e: unknown): Record<string, unknown> | string;
  }
}

export const noop = (): never[] => [];

/**
 * Calling functions through strings makes sure that aggressive minification
 * does not break the call. The same applies to the apply call, this ensures no polyfill
 * is assumed for a rest spread which would also break the worker script.
 *
 * Tested with Webpack dev and prod mode, Closure Compiler ADVANCED mode with ES3, ES5 and ES6 target.
 * @param message
 */
export const onmessage = <T extends Array<unknown>, R>(
  message: Input<T>
): Promise<void> => {
  return new Promise<R>((resolve) => {
    resolve(self["run"].apply<null, T, R>(null, message.data[1]));
  })
    .then((result) => {
      const transferrable = self["getTransferrables"]<R>(result);
      postMessage([message.data[0], result, false], transferrable);
    })
    .catch((e) => {
      const error = self["getError"](e);
      postMessage([message.data[0], error, true]);
    })
    .finally(() => {
      if (self["terminateOnCompletion"]) {
        close();
      }
    });
};

export const getError = (
  e?: string | Record<string, unknown>
): Record<string, unknown> | string => {
  if (typeof e === "string") {
    return e;
  }

  if (typeof e === "object") {
    const props = Object.getOwnPropertyNames(e);
    return props.reduce((acc, prop) => {
      acc[prop] = e[prop];
      return acc;
    }, {} as Record<string, unknown>);
  }

  return "Unknown error in Worker";
};
