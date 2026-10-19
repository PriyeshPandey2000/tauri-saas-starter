module.exports = {
  extends: ["@commitlint/config-conventional"],
  rules: {
    "type-enum": [
      2,
      "always",
      ["build", "chore", "ci", "docs", "feat", "fix", "perf", "refactor", "style", "test", "revert"],
    ],
    "subject-empty": [2, "never"],
    "type-empty": [2, "never"],
    "scope-case": [2, "always", "kebab-case"],
  },
};
