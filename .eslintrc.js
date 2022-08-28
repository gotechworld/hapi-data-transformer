module.exports = {
  env: {
    browser: false,
    es6: true,
    node: true,
  },
  extends: ["@hapi/eslint-config-hapi"],
  parser: "babel-eslint",
  parserOptions: {
    ecmaVersion: 2020,
    sourceType: "module",
    ecmaFeatures: {
      jsx: true,
      modules: true,
      experimentalObjectRestSpread: true,
    },
  },
  rules: {
    "prefer-destructuring": ["error", { object: true, array: false }],
    "linebreak-style": ["error", "unix"],
    "no-console": 0,
    quotes: ["error", "double"],
    indent: ["error", 2],
    // "comma-dangle": ["error", "always-multiline"],
    "@hapi/hapi/scope-start": ["off"],
    "brace-style": ["error", "1tbs"],
  },
};
