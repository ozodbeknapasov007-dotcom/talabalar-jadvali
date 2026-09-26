// Vercel Serverless Function: Talabani o'chirish endpointi
const githubSyncHandler = require('./github_sync');

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    let row = 0;
    let shnum = '';
    let pinfl = '';
    let ism = '';
    let fish = '';

    if (req.method === 'GET') {
      const q = req.query || {};
      row = parseInt(q.row || '0', 10);
      shnum = q.shnum || '';
      pinfl = q.pinfl || '';
      ism = q.ism || '';
      fish = q.fish || '';
    } else if (req.method === 'POST') {
      let b = req.body;
      if (typeof b === 'string') {
        try { b = JSON.parse(b); } catch(e) {}
      }
      b = b || {};
      row = parseInt(b.row || '0', 10);
      shnum = b.shnum || '';
      pinfl = b.pinfl || '';
      ism = b.ism || '';
      fish = b.fish || '';
    }

    // github_sync orqali navbatga yuboramiz
    req.method = 'POST';
    req.body = {
      type: 'delete_student',
      data: {
        row: row,
        shnum: shnum,
        pinfl: pinfl,
        ism: ism,
        fish: fish
      }
    };

    return await githubSyncHandler(req, res);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};
