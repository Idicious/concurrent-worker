// rollup.config.js
import ts from "rollup-plugin-typescript";
import typescript from "typescript";

function getExtension(format) {
  switch (format) {
    case "umd":
      return "js";
    case "es":
      return "es.js";
    default:
      return "js";
  }
}

const format = process.env.format;
const extension = getExtension(format);

export default {
  input: "src/index.ts",
  output: {
    file: `dist/index.${extension}`,
    format,
    name: "Task",
  },
  plugins: [
    ts({
      typescript,
      emitDeclarationOnly: false,
    }),
  ],
};
