// Vercel Serverless Function: O'zgarishlarni to'g'ridan-to'g'ri GitHub'ga saqlash
module.exports = async function handler(req, res) {
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
  const REPO_OWNER = 'ozodbeknapasov007-dotcom';
  const REPO_NAME = 'talabalar-jadvali';
  const FILE_PATH = 'scripts/remote_changes.json';

  if (!GITHUB_TOKEN) {
    return res.status(500).json({ error: 'GITHUB_TOKEN muhit o\'zgaruvchisi topilmadi' });
  }

  try {
    let change = req.body;
    if (typeof change === 'string') {
      try { change = JSON.parse(change); } catch(e) {}
    }
    if (!change || !change.type) {
      return res.status(400).json({ error: 'O\'zgarish ma\'lumoti noto\'g\'ri' });
    }

    change.id = change.id || ('chg_' + Date.now());
    change.created_at = change.created_at || new Date().toISOString();

    // RETRY LOOP (409 Conflict yoki tarmoq kechikishida 4 martagacha qayta urinadi)
    const maxRetries = 4;
    let lastError = null;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        // 1. GitHub'dagi mavjud remote_changes.json faylini keshsiz yangi SHA bilan o'qish
        const getUrl = `https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/contents/${FILE_PATH}?ref=main&_t=${Date.now()}`;
        const getRes = await fetch(getUrl, {
          headers: {
            'Authorization': `token ${GITHUB_TOKEN}`,
            'Accept': 'application/vnd.github.v3+json',
            'User-Agent': 'Vercel-GitHub-Sync',
            'Cache-Control': 'no-cache, no-store, must-revalidate',
            'Pragma': 'no-cache'
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

        // 2. Yangi o'zgarishni navbatga qo'shish (dublikatsiz)
        const alreadyExists = currentList.some(item => item.id === change.id);
        if (!alreadyExists) {
          currentList.push(change);
        }

        // 3. GitHub'ga to'g'ridan-to'g'ri commit qilish
        const updatedContent = Buffer.from(JSON.stringify(currentList, null, 2), 'utf-8').toString('base64');
        const putUrl = `https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/contents/${FILE_PATH}`;
        const putRes = await fetch(putUrl, {
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

        if (putRes.ok) {
          return res.status(200).json({
            success: true,
            change_id: change.id,
            message: 'O\'zgarish to\'g\'ridan-to\'g\'ri GitHub\'ga saqlandi!'
          });
        }

        // Agar 409 Conflict bo'lsa (boshqa commit bo'lgan) - yangi SHA bilan qayta urinish
        const errDetails = await putRes.text();
        lastError = errDetails;
        if (putRes.status === 409 && attempt < maxRetries) {
          await new Promise(r => setTimeout(r, 400 * attempt));
          continue;
        }

        if (attempt === maxRetries) {
          return res.status(500).json({ error: 'GitHub commit xatosi', details: errDetails, attempt: attempt });
        }
      } catch(innerErr) {
        lastError = innerErr.message;
        if (attempt < maxRetries) {
          await new Promise(r => setTimeout(r, 400 * attempt));
          continue;
        }
      }
    }

    return res.status(500).json({ error: 'GitHub commit xatosi', details: lastError });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};
