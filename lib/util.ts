import child_process from "child_process";

const findGitOriginOfRepo = ({ repoDirectory }: { repoDirectory: string }) => {
  try {
    const stdoutAsString = child_process.execSync("git remote get-url origin", {
      cwd: repoDirectory,
      encoding: "utf-8",
      stdio: ["ignore", "pipe", "pipe"],
    });

    return stdoutAsString.trim();
  } catch (ex) {

    const err = ex as Error;

    if (err.message.includes("fatal: not a git repository")) {
      return undefined;
    }

    throw Error(`git failed to get remote url`, { cause: ex });
  }
};

export {
  findGitOriginOfRepo
};
