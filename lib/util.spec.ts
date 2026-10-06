import assert from "node:assert";
import child_process from "node:child_process";
import nodeFs from "node:fs";
import nodeOs from "node:os";
import nodePath from "node:path";
import { afterEach, beforeEach, describe, it } from "mocha";
import { findGitOriginOfRepo } from "./util.ts";

describe("util", () => {
  describe("findGitOriginOfRepo", () => {
    let repoDirectory = "";

    const git = ({ args }: { args: string[] }) => {
      child_process.execFileSync("git", args, { cwd: repoDirectory, stdio: "ignore" });
    };

    beforeEach(() => {
      repoDirectory = nodeFs.mkdtempSync(nodePath.join(nodeOs.tmpdir(), "boilerplate-util-"));
    });

    afterEach(() => {
      nodeFs.rmSync(repoDirectory, { recursive: true, force: true });
    });

    it("should return the origin url of a repository", () => {
      git({ args: ["init", "--quiet"] });
      git({ args: ["remote", "add", "origin", "git@github.com:k13-engineering/node-example.git"] });

      assert.strictEqual(findGitOriginOfRepo({ repoDirectory }), "git@github.com:k13-engineering/node-example.git");
    });

    it("should return undefined outside of a repository", () => {
      assert.strictEqual(findGitOriginOfRepo({ repoDirectory }), undefined);
    });

    it("should fail for repositories without origin", () => {
      git({ args: ["init", "--quiet"] });

      assert.throws(() => {
        findGitOriginOfRepo({ repoDirectory });
      }, {
        message: "git failed to get remote url"
      });
    });
  });
});
