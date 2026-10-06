import assert from "node:assert";
import { PassThrough } from "node:stream";
import { describe, it } from "mocha";
import { createInitWizard } from "./init-wizard.ts";
import type { TWizardData } from "./init-wizard.ts";

const suggestions: TWizardData = {
  packageName: "@k13engineering/my-package",
  description: "my description",
  authorName: "author",
  authorEmail: "author@example.com",
  license: "LGPL-2.1-only",
  main: "lib/index.ts",
  mainNpm: "dist/lib/index.js",
  repositoryUrl: "https://example.com/repo.git",
  bugsUrl: "https://example.com/repo/issues",
  homepageUrl: "https://example.com/repo#readme",
};

// answers every prompt of the wizard with the next of the given lines
const runWizard = async ({ lines }: { lines: string[] }) => {
  // eslint-disable-next-line k13-engineering/no-new
  const input = new PassThrough();
  // eslint-disable-next-line k13-engineering/no-new
  const output = new PassThrough();

  let written = "";
  let remainingLines = lines;

  output.on("data", (chunk) => {
    written += chunk.toString();

    if (written.endsWith("): ") && remainingLines.length > 0) {
      input.write(`${remainingLines[0]}\n`);
      remainingLines = remainingLines.slice(1);
    }
  });

  const wizard = createInitWizard({ suggestions, input, output });
  const answers = await wizard.prompt();

  return { answers, written };
};

const emptyAnswers = Object.keys(suggestions).map(() => {
  return "";
});

describe("init wizard", () => {
  it("should use the suggestions for empty answers", async () => {
    const { answers } = await runWizard({ lines: emptyAnswers });

    assert.deepStrictEqual(answers, suggestions);
  });

  it("should use given answers, trimmed", async () => {
    const { answers } = await runWizard({ lines: ["  @k13engineering/other  ", "other description", ...emptyAnswers.slice(2)] });

    assert.deepStrictEqual(answers, {
      ...suggestions,
      packageName: "@k13engineering/other",
      description: "other description",
    });
  });

  it("should show the suggestions in the prompts", async () => {
    const { written } = await runWizard({ lines: emptyAnswers });

    assert.ok(written.includes("packageName (@k13engineering/my-package): "));
    assert.ok(written.includes("homepageUrl (https://example.com/repo#readme): "));
  });

  it("should reject answers consisting of whitespace only", async () => {
    await assert.rejects(runWizard({ lines: ["   "] }), {
      message: "Please provide a valid value for packageName"
    });
  });
});
