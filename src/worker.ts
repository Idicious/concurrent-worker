import {
  Input,
  ITaskOptions,
  IWorkerContext,
  noopArray,
  Transferable
} from "./types";

declare global {
  // tslint:disable-next-line:interface-name
  interface Window {
    run<T extends Array<unknown>, R>(...args: T): R;
    getTransferrables<T>(val: T): Transferable[];
  }
}

const RUN = "run";
const TRANSFERRABLE = "getTransferrables";
const RUN_DECLARATION = `self.${RUN}`;
const TRANSFERRABLE_DECLARATION = `self.${TRANSFERRABLE}`;
const ONMESSAGE_DECLARATION = "self.onmessage";
const CONTEXT_DELIMITER = `;\r\n\r\n`;

/**
 * Calling functions through string constants makes sure that aggressive minification
 * does not break the call. The same applies to the apply call, this ensures no polyfill
 * is assumed for a rest spread which would also break the worker script.
 *
 * Tested with Closure Compiler ADVANCED mode with ES3, ES5 and ES6 target.
 * @param message
 */
export const onmessage = <T extends Array<unknown>, R>(message: Input<T>) => {
  try {
    const res = self[RUN].apply(null, message.data[1]);
    Promise.resolve(res)
      .then(result => {
        const transferrable = self[TRANSFERRABLE]<R>(result);
        self.postMessage(
          [message.data[0], result, false],
          transferrable as any
        );
      })
      .catch(error => {
        self.postMessage([message.data[0], error, true], undefined as any);
      });
  } catch (e) {
    const props = Object.getOwnPropertyNames(e);
    const error = props.reduce(
      (acc, prop) => {
        acc[prop] = e[prop];
        return acc;
      },
      {} as any
    );
    self.postMessage([message.data[0], error, true], undefined as any);
  }
};

const getContextDeclaration = <T>(contextItem: T) => {
  switch (typeof contextItem) {
    case "boolean":
    case "number":
      return contextItem;
    case "string":
      return `'${contextItem}'`;
    case "function":
      return `${contextItem}`;
    case "object":
      return JSON.stringify(contextItem, null, 2);
  }
};

const getContextString = (context: IWorkerContext) =>
  Object.keys(context)
    .map(key => `this.${key} = ${getContextDeclaration(context[key])}`)
    .join(CONTEXT_DELIMITER);

const getScriptImport = (scripts?: string[], rootUrl: string = "") =>
  scripts && scripts.length > 0
    ? `importScripts(${scripts
        .map(script => `"${rootUrl}${script}"`)
        .join(",")});`
    : "";

const getScript = <T extends Array<unknown>, R>(
  execute: (...args: T) => R,
  context: IWorkerContext,
  options: ITaskOptions<T, R>
) =>
  `
${getScriptImport(options.scriptsPath, options.rootUrl)}
${getContextString(context)}

self.RUN = '${RUN}';
self.TRANSFERRABLE = '${TRANSFERRABLE}';

${TRANSFERRABLE_DECLARATION} = ${options.outTransferable || noopArray};

${RUN_DECLARATION} = ${execute};
  
${ONMESSAGE_DECLARATION} = ${onmessage};
`.trim();

export const createWorkerUrl = <T extends Array<unknown>, R>(
  execute: (...args: T) => R,
  context: IWorkerContext,
  options: ITaskOptions<T, R>
): string => {
  const script = getScript(execute, context, options);
  const blob = new Blob([script], { type: "application/javascript" });

  return URL.createObjectURL(blob);
};
