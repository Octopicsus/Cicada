/** @type {import("@commitlint/types").UserConfig} */
export default {
  extends: ["@commitlint/config-conventional"],
  rules: {
    "type-enum": [
      2,
      "always",
      [
        "feat", // new feature
        "fix", // bug fix
        "perf", // performance improvement
        "refactor", // code change without behavior change
        "style", // formatting only (no code change)
        "test", // add / update tests
        "docs", // docs / README / ADR
        "build", // build system, deps
        "ci", // CI config
        "chore", // tooling, scaffolds, no production code
        "revert", // revert a prior commit
      ],
    ],
    "subject-case": [2, "never", ["pascal-case", "upper-case"]],
    "subject-empty": [2, "never"],
    "subject-full-stop": [2, "never", "."],
    "body-max-line-length": [1, "always", 100],
    "footer-max-line-length": [0],
  },
};
