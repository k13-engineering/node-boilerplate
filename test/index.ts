import { create as createNodeTestRunner } from "ya-test-library/node-test-runner";
import { createBasicTestGroup } from "./basic.ts";

const runner = createNodeTestRunner();

runner.run({
  group: createBasicTestGroup()
});
