import { create as createNodeTestRunner } from "ya-test-library/node-test-runner";
import { createBasicTestGroup } from "./basic.js";

const runner = createNodeTestRunner();

runner.run({
  group: createBasicTestGroup()
});
