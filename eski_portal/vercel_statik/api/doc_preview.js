const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

function extractImagesFromDocxBuffer(buf) {
  const images = [];
  let offset = 0;
  while (offset < buf.length - 30) {
    if (buf.readUInt32LE(offset) === 0x04034b50) {
      const compMethod = buf.readUInt16LE(offset + 8);
      const compSize = buf.readUInt32LE(offset + 18);
      const fnLen = buf.readUInt16LE(offset + 26);
      const extraLen = buf.readUInt16LE(offset + 28);
      const fn = buf.toString('utf8', offset + 30, offset + 30 + fnLen);
      const dataStart = offset + 30 + fnLen + extraLen;
      const dataEnd = dataStart + compSize;

      if (fn.startsWith('word/media/') && !fn.endsWith('/')) {
        try {
          const rawData = buf.slice(dataStart, dataEnd);
          const imgData = compMethod === 8 ? zlib.inflateRawSync(rawData) : rawData;
          const ext = path.extname(fn).toLowerCase().replace('.', '');
          const mime = ext === 'png' ? 'image/png' : (ext === 'gif' ? 'image/gif' : 'image/jpeg');
          images.push(`data:${mime};base64,${imgData.toString('base64')}`);
        } catch (e) {}
      }
      offset = dataEnd;
    } else {
      offset++;
    }
  }
  return images;
}

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
  const repoOwner = 'ozodbeknapasov007-dotcom';
  const repoName = 'talabalar-jadvali';

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

  const images = extractImagesFromDocxBuffer(buffer);

  res.setHeader('Cache-Control', 'public, max-age=86400, stale-while-revalidate=43200');
  return res.status(200).json({
    success: images.length > 0,
    filename: fileName,
    filepath: `files/${fileName}`,
    images: images
  });
};
