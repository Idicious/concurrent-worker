// rollup.config.js
import ts from "rollup-plugin-typescript";
import typescript from "typescript";

export default {
  input: "src/index.ts",
  output: {
    file: "dist/index.es.js",
    format: "es",
    name: "Task"
  },
  plugins: [
    ts({
      typescript,
      emitDeclarationOnly: false
    })
  ]
};
