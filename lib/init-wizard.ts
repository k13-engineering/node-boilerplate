import nodeReadline from "node:readline";

type TWizardData = {
  packageName: string;
  description: string;
  authorName: string;
  authorEmail: string;
  license: string;
  main: string;
  mainNpm: string;
  repositoryUrl: string;
  bugsUrl: string;
  homepageUrl: string;
}

const processAnswer = ({
  key,
  answer,
  suggestion
}: {
  key: string,
  answer: string,
  suggestion: string
}) => {
  if (answer.length === 0) {
    return suggestion;
  }

  const answerTrimmed = answer.trim();
  if (answerTrimmed.length === 0) {
    throw Error(`Please provide a valid value for ${key}`);
  }

  return answerTrimmed;
};

const createInitWizard = ({
  suggestions,
  input = process.stdin,
  output = process.stdout,
}: {
  suggestions: TWizardData,
  input?: NodeJS.ReadableStream,
  output?: NodeJS.WritableStream,
}) => {

  const prompt = async () => {

    let answers: TWizardData = suggestions;

    const rl = nodeReadline.promises.createInterface({
      input,
      output,
    });

    const keys = Object.keys(suggestions) as (keyof TWizardData)[];

    try {
      for (const key of keys) {
        const answer = await rl.question(`${key} (${suggestions[key]}): `);

        answers = {
          ...answers,
          [key]: processAnswer({ key, answer, suggestion: suggestions[key] }),
        };
      }
    } finally {
      rl.close();
    }

    return answers;
  };

  return {
    prompt
  };
};

export {
  createInitWizard
};

export type {
  TWizardData
};
