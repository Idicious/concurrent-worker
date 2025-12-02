import { IWorkerConfig, IWorkerContext } from "./types";
import { getScriptImport, noop, onMessage, toSource } from "./worker";

const getScript = <T extends Array<unknown>, C extends IWorkerContext, R>(
  execute: (...args: T) => R,
  config: IWorkerConfig<T, C, R>,
) =>
  `
${getScriptImport(config.scripts)}
self.context = ${toSource(config.context)};
self.getTransferrable = ${config.outTransferable ?? noop};
self.run = ${execute};
self.addEventListener("message", ${onMessage});
self.onMessage = ${onMessage};
self.toSource = ${toSource};
self.noop = ${noop};
self.getScriptImport = ${getScriptImport};
`.trim();

export const createWorkerUrl = <
  T extends Array<unknown>,
  C extends IWorkerContext,
  R,
>(
  execute: (...args: T) => R,
  config: IWorkerConfig<T, C, R>,
): string => {
  const script = getScript(execute, config);
  const blob = new Blob([script], { type: "application/javascript" });

  return URL.createObjectURL(blob);
};
