import { Input } from "./types";

declare global {
  // tslint:disable-next-line:interface-name
  interface Window {
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
/* istanbul ignore next */
export const onmessage = <T extends Array<unknown>, R>(message: Input<T>) => {
  try {
    // tslint:disable-next-line:no-string-literal
    const res = self["run"].apply(null, message.data[1]) as R;
    Promise.resolve(res)
      .then(result => {
        // tslint:disable-next-line:no-string-literal
        const transferrable = self["getTransferrables"]<R>(result);
        self.postMessage(
          [message.data[0], result, false],
          transferrable as any
        );
      })
      .catch(error => {
        self.postMessage([message.data[0], error, true], undefined as any);
      });
  } catch (e) {
    // tslint:disable-next-line:no-string-literal
    const error = self["getError"](e);
    self.postMessage([message.data[0], error, true], undefined as any);
  }
};

/* istanbul ignore next */
export const getError = (e: any) => {
  const props = Object.getOwnPropertyNames(e);
  return props.reduce(
    (acc, prop) => {
      acc[prop] = e[prop];
      return acc;
    },
    {} as any
  );
};
