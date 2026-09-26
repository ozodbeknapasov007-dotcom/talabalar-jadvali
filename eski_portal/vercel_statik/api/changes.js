const githubSync = require('./github_sync');

module.exports = async function handler(req, res) {
  return githubSync(req, res);
};
