import { IWorkerConfig, IWorkerContext } from "./types";
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
        .map((key) => `this.${key} = ${getContextDeclaration(context[key])}`)
        .join(`;\r\n\r\n`)
    : "";

const isUrlRelative = (url: string) => {
  return url.indexOf("://") === -1 && url.indexOf("//") === -1;
};

const getScriptPath = (url: string) => {
  if (isUrlRelative(url)) {
    return `'${location?.origin + url}'`;
  }

  return `'${url}'`;
};

const getScriptImport = (scripts?: string[]) =>
  scripts != null && scripts.length > 0
    ? `importScripts(${scripts.map(getScriptPath).join(",")});`
    : "";

const getScript = <T extends Array<unknown>, C extends IWorkerContext, R>(
  execute: (...args: T) => R,
  config: IWorkerConfig<T, C, R>,
  terminateOnCompletion: boolean
) =>
  `
${getScriptImport(config.scripts)}
${getContextString(config.context)}
self.terminateOnCompletion = ${terminateOnCompletion};
self.getError = ${getError};
self.getTransferrables = ${config.outTransferable ?? noop};
self.run = ${execute};
self.onmessage = ${onmessage};
`.trim();

export const createWorkerUrl = <
  T extends Array<unknown>,
  C extends IWorkerContext,
  R
>(
  execute: (...args: T) => R,
  config: IWorkerConfig<T, C, R>,
  terminateOnCompletion = false
): string => {
  const script = getScript(execute, config, terminateOnCompletion);
  const blob = new Blob([script], { type: "application/javascript" });

  return URL.createObjectURL(blob);
};
