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

const createInitWizard = ({
  suggestions,
}: {
  suggestions: TWizardData
}) => {

  const prompt = async () => {

    let answers: TWizardData = suggestions;

    const rl = nodeReadline.promises.createInterface({
      input: process.stdin,
      output: process.stdout,
    });

    const keys = Object.keys(suggestions) as (keyof TWizardData)[];

    for (const key of keys) {
      const answer = await rl.question(`${key} (${suggestions[key]}): `);
      if (answer.length === 0) {
        answers = {
          ...answers,
          [key]: suggestions[key],
        };
      } else {

        const answerTrimmed = answer.trim();
        if (answerTrimmed.length === 0) {
          console.log(`Please provide a valid value for ${key}`);
          process.exit(1);
        }

        answers = {
          ...answers,
          [key]: answerTrimmed,
        };
      }
    };

    rl.close();

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
