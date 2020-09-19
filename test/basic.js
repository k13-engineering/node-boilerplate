/* global describe */
/* global it */

import assert from "assert";
import boilerplate from "../lib/index.js";

describe("boilerplate", () => {
  describe("creation", () => {
    it("should provide a test message", () => {
      const inst = boilerplate.create();
      assert.equal(inst.message, "Hello, World!");
    });
  });
});
