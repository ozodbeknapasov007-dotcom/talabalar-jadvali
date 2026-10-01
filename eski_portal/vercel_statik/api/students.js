const fs = require('fs');
const path = require('path');

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');

  const token = process.env.GITHUB_TOKEN || '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';
  const repoOwner = 'ozodbeknapasov007-dotcom';
  const repoName = 'talabalar-jadvali';

  try {
    // 1. Try fresh students.json from GitHub API first so edits show up immediately
    const ghUrl = `https://api.github.com/repos/${repoOwner}/${repoName}/contents/students.json?ref=main&_t=${Date.now()}`;
    const ghRes = await fetch(ghUrl, {
      headers: {
        'Authorization': `token ${token}`,
        'Accept': 'application/vnd.github.raw',
        'User-Agent': 'Vercel-Web-Portal',
        'Cache-Control': 'no-cache'
      }
    });
    if (ghRes.ok) {
      const text = await ghRes.text();
      const students = JSON.parse(text);
      return res.status(200).json({
        students,
        source: 'github',
        fetchedAt: new Date().toISOString()
      });
    }
  } catch (e) {}

  // 2. Fallback to local bundled students.json
  try {
    const localPath = path.join(process.cwd(), 'students.json');
    const students = JSON.parse(fs.readFileSync(localPath, 'utf-8'));
    return res.status(200).json({
      students,
      source: 'github',
      fetchedAt: new Date().toISOString()
    });
  } catch (e) {
    return res.status(500).json({
      students: [],
      source: 'github',
      fetchedAt: new Date().toISOString(),
      error: e.message
    });
  }
};
