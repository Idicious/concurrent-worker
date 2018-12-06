import { ITaskOptions, IWorkerContext } from "./types";
import { getError, noop, onmessage } from "./worker";

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

const getContextString = (context?: IWorkerContext) =>
  context
    ? Object.keys(context)
        .map(key => `this.${key} = ${getContextDeclaration(context[key])}`)
        .join(`;\r\n\r\n`)
    : "";

const isUrlRelative = (url: string) => {
  return url.indexOf("://") === -1 && url.indexOf("//") === -1;
};

const getScriptImport = (scripts?: string[], rootUrl: string = "") =>
  scripts && scripts.length > 0
    ? `importScripts(${scripts
        .map(script =>
          isUrlRelative(script) ? `"${rootUrl}${script}"` : `"${script}"`
        )
        .join(",")});`
    : "";

const getScript = <T extends Array<unknown>, R, C extends IWorkerContext>(
  execute: (...args: T) => R,
  options: ITaskOptions<T, R, C>
) =>
  `
${getScriptImport(options.scriptsPath, options.rootUrl)}
${getContextString(options.context)}
self.getError = ${getError};
self.getTransferrables = ${options.outTransferable || noop};
self.run = ${execute};
self.onmessage = ${onmessage};
`.trim();

export const createWorkerUrl = <
  T extends Array<unknown>,
  R,
  C extends IWorkerContext
>(
  execute: (...args: T) => R,
  options: ITaskOptions<T, R, C>
): string => {
  const script = getScript(execute, options);
  const blob = new Blob([script], { type: "application/javascript" });

  return URL.createObjectURL(blob);
};
