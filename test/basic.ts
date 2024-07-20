import assert from "node:assert";
import boilerplate from "../lib/index.ts";

const createBasicTestGroup = () => {
  return {
    groups: {
      boilerplate: {

        groups: {
          creation: {

            tests: {
              "should provide a test message": () => {
                const inst = boilerplate.create();
                assert.equal(inst.message, "Hello, World!");
              }
            }

          }
        }

      }
    }
  };
};

export {
  createBasicTestGroup
};
