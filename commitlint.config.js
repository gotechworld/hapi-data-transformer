module.exports = {
  plugins: ["commitlint-plugin-jira-rules"],
  extends: ["jira"],
  rules: {
    "jira-task-id-empty": [2, "always", 1],
    "jira-task-id-min-length": [2, "always", 9],
    "jira-task-id-max-length": [2, "always", 13],
    "jira-task-id-case": [2, "always", "uppercase"],
    "jira-task-id-separator": [2, "always", "-"],
    "jira-task-id-project-key": [2, "always", ["ECOMDEV", "ECOMSUPP"]],
    "jira-commit-message-separator": [2, "always", ":"],
  },
};
