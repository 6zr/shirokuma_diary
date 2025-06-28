const core = require("@actions/core");
// const github = require("@actions/github");

const keywords = core.getInput("keywords");
console.log(keywords);
