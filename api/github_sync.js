// Vercel Serverless Function: O'zgarishlarni to'g'ridan-to'g'ri GitHub'ga saqlash
export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Faqat POST so\'rovi qabul qilinadi' });
  }

  const GITHUB_TOKEN = process.env.GITHUB_TOKEN || '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';
  const REPO_OWNER = 'OzodbekNapasov';
  const REPO_NAME = 'Talabalar-ro-yhati';
  const FILE_PATH = 'scripts/remote_changes.json';

  if (!GITHUB_TOKEN) {
    return res.status(500).json({ error: 'GITHUB_TOKEN muhit o\'zgaruvchisi topilmadi' });
  }

  try {
    const change = req.body;
    if (!change || !change.type) {
      return res.status(400).json({ error: 'O\'zgarish ma\'lumoti noto\'g\'ri' });
    }

    // 1. GitHub'dagi mavjud remote_changes.json faylini o'qish
    const getUrl = `https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/contents/${FILE_PATH}`;
    const getRes = await fetch(getUrl, {
      headers: {
        'Authorization': `token ${GITHUB_TOKEN}`,
        'Accept': 'application/vnd.github.v3+json',
        'User-Agent': 'Vercel-GitHub-Sync'
      }
    });

    let currentList = [];
    let sha = null;

    if (getRes.ok) {
      const fileData = await getRes.json();
      sha = fileData.sha;
      const decodedContent = Buffer.from(fileData.content, 'base64').toString('utf-8');
      try {
        currentList = JSON.parse(decodedContent);
        if (!Array.isArray(currentList)) currentList = [];
      } catch (e) {
        currentList = [];
      }
    }

    // 2. Yangi o'zgarishni navbatga qo'shish
    change.id = 'chg_' + Date.now();
    change.created_at = new Date().toISOString();
    currentList.push(change);

    // 3. GitHub'ga to'g'ridan-to'g'ri commit qilish
    const updatedContent = Buffer.from(JSON.stringify(currentList, null, 2), 'utf-8').toString('base64');
    const putRes = await fetch(getUrl, {
      method: 'PUT',
      headers: {
        'Authorization': `token ${GITHUB_TOKEN}`,
        'Accept': 'application/vnd.github.v3+json',
        'Content-Type': 'application/json',
        'User-Agent': 'Vercel-GitHub-Sync'
      },
      body: JSON.stringify({
        message: `Remote o'zgarish: ${change.type} (${change.id})`,
        content: updatedContent,
        sha: sha
      })
    });

    if (!putRes.ok) {
      const errDetails = await putRes.text();
      return res.status(500).json({ error: 'GitHub commit xatosi', details: errDetails });
    }

    return res.status(200).json({
      success: true,
      change_id: change.id,
      message: 'O\'zgarish to\'g\'ridan-to\'g\'ri GitHub\'ga saqlandi!'
    });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
