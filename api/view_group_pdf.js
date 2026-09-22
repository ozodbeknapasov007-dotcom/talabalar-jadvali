module.exports = function (req, res) {
  const group = req.query.group || '26-01';
  // Foydalanuvchini to'g'ridan-to'g'ri statik PDF faylga yo'naltirish
  return res.redirect(302, `/pdf_jurnallar/Guruh_${group}.pdf`);
};
