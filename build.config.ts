import { defineBuildConfig } from "unbuild"

export default defineBuildConfig({
  entries: [
    "src/safe/index",
    "src/try/index",
    "src/pipe/index",
  ],
  declaration: true,
  clean: true,
  rollup: {
    emitCJS: false,
  },
})
