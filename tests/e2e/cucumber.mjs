const getWorldParams = () => {
  const params = {
    foo: "bar",
  };

  return params;
};

export default {
  requireModule: ["ts-node/register"],
  paths: ["features/**/*.feature"],
  require: ["src/**/*.ts"],
  format: [
    // "json:reports/cucumber-report.json",
    // "html:reports/report.html",
    "summary",
    "progress-bar",
    "@cucumber/pretty-formatter",
    "./src/support/reporters/allure-reporter.js",
  ],
  formatOptions: { snippetInterface: "async-await" },
  worldParameters: getWorldParams(),
  publishQuiet: true,
  retry: 1,
  backtrace: true,
  publish: true,
  // retryTagFilter: "@flaky",
};
