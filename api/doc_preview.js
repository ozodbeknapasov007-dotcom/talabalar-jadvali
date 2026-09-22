const AdmZip = require('adm-zip');
const path = require('path');
const fs = require('fs');

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const rawFile = req.query.file || '';
  const fileName = rawFile ? decodeURIComponent(rawFile).trim() : '';

  if (!fileName) {
    return res.status(400).json({ success: false, error: "Fayl nomi ko'rsatilmadi" });
  }

  const token = process.env.GITHUB_TOKEN || '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';
  const repoOwner = 'OzodbekNapasov';
  const repoName = 'Talabalar-ro-yhati';

  let buffer = null;

  // 1. Avval mahalliy Vercel fayllar tizimidan tekshirish
  const localCandidates = [
    path.join(process.cwd(), 'files', fileName),
    path.join(process.cwd(), fileName)
  ];

  for (const p of localCandidates) {
    if (fs.existsSync(p)) {
      try {
        buffer = fs.readFileSync(p);
        break;
      } catch (e) {}
    }
  }

  // 2. Agar lokal diskda bo'lmasa, GitHub API orqali yuklab olish
  if (!buffer) {
    try {
      const encName = encodeURIComponent(fileName);
      const ghUrl = `https://api.github.com/repos/${repoOwner}/${repoName}/contents/files/${encName}`;
      const ghRes = await fetch(ghUrl, {
        headers: {
          'Authorization': `token ${token}`,
          'Accept': 'application/vnd.github.v3+json',
          'User-Agent': 'Vercel-Doc-Preview'
        }
      });
      if (ghRes.ok) {
        const ghData = await ghRes.json();
        if (ghData.content) {
          buffer = Buffer.from(ghData.content, 'base64');
        }
      }
    } catch (e) {}
  }

  if (!buffer) {
    return res.status(200).json({
      success: false,
      filename: fileName,
      filepath: `files/${fileName}`,
      images: [],
      error: "Fayl topilmadi"
    });
  }

  const images = [];
  try {
    const zip = new AdmZip(buffer);
    const entries = zip.getEntries();
    for (const entry of entries) {
      if (entry.entryName.startsWith('word/media/') && !entry.isDirectory) {
        const imgBuf = entry.getData();
        const ext = path.extname(entry.entryName).toLowerCase().replace('.', '');
        const mime = ext === 'png' ? 'image/png' : (ext === 'gif' ? 'image/gif' : 'image/jpeg');
        images.push(`data:${mime};base64,${imgBuf.toString('base64')}`);
      }
    }
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }

  res.setHeader('Cache-Control', 'public, max-age=86400, stale-while-revalidate=43200');
  return res.status(200).json({
    success: images.length > 0,
    filename: fileName,
    filepath: `files/${fileName}`,
    images: images
  });
};
