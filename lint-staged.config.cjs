// `npm run lint` checks the whole project, so the staged files are not passed to it. Passed files that
// .eslintignore excludes, such as unit tests, each produce a warning that counts towards --max-warnings
module.exports = {
  "*.{vue,js,ts,html}": () => "npm run lint",
};
