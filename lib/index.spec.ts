import assert from "node:assert";
import { describe, it } from "mocha";
import { create } from "./index.ts";

describe("boilerplate", () => {
  describe("creation", () => {
    it("should provide a test message", () => {
      const inst = create();
      assert.equal(inst.message, "Hello, World!");
    });
  });
});
