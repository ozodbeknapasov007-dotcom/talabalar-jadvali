module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Cache-Control', 'no-store');
  if (req.method === 'POST') {
    return res.status(200).json({ success: true, had_pending: false });
  }
  return res.status(200).json({ mode: 'github' });
};
