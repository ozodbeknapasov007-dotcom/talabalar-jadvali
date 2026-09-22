
window.handleNewDocFileSelected = function(input) {
  const labelSpan = document.getElementById('selectedFileName');
  if (!labelSpan) return;
  if (input.files && input.files[0]) {
    labelSpan.innerText = input.files[0].name;
    labelSpan.style.color = '#2563eb';
    labelSpan.style.fontWeight = '700';
  } else {
    labelSpan.innerText = 'Word (.docx) yoki rasm tanlang...';
    labelSpan.style.color = '';
    labelSpan.style.fontWeight = '';
  }
};

/* Talabalar Tizimi - Asosiy JavaScript (V8 - Direct Alert Confirmation + Live Edit + Live Row Update) */

window.currentStudentIdx = null;
window.currentDocImages = [];
window.currentImgIdx = 0;
window.imgZoom = 1;
window.imgRotate = 0;
window.imgPanX = 0;
window.imgPanY = 0;
window.isDragging = false;
window.dragStartX = 0;
window.dragStartY = 0;
window.isEditMode = false;

// SVG ICON KUTUBXONASI
const ICONS = {
  user: '<svg class="svg-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>',
  idCard: '<svg class="svg-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="16" rx="3"></rect><circle cx="9" cy="10" r="2"></circle><line x1="15" y1="8" x2="17" y2="8"></line><line x1="15" y1="12" x2="17" y2="12"></line><line x1="7" y1="16" x2="17" y2="16"></line></svg>',
  award: '<svg class="svg-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="8" r="7"></circle><polyline points="8.21 13.89 7 23 12 20 17 23 15.79 13.88"></polyline></svg>',
  file: '<svg class="svg-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline></svg>',
  folder: '<svg class="svg-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path></svg>',
  image: '<svg class="svg-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><circle cx="8.5" cy="8.5" r="1.5"></circle><polyline points="21 15 16 10 5 21"></polyline></svg>',
  zap: '<svg class="svg-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"></polygon></svg>',
  search: '<svg class="svg-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>',
  zoomIn: '<svg class="svg-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line><line x1="11" y1="8" x2="11" y2="14"></line><line x1="8" y1="11" x2="14" y2="11"></line></svg>',
  zoomOut: '<svg class="svg-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line><line x1="8" y1="11" x2="14" y2="11"></line></svg>',
  rotate: '<svg class="svg-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="23 4 23 10 17 10"></polyline><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"></path></svg>',
  reset: '<svg class="svg-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"></path><polyline points="3 3 3 8 8 8"></polyline></svg>',
  link: '<svg class="svg-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"></path><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"></path></svg>',
  close: '<svg class="svg-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>',
  edit: '<svg class="svg-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>',
  save: '<svg class="svg-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"></path><polyline points="17 21 17 13 7 13 7 21"></polyline><polyline points="7 3 7 8 15 8"></polyline></svg>',
  check: '<svg class="svg-icon svg-success" viewBox="0 0 24 24" fill="none" stroke="#16a34a" stroke-width="2.5"><polyline points="20 6 9 17 4 12"></polyline></svg>',
  cross: '<svg class="svg-icon svg-danger" viewBox="0 0 24 24" fill="none" stroke="#dc2626" stroke-width="2.5"><circle cx="12" cy="12" r="10"></circle><line x1="15" y1="9" x2="9" y2="15"></line><line x1="9" y1="9" x2="15" y2="15"></line></svg>',
  checkSm: '<svg class="svg-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" style="width:13px;height:13px;display:inline-block;vertical-align:-2px;margin-right:4px;"><polyline points="20 6 9 17 4 12"></polyline></svg>',
  clockSm: '<svg class="svg-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" style="width:13px;height:13px;display:inline-block;vertical-align:-2px;margin-right:4px;"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>',
  chevronLeft: '<svg viewBox="0 0 24 24" width="24" height="24" stroke="currentColor" stroke-width="2.5" fill="none" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 18 9 12 15 6"></polyline></svg>',
  chevronRight: '<svg viewBox="0 0 24 24" width="24" height="24" stroke="currentColor" stroke-width="2.5" fill="none" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"></polyline></svg>',
  moon: '<svg class="svg-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:14px;height:14px;display:inline-block;vertical-align:-2px;margin-right:6px;"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path></svg>',
  sun: '<svg class="svg-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:14px;height:14px;display:inline-block;vertical-align:-2px;margin-right:6px;"><circle cx="12" cy="12" r="5"></circle><line x1="12" y1="1" x2="12" y2="3"></line><line x1="12" y1="21" x2="12" y2="23"></line><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line><line x1="1" y1="12" x2="3" y2="12"></line><line x1="21" y1="12" x2="23" y2="12"></line><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line></svg>',
  infoSm: '<svg class="svg-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:13px;height:13px;display:inline-block;vertical-align:-2px;margin-right:3px;"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>'
};

window.openStudentModal = function(studentIdx, startInEditMode = false) {
  if (typeof RAW_STUDENTS === 'undefined' || !RAW_STUDENTS[studentIdx]) {
    alert("Talaba ma'lumotlari topilmadi: " + studentIdx);
    return;
  }
  window.currentStudentIdx = studentIdx;
  window.isEditMode = !!startInEditMode;
  const s = RAW_STUDENTS[studentIdx];

  const modal = document.getElementById('viewerModal');
  const modalTitle = document.getElementById('modalTitle');
  const modalBody = document.getElementById('modalBody');

  if (!modal || !modalTitle || !modalBody) return;

  const docFileName = s.doc_file ? s.doc_file : "Mavjud emas";
  modalTitle.innerHTML = ICONS.user + " <strong>" + s.fish + "</strong> &nbsp;|&nbsp; Shartnoma: #" + s.shnum;

  let qrBtn = '';
  if (s.sh_qr) {
    qrBtn = `<a href="${s.sh_qr}" target="_blank" class="btn btn-export" style="padding:5px 12px;font-size:11.5px;display:inline-flex;align-items:center;gap:6px;">${ICONS.link} QR PDF</a>`;
  }

  // Asosiy Modal Strukturasi (Faqat 1 marta chiziladi)
  modalBody.innerHTML = `
    <!-- Top Bar: Fayl yo'li + Fayl biriktirish + Edit/AI Tugmalari -->
    <div class="modal-top-bar">
      <div style="display:flex;align-items:center;gap:8px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">
        <span style="font-size:12px;font-weight:700;color:#94a3b8;text-transform:uppercase;display:flex;align-items:center;gap:5px;">${ICONS.folder} Fayl:</span>
        <code id="modalFilePath" style="font-size:13px;color:#38bdf8;font-weight:800;background:rgba(56,189,248,0.12);padding:3px 10px;border-radius:6px;border:1px solid rgba(56,189,248,0.3);">files/${docFileName}</code>
      </div>
      <div style="display:flex;gap:8px;align-items:center;flex-shrink:0;flex-wrap:wrap;">
        ${qrBtn}
        <!-- Fayl biriktirish / almashtirish inputi -->
        <input type="file" id="attachFileInput" accept=".docx,image/*" style="display:none;" onchange="if(this.files.length) uploadAndAttachForCurrentStudent(this.files[0])">
        <button type="button" class="btn btn-export" style="padding:6px 16px; font-size:12px;" onclick="document.getElementById('attachFileInput').click()">
          ${ICONS.file} Fayl Biriktirish
        </button>
        <button type="button" id="btnScanQR" class="btn btn-add" style="padding:6px 16px; font-size:12px;" onclick="scanStudentQROnly()">
          <svg class="svg-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="7" height="7"></rect><rect x="14" y="3" width="7" height="7"></rect><rect x="14" y="14" width="7" height="7"></rect><rect x="3" y="14" width="7" height="7"></rect></svg>
          QR Skaner (Avtomatik)
        </button>
        <button type="button" id="btnToggleEditTop" class="btn btn-edit-main" onclick="toggleEditMode(!window.isEditMode)">
          ${ICONS.edit} Tahrirlash
        </button>
        <button type="button" id="btnReanalyze" class="btn btn-multi-export" style="padding:6px 16px; font-size:12px;" onclick="reanalyzeCurrentStudent()">
          ${ICONS.zap} AI Pro Qayta Tekshirish
        </button>
        <button type="button" id="btnDeleteStudentTop" class="btn btn-danger" style="padding:6px 16px; font-size:12px;" onclick="deleteCurrentStudent()">
          <svg class="svg-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg>
          Talabani O'chirish
        </button>
      </div>
    </div>

    <div id="reanalyzeStatus" style="display:none;padding:8px 14px;border-radius:6px;font-weight:600;font-size:12px;"></div>

    <!-- 1. Rasmlar Galereyasi / Drag & Drop Dropzone -->
    <div class="gallery-wrapper" id="modalGalleryWrapper"
         ondragover="event.preventDefault(); this.style.border='2px dashed #2563eb'; this.style.background='#eff6ff';"
         ondragleave="this.style.border='none'; this.style.background='#f8fafc';"
         ondrop="event.preventDefault(); this.style.border='none'; this.style.background='#f8fafc'; if(event.dataTransfer.files.length) uploadAndAttachForCurrentStudent(event.dataTransfer.files[0]);">
      <div id="modalImagesContainer" style="text-align:center;padding:20px;color:#64748b;height:100%;display:flex;align-items:center;justify-content:center;">
        Rasmlar yuklanmoqda, iltimos kuting...
      </div>
    </div>
    
    <!-- 2. Olingan Aniq Ma'lumotlar Kartalari -->
    <div class="data-wrapper" id="modalDataWrapper"></div>
  `;

  // Kartalarni chizamiz
  renderInfoCards(s, false);
  modal.style.display = 'flex';

  // Parallel tarzda rasmlarni yuklaymiz
  const imgBox = document.getElementById('modalImagesContainer');
  window.currentDocImages = [];

  if (!s.doc_file) {
    imgBox.innerHTML = `
      <div style="padding:24px 16px; width:100%; border:2px dashed #cbd5e1; border-radius:12px; background:#f8fafc; text-align:center; cursor:pointer;" onclick="document.getElementById('attachFileInput').click()">
        <div style="margin-bottom:8px;"><svg class="svg-icon" style="width:38px;height:38px;color:#94a3b8;" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path></svg></div>
        <div style="font-size:14px; font-weight:800; color:#1e3c72; margin-bottom:4px;">Ushbu talaba uchun Word fayli (.docx) yoki rasm tashlang</div>
        <div style="font-size:12px; color:#64748b; margin-bottom:12px;">Faylni bu yerga sudrab olib keling yoki bosib tanlang</div>
        <button type="button" class="btn" style="background:#2563eb; color:#fff; padding:7px 18px; font-weight:700; display:inline-flex; align-items:center; gap:6px;">
          ${ICONS.file} Faylni Tanlash & AI O'qitish
        </button>
      </div>
    `;
    return;
  }

  const apiHost = (window.location.protocol === 'http:' || window.location.protocol === 'https:') ? '' : 'http://localhost:8080';
  fetch(apiHost + '/api/doc_preview?file=' + encodeURIComponent(s.doc_file))
    .then(function(r) { return r.json(); })
    .then(function(data) {
      if (data.filepath) {
        const fpEl = document.getElementById('modalFilePath');
        if (fpEl) fpEl.innerText = data.filepath;
      }

      if (data.success && data.images && data.images.length > 0) {
        window.currentDocImages = data.images;
        let imgGrid = '<div class="gallery-grid">';
        data.images.forEach(function(imgSrc, i) {
          const cap = 'Hujjat Rasmi #' + (i + 1);
          imgGrid += '<div class="gallery-item">' +
            '<div class="gallery-img-wrap" onclick="openLightbox(' + i + ')" title="Kattalashtirish uchun bosing">' +
              '<img src="' + imgSrc + '" alt="' + cap + '">' +
            '</div>' +
            '<div class="gallery-bar">' +
              '<span class="gallery-cap">' + ICONS.file + ' ' + cap + '</span>' +
              '<button type="button" class="btn btn-zoom-mini" onclick="openLightbox(' + i + ')">' + ICONS.search + ' Zoom</button>' +
            '</div>' +
          '</div>';
        });
        imgGrid += '</div>';
        imgBox.innerHTML = imgGrid;
      } else {
        imgBox.innerHTML = `
          <div style="padding:20px; width:100%; border:2px dashed #cbd5e1; border-radius:12px; background:#f8fafc; text-align:center; cursor:pointer;" onclick="document.getElementById('attachFileInput').click()">
            <div style="font-size:13px; color:#64748b; margin-bottom:8px;">Ushbu Word faylida rasm topilmadi. Yangi fayl biriktirmoqchimisiz?</div>
            <button type="button" class="btn" style="background:#0284c7; color:#fff; padding:6px 14px; font-weight:700;">Yangi Fayl Yuklash</button>
          </div>
        `;
      }
    })
    .catch(function(e) {
      imgBox.innerHTML = '<div style="padding:16px;background:#fee2e2;border:1px solid #f87171;border-radius:8px;color:#991b1b;line-height:1.6;">' +
        '<strong>Rasmlarni yuklash uchun serverga ulanish:</strong><br>' +
        'Iltimos sahifani to\'g\'ridan-to\'g\'ri <strong><a href="http://localhost:8080/hisobot.html" style="color:#2563eb;text-decoration:underline;font-weight:bold;">http://localhost:8080/hisobot.html</a></strong> orqali oching.' +
      '</div>';
    });
};

/* USHBU TALABAGA FAYL BIRIKTIRISH VA AI ORQALI TO'LDIRISH */
window.uploadAndAttachForCurrentStudent = function(file) {
  if (!file || window.currentStudentIdx === null || !RAW_STUDENTS[window.currentStudentIdx]) return;
  const s = RAW_STUDENTS[window.currentStudentIdx];

  const statusBox = document.getElementById('reanalyzeStatus');
  const imgBox = document.getElementById('modalImagesContainer');

  if (statusBox) {
    statusBox.style.display = 'block';
    statusBox.style.background = '#eff6ff';
    statusBox.style.color = '#1d4ed8';
    statusBox.style.border = '1px solid #bfdbfe';
    statusBox.innerHTML = '<strong>' + file.name + '</strong> yuklanmoqda va eng kuchli Gemini AI modeli orqali sinchiklab tahlil qilinmoqda...';
  }

  if (imgBox) {
    imgBox.innerHTML = '<div style="padding:30px; text-align:center; color:#2563eb; font-weight:700;">AI fayl ichidagi pasport/ID va shahodatnomani tahlil qilmoqda...</div>';
  }

  const reader = new FileReader();
  reader.onload = function(e) {
    const b64 = e.target.result.split(',')[1];
    const apiHost = (window.location.protocol === 'http:' || window.location.protocol === 'https:') ? '' : 'http://localhost:8080';

    fetch(apiHost + '/api/upload_and_attach_to_student', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        row: s.row || 0,
        filename: file.name,
        file_base64: b64
      })
    })
    .then(function(r) { return r.json(); })
    .then(function(res) {
      if (res && res.success) {
        s.doc_file = res.filename;
        const fpEl = document.getElementById('modalFilePath');
        if (fpEl) fpEl.innerText = 'files/' + res.filename;

        const d = res.data || {};
        if (d.ism) s.ism = d.ism;
        if (d.ota) s.ota = d.ota;
        s.fish = (s.ism + ' ' + (s.ota || '')).trim();
        if (d.pass_ser) s.pv = d.pass_ser;
        if (d.pinfl) s.pinfl = String(d.pinfl);
        if (d.dob) s.dob = d.dob;
        if (d.pass_ber) s.ber = d.pass_ber; // Faqat pasport berilgan sana
        if (d.sh_doc) s.sh_doc = d.sh_doc;
        if (d.doc_tur) s.doc_tur = d.doc_tur;
        if (d.maktab) s.mak = d.maktab;
        if (d.yil) s.yil = String(d.yil);

        // Modal sarlavhasini yangilash
        const modalTitle = document.getElementById('modalTitle');
        if (modalTitle) {
          modalTitle.innerHTML = ICONS.user + " <strong>" + s.fish + "</strong> &nbsp;|&nbsp; Shartnoma: #" + s.shnum;
        }

        // Rasmlar galereyasini chizish
        if (res.images && res.images.length > 0) {
          window.currentDocImages = res.images;
          let imgGrid = '<div class="gallery-grid">';
          res.images.forEach(function(imgSrc, i) {
            const cap = (i === 0) ? 'Pasport / ID' : 'Shahodatnoma / Diplom';
            const icon = (i === 0) ? ICONS.idCard : ICONS.award;
            imgGrid += '<div class="gallery-item">' +
              '<div class="gallery-img-wrap" onclick="openLightbox(' + i + ')" title="Kattalashtirish uchun bosing">' +
                '<img src="' + imgSrc + '" alt="' + cap + '">' +
              '</div>' +
              '<div class="gallery-bar">' +
                '<span class="gallery-cap">' + icon + ' ' + cap + ' #' + (i+1) + '</span>' +
                '<button type="button" class="btn btn-zoom-mini" onclick="openLightbox(' + i + ')">' + ICONS.search + ' Zoom</button>' +
              '</div>' +
            '</div>';
          });
          imgGrid += '</div>';
          imgBox.innerHTML = imgGrid;
        }

        // Kartalarni yangilash
        renderInfoCards(s, window.isEditMode);

        // Jadvaldagi qatorni yangilash
        const rows = document.querySelectorAll('.student-row');
        if (rows[window.currentStudentIdx]) {
          const rEl = rows[window.currentStudentIdx];
          rEl.setAttribute('data-name', (s.fish || '').toLowerCase());
          rEl.setAttribute('data-pass', (s.pv || '').toLowerCase());
          rEl.setAttribute('data-pinfl', s.pinfl || '');
          rEl.setAttribute('data-dob', (s.dob || '') + ' ' + (s.ber || ''));
          rEl.setAttribute('data-doc', (s.sh_doc || '').toLowerCase());
          rEl.setAttribute('data-doctype', s.doc_tur || '');
          rEl.setAttribute('data-mak', (s.mak || '').toLowerCase());
          rEl.setAttribute('data-yil', s.yil || '');
          rEl.setAttribute('data-file', (s.doc_file || '').toLowerCase());

          const cells = rEl.querySelectorAll('td');
          if (cells.length >= 10) {
            cells[2].innerHTML = '<div class="student-name">' + s.ism + '</div>' +
                                  '<div class="student-patronymic">' + (s.ota || '—') + '</div>';
            cells[3].innerHTML = '<div><span class="mono pass-text">' + (s.pv || '—') + '</span></div>';
            cells[4].innerHTML = '<span class="mono pinfl-text">' + (s.pinfl || '—') + '</span>';
            cells[5].innerHTML = '<div class="student-dob" style="font-size:12px;">DOB: <strong>' + (s.dob || '—') + '</strong></div>' +
                                  '<div style="font-size:11.5px;color:#a855f7;margin-top:2px;">Berilgan: <strong>' + (s.ber || '—') + '</strong></div>';
            cells[6].innerHTML = '<div><span class="mono doc-text">' + (s.sh_doc || '—') + '</span></div>' +
                                  '<div style="font-size:11px;color:var(--text-muted);margin-top:1px;">' + (s.doc_tur || '—') + '</div>';
            cells[7].innerHTML = '<div style="font-size:12px;line-height:1.3;">' + (s.mak || '—') + '</div>' +
                                  '<div class="yon-badge">' + (s.yon || '—') + '</div>';
            cells[8].innerText = s.yil || '—';
            cells[9].innerHTML = '<span class="file-link" style="color:#2563eb;font-weight:600;font-size:12px;" onclick="openStudentModal(' + window.currentStudentIdx + ')">' + ICONS.file + ' ' + s.doc_file + '</span>';
          }
        }

        if (statusBox) {
          statusBox.style.background = '#dcfce7';
          statusBox.style.color = '#15803d';
          statusBox.style.border = '1px solid #86efac';
          statusBox.innerHTML = '<strong>' + file.name + '</strong> muvaffaqiyatli biriktirildi va AI orqali to\'liq tahlil qilinib Excelga saqlandi!';
        }
        alert("Fayl muvaffaqiyatli biriktirildi va AI orqali to'liq o'qilib Excel bazaga saqlandi!");
      } else {
        if (statusBox) {
          statusBox.style.background = '#fee2e2';
          statusBox.style.color = '#991b1b';
          statusBox.style.border = '1px solid #f87171';
          statusBox.innerHTML = 'Xatolik: ' + (res.error || 'Faylni tahlil qilib bo\'lmadi');
        }
        alert("Xatolik: " + (res.error || 'Faylni biriktirib bo\'lmadi'));
      }
    })
    .catch(function(err) {
      if (statusBox) {
        statusBox.style.background = '#fee2e2';
        statusBox.style.color = '#991b1b';
        statusBox.style.border = '1px solid #f87171';
        statusBox.innerHTML = 'Server bilan ulanishda xatolik: ' + err;
      }
      alert("Server bilan ulanishda xatolik: " + err);
    });
  };
  reader.readAsDataURL(file);
};

/* PINFL (JSHSHIR) DAN TUG'ILGAN SANANI AVTOMATIK ANIQLASH */
window.extractBirthDateFromPinfl = function(pinflStr) {
  if (!pinflStr) return null;
  const s = String(pinflStr).replace(/\D/g, '');
  if (s.length < 7) return null;
  const firstDigit = s[0];
  const dd = parseInt(s.substring(1, 3), 10);
  const mm = parseInt(s.substring(3, 5), 10);
  const yy = s.substring(5, 7);

  if (isNaN(dd) || isNaN(mm) || dd < 1 || dd > 31 || mm < 1 || mm > 12) return null;

  let century = 2000;
  if (firstDigit === '3' || firstDigit === '4') {
    century = 1900;
  } else if (firstDigit === '5' || firstDigit === '6') {
    century = 2000;
  } else if (firstDigit === '1' || firstDigit === '2') {
    century = 1800;
  } else {
    century = parseInt(yy, 10) <= 30 ? 2000 : 1900;
  }

  const fullYear = century + parseInt(yy, 10);
  const dayStr = String(dd).padStart(2, '0');
  const monthStr = String(mm).padStart(2, '0');
  return `${dayStr}.${monthStr}.${fullYear}`;
};

window.handlePinflAutoDob = function(inputEl, targetDobId) {
  if (!inputEl) return;
  const digits = inputEl.value.replace(/\D/g, '').substring(0, 14);
  let formatted = '';
  if (digits.length > 10) {
    formatted = digits.substring(0, 6) + ' ' + digits.substring(6, 10) + ' ' + digits.substring(10, 14);
  } else if (digits.length > 6) {
    formatted = digits.substring(0, 6) + ' ' + digits.substring(6, 10);
  } else {
    formatted = digits;
  }
  if (inputEl.value !== formatted && digits.length > 0) {
    inputEl.value = formatted;
  }

  const dob = window.extractBirthDateFromPinfl(digits);
  const dobInput = document.getElementById(targetDobId);
  if (dob && dobInput) {
    dobInput.value = dob;
    dobInput.style.borderColor = '#10b981';
    dobInput.style.boxShadow = '0 0 0 4px rgba(16, 185, 129, 0.4)';
    setTimeout(() => {
      dobInput.style.borderColor = '';
      dobInput.style.boxShadow = '';
    }, 1200);
  }
};

/* FAQAT MA'LUMOTLAR KARTALARINI CHIZISH */
function renderInfoCards(s, isEditing) {
  const container = document.getElementById('modalDataWrapper');
  const topBtn = document.getElementById('btnToggleEditTop');

  if (!container) return;

  if (topBtn) {
    topBtn.innerHTML = isEditing ? (ICONS.close + ' Tahrirni Yopish') : (ICONS.edit + ' Ma\'lumotlarni Tahrirlash');
  }

  const docFileName = s.doc_file ? s.doc_file : "Mavjud emas";

  /* Rasmiy hujjatdagi F.I.SH ro'yxatdagiga mos keladimi — rangli ko'rsatkich */
  const NAME_COLORS = {
    ok:       { c: '#10b981', t: "Ro'yxat bilan aynan mos" },
    translit: { c: '#f59e0b', t: 'Imlo farqi (q/k, x/h, unli) — bir odam' },
    farq:     { c: '#ef4444', t: "RO'YXATDAN HAQIQIY FARQ — tekshiring" },
    tekshir:  { c: '#a855f7', t: "Tekshiruvdan o'tmadi — qo'lda ko'rish kerak" },
    boshqa:   { c: '#f43f5e', t: 'BOSHQA ODAMNING HUJJATI' }
  };
  const nm = NAME_COLORS[s.name_flag] || { c: '#94a3b8', t: 'Tekshirilmagan' };
  const nameRow = (label, val) => val
    ? `<div class="data-row"><span class="lbl">${label}:</span>`
      + `<span class="val" style="color:${nm.c};font-weight:800;font-size:13.5px;max-width:62%;text-align:right;" `
      + `title="${nm.t}">${val}</span></div>`
    : '';

  if (!isEditing) {
    // 1. ODDIY KO'RISH REJIMI (TINIQ VA YUQORI KONTRASTLI)
    container.innerHTML = `
      <div class="data-cards-grid">
        <!-- Pasport kartasi -->
        <div class="data-card data-card-pass">
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;border-bottom:1.5px solid rgba(255,255,255,0.1);padding-bottom:6px;">
            <h4 style="margin:0;border:none;padding:0;color:#38bdf8;font-size:15px;font-weight:800;">${ICONS.idCard} Pasport / ID-karta Ma'lumotlari</h4>
            <button type="button" class="btn btn-edit-mini" onclick="toggleEditMode(true)">${ICONS.edit} Tahrirlash</button>
          </div>
          <div class="data-row"><span class="lbl">Hujjat turi:</span><span class="val">${s.pass_type || '—'}</span></div>
          <div class="data-row"><span class="lbl">Pasport seriya va №:</span><span class="val mono val-large-pass" id="val_pv">${s.pv || '—'}</span></div>
          <div class="data-row"><span class="lbl">JSHSHIR (PINFL):</span><span class="val mono val-large-pinfl" id="val_pinfl">${formatPinflDisplayJS(s.pinfl)}</span></div>
          <div class="data-row"><span class="lbl">Tug'ilgan sana (DOB):</span><span class="val val-large-dob" id="val_dob">${s.dob || '—'}</span></div>
          <div class="data-row"><span class="lbl">Pasport Berilgan:</span><span class="val val-large-ber" id="val_ber">${s.ber || '—'}</span></div>
          <div class="data-row"><span class="lbl">Otasining ismi:</span><span class="val" id="val_ota" style="font-weight:800;color:#f8fafc;">${s.ota || '—'}</span></div>
          ${nameRow('Pasportdagi F.I.SH', s.pass_fish)}
        </div>

        <!-- Ta'lim hujjati kartasi -->
        <div class="data-card data-card-doc">
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;border-bottom:1.5px solid rgba(255,255,255,0.1);padding-bottom:6px;">
            <h4 style="margin:0;border:none;padding:0;color:#34d399;font-size:15px;font-weight:800;">${ICONS.award} Ta'lim Hujjati Ma'lumotlari</h4>
            <button type="button" class="btn btn-edit-mini" onclick="toggleEditMode(true)">${ICONS.edit} Tahrirlash</button>
          </div>
          <div class="data-row"><span class="lbl">Hujjat turi:</span><span class="val" id="val_doctur" style="color:#6ee7b7;font-weight:700;">${s.doc_tur || 'Shahodatnoma'}</span></div>
          <div class="data-row"><span class="lbl">Hujjat seriya va №:</span><span class="val mono val-large-doc" id="val_shdoc">${s.sh_doc || '—'}</span></div>
          <div class="data-row"><span class="lbl">Guruh:</span><span class="val" style="color:#60a5fa;font-weight:800;background:rgba(37,99,235,0.15);padding:3px 10px;border-radius:6px;border:1px solid rgba(37,99,235,0.3);">${s.group ? s.group : '<span style="color:#f59e0b;font-weight:700;">Belgilanmagan</span>'}</span></div>
          <div class="data-row"><span class="lbl">Tugatgan muassasasi:</span><span class="val" id="val_mak" style="max-width:65%;font-size:13px;color:#e2e8f0;">${s.mak || '—'}</span></div>
          <div class="data-row"><span class="lbl">Bitirgan yili:</span><span class="val" id="val_yil" style="font-weight:700;">${s.yil || '—'}</span></div>
          <div class="data-row"><span class="lbl">Yo'nalishi:</span><span class="val" style="color:#38bdf8;font-weight:700;">${s.yon || '—'}</span></div>
          <div class="data-row"><span class="lbl">Word fayli:</span><span class="val" style="font-size:12px;color:#94a3b8;">${docFileName}</span></div>
          ${nameRow('Shahodatnomadagi F.I.SH', s.cert_fish)}
        </div>
      </div>
    `;
  } else {
    // 2. TAHRIRLASH (EDIT) REJIMI: KATTA, QALIN VA ANIQ INPUTLAR
    container.innerHTML = `
      <div class="data-cards-grid">
        <!-- Pasport kartasi (Tahrirlash) -->
        <div class="data-card data-card-edit-pass">
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;border-bottom:1.5px solid #2563eb;padding-bottom:8px;">
            <h4 style="margin:0;border:none;padding:0;color:#60a5fa;font-size:16px;font-weight:800;">${ICONS.edit} Pasport & Shaxs Ma'lumotlari</h4>
            <span style="font-size:12px;color:#38bdf8;font-weight:800;background:rgba(56,189,248,0.15);padding:3px 10px;border-radius:6px;border:1px solid rgba(56,189,248,0.3);">Tahrirlash rejimi</span>
          </div>
          <div class="data-row-edit">
            <span class="lbl">Ism va Familiya:</span>
            <input type="text" id="edit_ism" class="edit-input edit-input-lg" value="${s.ism || ''}" placeholder="Familiya Ism">
          </div>
          <div class="data-row-edit">
            <span class="lbl">Otasining ismi:</span>
            <input type="text" id="edit_ota" class="edit-input edit-input-lg" value="${s.ota || ''}" placeholder="... qizi / ... o'g'li">
          </div>
          <div class="data-row-edit">
            <span class="lbl">Guruh:</span>
            <select id="edit_group" class="edit-input edit-input-lg">
              <option value="" ${!s.group ? 'selected' : ''}>Guruh belgilanmagan</option>
              <option value="N" ${s.group === 'N' || s.group === 'n' ? 'selected' : ''}>N (Noma'lum / Taqsimlanmagan)</option>
              <option value="26-01" ${s.group === '26-01' ? 'selected' : ''}>26-01 (Farmatsiya)</option>
              <option value="26-02" ${s.group === '26-02' ? 'selected' : ''}>26-02 (Hamshiralik)</option>
              <option value="26-03" ${s.group === '26-03' ? 'selected' : ''}>26-03 (Hamshiralik)</option>
              <option value="26-04" ${s.group === '26-04' ? 'selected' : ''}>26-04 (Hamshiralik)</option>
              <option value="26-05" ${s.group === '26-05' ? 'selected' : ''}>26-05 (Hamshiralik)</option>
              <option value="26-06" ${s.group === '26-06' ? 'selected' : ''}>26-06 (Hamshiralik)</option>
              <option value="26-07" ${s.group === '26-07' ? 'selected' : ''}>26-07 (Hamshiralik)</option>
            </select>
          </div>
          <div class="data-row-edit">
            <span class="lbl">Pasport seriya va №:</span>
            <input type="text" id="edit_pv" class="edit-input edit-input-lg mono" oninput="this.value = this.value.toUpperCase()" value="${s.pv || ''}" placeholder="AD1234567">
          </div>
          <div class="data-row-edit">
            <span class="lbl">JSHSHIR (PINFL - 14 ta):</span>
            <input type="text" id="edit_pinfl" class="edit-input edit-input-lg mono" oninput="handlePinflAutoDob(this, 'edit_dob')" value="${s.pinfl || ''}" placeholder="Masalan: 604060 5572 0067" title="PINFL kiritilganda tug'ilgan sana avtomatik to'ladi">
          </div>
          <div class="data-row-edit">
            <span class="lbl" style="color:#facc15;">Tug'ilgan sana (DOB):</span>
            <input type="text" id="edit_dob" class="edit-input edit-input-lg" style="color:#facc15;font-weight:800;" value="${s.dob || ''}" placeholder="DD.MM.YYYY (JSHSHIR dan avtomatik)">
          </div>
          <div class="data-row-edit">
            <span class="lbl">Pasport Berilgan:</span>
            <input type="text" id="edit_ber" class="edit-input edit-input-lg" value="${s.ber || ''}" placeholder="DD.MM.YYYY">
          </div>
        </div>

        <!-- Ta'lim hujjati kartasi (Tahrirlash) -->
        <div class="data-card data-card-edit-doc">
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;border-bottom:1.5px solid #10b981;padding-bottom:8px;">
            <h4 style="margin:0;border:none;padding:0;color:#34d399;font-size:16px;font-weight:800;">${ICONS.edit} Ta'lim Hujjatini Tahrirlash</h4>
            <div style="display:flex;gap:8px;">
              <button type="button" class="btn btn-save-data" onclick="saveStudentData()">${ICONS.save} Saqlash (Excelga yozish)</button>
              <button type="button" class="btn btn-cancel-edit" onclick="toggleEditMode(false)">Bekor qilish</button>
            </div>
          </div>
          <div class="data-row-edit">
            <span class="lbl">Hujjat turi:</span>
            <select id="edit_doctur" class="edit-input edit-input-lg">
              <option value="Shahodatnoma" ${s.doc_tur === 'Shahodatnoma' ? 'selected' : ''}>Shahodatnoma</option>
              <option value="Diplom" ${s.doc_tur === 'Diplom' ? 'selected' : ''}>Diplom</option>
            </select>
          </div>
          <div class="data-row-edit">
            <span class="lbl">Hujjat seriya va №:</span>
            <input type="text" id="edit_shdoc" class="edit-input edit-input-lg mono" oninput="this.value = this.value.toUpperCase()" value="${s.sh_doc || ''}" placeholder="UM 03752500">
          </div>
          <div class="data-row-edit">
            <span class="lbl">Tugatgan muassasasi:</span>
            <input type="text" id="edit_mak" class="edit-input edit-input-lg" value="${s.mak || ''}" placeholder="14-maktab...">
          </div>
          <div class="data-row-edit">
            <span class="lbl">Bitirgan yili:</span>
            <input type="text" id="edit_yil" class="edit-input edit-input-lg" value="${s.yil || ''}" placeholder="2026">
          </div>
          <div class="data-row-edit">
            <span class="lbl">Yo'nalishi:</span>
            <input type="text" id="edit_yon" class="edit-input edit-input-lg" value="${s.yon || ''}" placeholder="Hamshiralik ishi">
          </div>
        </div>
      </div>
    `;
  }
}

/* TAHRIRLASH REJIMINI YOQISH / O'CHIRISH (Rasmlarga umuman tegmaydi!) */
window.toggleEditMode = function(state) {
  if (window.currentStudentIdx === null || !RAW_STUDENTS[window.currentStudentIdx]) return;
  window.isEditMode = state;
  const s = RAW_STUDENTS[window.currentStudentIdx];
  renderInfoCards(s, state);
};

/* KARTA ELEMENTLARINI FORMATLASH (JAVASCRIPT) */
function formatPassDisplayJS(val) {
  if (!val) return '<span style="color:#ef4444;font-weight:700;">—</span>';
  return '<span class="mono-pass">' + String(val).trim().toUpperCase() + '</span>';
}

function formatPinflDisplayJS(val) {
  if (!val) return '<span style="color:#ef4444;font-weight:700;">—</span>';
  const s = String(val).replace(/\D/g, '').trim();
  return '<span class="mono-pinfl">' + s + '</span>';
}

function formatDocDisplayJS(val) {
  if (!val) return '<span style="color:#ef4444;font-weight:700;">—</span>';
  return '<span class="mono-doc">' + String(val).trim().toUpperCase() + '</span>';
}


/* =========================================================================
   KARTA DROPDOWN (TO'LIQ MA'LUMOTLARNI KO'RSATISH / YOPISH)
   ========================================================================= */
window.toggleCardDetails = function(studentIdx) {
  const details = document.getElementById('card-details-' + studentIdx);
  const btn = document.getElementById('btn-toggle-' + studentIdx);
  if (!details) return;
  const isHidden = (details.style.display === 'none' || details.style.display === '');
  if (isHidden) {
    details.style.display = 'block';
    if (btn) {
      btn.classList.add('active');
      const textSpan = btn.querySelector('.btn-text');
      if (textSpan) {
        textSpan.innerHTML = '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="18 15 12 9 6 15"></polyline></svg> Ma\'lumotlarni yopish';
      }
    }
  } else {
    details.style.display = 'none';
    if (btn) {
      btn.classList.remove('active');
      const textSpan = btn.querySelector('.btn-text');
      if (textSpan) {
        textSpan.innerHTML = '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"></polyline></svg> To\'liq ma\'lumotlar';
      }
    }
  }
};

window.toggleAllCards = function(expand) {
  const allDetails = document.querySelectorAll('.card-dropdown-details');
  const allBtns = document.querySelectorAll('.card-dropdown-btn');
  allDetails.forEach(function(el) {
    el.style.display = expand ? 'block' : 'none';
  });
  allBtns.forEach(function(btn) {
    const textSpan = btn.querySelector('.btn-text');
    if (expand) {
      btn.classList.add('active');
      if (textSpan) {
        textSpan.innerHTML = '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="18 15 12 9 6 15"></polyline></svg> Ma\'lumotlarni yopish';
      }
    } else {
      btn.classList.remove('active');
      if (textSpan) {
        textSpan.innerHTML = '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"></polyline></svg> To\'liq ma\'lumotlar';
      }
    }
  });
};

/* TALABA KARTASINI BIR ZUMDA (REAL-TIME) DOM DA YANGILASH */
window.updateStudentCardDOM = function(idx, s) {
  const cards = document.querySelectorAll('.student-card');
  if (!cards || !cards[idx]) return;
  const card = cards[idx];

  // Qidiruv atributlari
  card.setAttribute('data-name', (s.fish || s.ism || '').toLowerCase());
  card.setAttribute('data-pass', (s.pv || '').toLowerCase());
  card.setAttribute('data-pinfl', s.pinfl || '');
  card.setAttribute('data-dob', (s.dob || '') + ' ' + (s.ber || ''));
  card.setAttribute('data-doc', (s.sh_doc || '').toLowerCase());
  card.setAttribute('data-doctype', s.doc_tur || '');
  card.setAttribute('data-mak', (s.mak || '').toLowerCase());
  card.setAttribute('data-yil', s.yil || '');
  card.setAttribute('data-group', (s.group || '').toLowerCase());

  // Guruh tanlash badge-i
  const cardBadge = card.querySelector('.card-group-badge');
  if (cardBadge) {
    const grpClean = (s.group || '').replace(/[^a-zA-Z0-9]/g, '').toLowerCase();
    cardBadge.className = 'card-group-badge grp-' + (grpClean || 'n');
    const svg = cardBadge.querySelector('svg');
    cardBadge.innerHTML = (svg ? svg.outerHTML + ' ' : '') + (s.group || '—');
  }

  // Guruh tanlash dropdowni (agar mavjud bo'lsa)
  const gSelect = card.querySelector('.card-group-select');
  if (gSelect) gSelect.value = s.group || '';

  // Talaba ismi (Karta sarlavhasi)
  const nameEl = card.querySelector('.card-student-name');
  if (nameEl) {
    nameEl.innerText = (s.fish || s.ism || '—');
  }

  // Tasdiqlanganlik holatiga ko'ra yashil kartaga aylantirish
  if (s.verified) {
    card.setAttribute('data-verified', s.verified.toLowerCase());
    if (s.verified === 'TASDIQLANDI') {
      card.classList.add('card-verified');
    } else {
      card.classList.remove('card-verified');
    }
  }

  // Pasport bo'limi
  const passBox = card.querySelector('.card-box-passport');
  if (passBox) {
    const passNumEl = passBox.querySelector('.pass-number-large');
    if (passNumEl) passNumEl.innerHTML = formatPassDisplayJS(s.pv);

    const pinflEl = passBox.querySelector('.pinfl-number-large');
    if (pinflEl) pinflEl.innerHTML = formatPinflDisplayJS(s.pinfl);

    const dateLarge = passBox.querySelector('.date-large');
    if (dateLarge) dateLarge.innerText = s.dob || '—';

    const dateMed = passBox.querySelector('.date-medium');
    if (dateMed) dateMed.innerText = s.ber || '—';
  }

  // Ta'lim hujjati bo'limi
  const docBox = card.querySelector('.card-box-doc');
  if (docBox) {
    const docNumEl = docBox.querySelector('.doc-number-large');
    if (docNumEl) docNumEl.innerHTML = formatDocDisplayJS(s.sh_doc);

    const maktabEl = docBox.querySelector('.maktab-name');
    if (maktabEl) maktabEl.innerText = s.mak || '—';

    const yearEl = docBox.querySelector('.doc-year-badge');
    if (yearEl) yearEl.innerText = (s.yil || '—') + '-yil';
  }

  // Kartani darhol yorqin yashil chiziq va nur bilan belgilash
  card.style.transition = 'all 0.3s ease';
  card.style.boxShadow = '0 0 0 4px #10b981, 0 8px 30px rgba(16,185,129,0.35)';
  card.style.borderColor = '#10b981';
  setTimeout(function() {
    card.style.boxShadow = '';
    card.style.borderColor = '';
  }, 2500);
};

/* QO'LDA TAHRIRLANGAN MA'LUMOTLARNI SAQLASH (EXCELGA YOZISH) */
window.saveStudentData = function() {
  if (window.currentStudentIdx === null || !RAW_STUDENTS[window.currentStudentIdx]) return;
  const s = RAW_STUDENTS[window.currentStudentIdx];

  const ism = (document.getElementById('edit_ism') ? document.getElementById('edit_ism').value : s.ism).trim();
  const ota = (document.getElementById('edit_ota') ? document.getElementById('edit_ota').value : s.ota).trim();
  const group = (document.getElementById('edit_group') ? document.getElementById('edit_group').value : (s.group || '')).trim();
  const pv = (document.getElementById('edit_pv') ? document.getElementById('edit_pv').value : s.pv).trim();
  const pinfl = (document.getElementById('edit_pinfl') ? document.getElementById('edit_pinfl').value : s.pinfl).trim();
  const dob = (document.getElementById('edit_dob') ? document.getElementById('edit_dob').value : s.dob).trim();
  const ber = (document.getElementById('edit_ber') ? document.getElementById('edit_ber').value : s.ber).trim();
  const doctur = (document.getElementById('edit_doctur') ? document.getElementById('edit_doctur').value : s.doc_tur).trim();
  const shdoc = (document.getElementById('edit_shdoc') ? document.getElementById('edit_shdoc').value : s.sh_doc).trim();
  const mak = (document.getElementById('edit_mak') ? document.getElementById('edit_mak').value : s.mak).trim();
  const yil = (document.getElementById('edit_yil') ? document.getElementById('edit_yil').value : s.yil).trim();
  const yon = (document.getElementById('edit_yon') ? document.getElementById('edit_yon').value : s.yon).trim();

  const statusBox = document.getElementById('reanalyzeStatus');
  if (statusBox) {
    statusBox.style.display = 'block';
    statusBox.style.background = '#eff6ff';
    statusBox.style.color = '#1d4ed8';
    statusBox.style.border = '1px solid #bfdbfe';
    statusBox.innerHTML = 'Yangilangan ma\'lumotlar Excel bazaga saqlanmoqda...';
  }

  const apiHost = (window.location.protocol === 'http:' || window.location.protocol === 'https:') ? '' : 'http://localhost:8080';
  const url = apiHost + '/api/update_student?' +
    'row=' + (s.row || 0) +
    '&ism=' + encodeURIComponent(ism) +
    '&ota=' + encodeURIComponent(ota) +
    '&group=' + encodeURIComponent(group) +
    '&pv=' + encodeURIComponent(pv) +
    '&pinfl=' + encodeURIComponent(pinfl) +
    '&dob=' + encodeURIComponent(dob) +
    '&ber=' + encodeURIComponent(ber) +
    '&doc_tur=' + encodeURIComponent(doctur) +
    '&sh_doc=' + encodeURIComponent(shdoc) +
    '&mak=' + encodeURIComponent(mak) +
    '&yil=' + encodeURIComponent(yil) +
    '&yon=' + encodeURIComponent(yon);

  fetch(url)
    .then(function(r) { return r.json(); })
    .then(function(res) {
      if (res.success) {
        // Ma'lumotlarni JavaScript obyektida yangilash
        s.ism = ism;
        s.ota = ota;
        s.fish = (ism + ' ' + (ota || '')).trim();
        s.pv = pv;
        s.pinfl = pinfl;
        s.dob = dob;
        s.ber = ber;
        s.doc_tur = doctur;
        s.sh_doc = shdoc;
        s.mak = mak;
        s.yil = yil;
        s.yon = yon;

        s.group = group;

        // Modal sarlavhasini ham yangilash
        const modalTitle = document.getElementById('modalTitle');
        if (modalTitle) {
          modalTitle.innerHTML = ICONS.user + " <strong>" + s.fish + "</strong> &nbsp;|&nbsp; Shartnoma: #" + s.shnum;
        }

        // KARTANI DARHOL BIR ZUMDA YANGILASH (DOM)
        updateStudentCardDOM(window.currentStudentIdx, s);

        // Jadvaldagi qatorni darhol yangilash
        const rows = document.querySelectorAll('.student-row');
        if (rows[window.currentStudentIdx]) {
          const rEl = rows[window.currentStudentIdx];
          
          rEl.setAttribute('data-name', (s.fish || '').toLowerCase());
          rEl.setAttribute('data-pass', (s.pv || '').toLowerCase());
          rEl.setAttribute('data-pinfl', s.pinfl || '');
          rEl.setAttribute('data-dob', (s.dob || '') + ' ' + (s.ber || ''));
          rEl.setAttribute('data-doc', (s.sh_doc || '').toLowerCase());
          rEl.setAttribute('data-doctype', s.doc_tur || '');
          rEl.setAttribute('data-mak', (s.mak || '').toLowerCase());
          rEl.setAttribute('data-yil', s.yil || '');
          rEl.setAttribute('data-yon', (s.yon || '').toLowerCase());

          const cells = rEl.querySelectorAll('td');
          if (cells.length >= 10) {
            cells[2].innerHTML = '<div class="student-name">' + s.ism + '</div>' +
                                  '<div class="student-patronymic">' + (s.ota || '—') + '</div>';
            cells[3].innerHTML = '<div><span class="mono pass-text">' + (s.pv || '—') + '</span></div>';
            cells[4].innerHTML = '<span class="mono pinfl-text">' + (s.pinfl || '—') + '</span>';
            cells[5].innerHTML = '<div class="student-dob" style="font-size:12px;">DOB: <strong>' + (s.dob || '—') + '</strong></div>' +
                                  '<div style="font-size:11.5px;color:#a855f7;margin-top:2px;">Berilgan: <strong>' + (s.ber || '—') + '</strong></div>';
            cells[6].innerHTML = '<div><span class="mono doc-text">' + (s.sh_doc || '—') + '</span></div>' +
                                  '<div style="font-size:11px;color:var(--text-muted);margin-top:1px;">' + (s.doc_tur || '—') + '</div>';
            cells[7].innerHTML = '<div style="font-size:12px;line-height:1.3;">' + (s.mak || '—') + '</div>' +
                                  '<div class="yon-badge">' + (s.yon || '—') + '</div>';
            cells[8].innerText = s.yil || '—';
          }
        }

        // Oddiy ko'rish rejimiga qaytarish
        window.toggleEditMode(false);

        const newStatusBox = document.getElementById('reanalyzeStatus');
        if (newStatusBox) {
          newStatusBox.style.display = 'block';
          newStatusBox.style.background = '#dcfce7';
          newStatusBox.style.color = '#15803d';
          newStatusBox.style.border = '1px solid #86efac';
          newStatusBox.innerHTML = 'Barcha ma\'lumotlar muvaffaqiyatli saqlandi va Excel bazaga yozildi!';
        }
        alert("Ma'lumotlar muvaffaqiyatli saqlandi va Excel bazaga yozildi!");
      } else {
        if (statusBox) {
          statusBox.style.background = '#fee2e2';
          statusBox.style.color = '#991b1b';
          statusBox.style.border = '1px solid #f87171';
          statusBox.innerHTML = 'Saqlashda xatolik: ' + (res.error || 'Noma\'lum xatolik');
        }
        alert("Saqlashda xatolik: " + (res.error || 'Noma\'lum'));
      }
    })
    .catch(function(e) {
      if (statusBox) {
        statusBox.style.background = '#fee2e2';
        statusBox.style.color = '#991b1b';
        statusBox.style.border = '1px solid #f87171';
        statusBox.innerHTML = 'Server bilan ulanishda xatolik: ' + e;
      }
      alert("Server bilan ulanishda xatolik: " + e + "\nIltimos http://localhost:8080 orqali ochilganini tekshiring.");
    });
};

/* 1. FAQAT QR KOD BO'YICHA AVTOMATIK SKAN QILISH VA TO'LDIRISH */
window.scanStudentQROnly = function() {
  if (window.currentStudentIdx === null || !RAW_STUDENTS[window.currentStudentIdx]) return;
  const s = RAW_STUDENTS[window.currentStudentIdx];

  if (!s.doc_file) {
    alert("Bu talabaning Word fayli yo'q, QR skan qilib bo'lmaydi!");
    return;
  }

  const btn = document.getElementById('btnScanQR');
  const statusBox = document.getElementById('reanalyzeStatus');

  if (btn) {
    btn.disabled = true;
    btn.innerHTML = '<svg class="svg-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg> QR skan qilinmoqda...';
    btn.style.opacity = '0.7';
  }

  if (statusBox) {
    statusBox.style.display = 'block';
    statusBox.style.background = '#f0fdf4';
    statusBox.style.color = '#15803d';
    statusBox.style.border = '1px solid #86efac';
    statusBox.innerHTML = '<strong>Hujjat ichidagi barcha QR-kodlar (e-shahodatnoma va ID-karta)</strong> 4 xil burchakda skan qilinmoqda...';
  }

  const apiHost = (window.location.protocol === 'http:' || window.location.protocol === 'https:') ? '' : 'http://localhost:8080';
  const url = apiHost + '/api/scan_student_qr?file=' + encodeURIComponent(s.doc_file) + '&row=' + (s.row || 0);

  fetch(url)
    .then(function(r) { return r.json(); })
    .then(function(res) {
      if (btn) {
        btn.disabled = false;
        btn.innerHTML = '<svg class="svg-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="7" height="7"></rect><rect x="14" y="3" width="7" height="7"></rect><rect x="14" y="14" width="7" height="7"></rect><rect x="3" y="14" width="7" height="7"></rect></svg> QR Skaner (Avtomatik)';
        btn.style.opacity = '1';
      }

      if (res.success && res.data) {
        const d = res.data;
        if (statusBox) {
          statusBox.style.background = '#dcfce7';
          statusBox.style.color = '#15803d';
          statusBox.style.border = '1px solid #86efac';
          statusBox.innerHTML = '<strong>QR-kodlar 100% rasmiy o\'qildi</strong> va ma\'lumotlar Excel bazaga kiritildi!';
        }

        // Ma'lumotlarni yangilaymiz
        if (d.ism) { s.ism = d.ism; s.fish = (d.ism + ' ' + (d.ota || s.ota || '')).trim(); }
        if (d.pass_ser) s.pv = d.pass_ser;
        if (d.pinfl) s.pinfl = String(d.pinfl);
        if (d.dob) s.dob = d.dob;
        if (d.ota) s.ota = d.ota;
        if (d.sh_doc) s.sh_doc = d.sh_doc;
        if (d.sh_qr) s.sh_qr = d.sh_qr;
        if (d.doc_tur) s.doc_tur = d.doc_tur;
        if (d.maktab) s.mak = d.maktab;
        if (d.yil) s.yil = String(d.yil);

        renderInfoCards(s, window.isEditMode);

        // Jadvaldagi qatorni ham yangilaymiz
        const rows = document.querySelectorAll('.student-row');
        if (rows[window.currentStudentIdx]) {
          const rEl = rows[window.currentStudentIdx];
          const cells = rEl.querySelectorAll('td');
          if (cells.length >= 10) {
            cells[3].innerHTML = '<div><span class="mono" style="color:#1e3c72;font-weight:700;font-size:13px;">' + (s.pv || '—') + '</span></div>';
            cells[4].innerHTML = '<span class="mono" style="color:#0f172a;font-size:12.5px;letter-spacing:0.5px;">' + (s.pinfl || '—') + '</span>';
            cells[5].innerHTML = '<div style="font-size:12px;color:#0f172a;">DOB: <strong>' + (s.dob || '—') + '</strong></div>' +
                                  '<div style="font-size:11.5px;color:#7c3aed;margin-top:2px;">Berilgan: <strong>' + (s.ber || '—') + '</strong></div>';
            cells[6].innerHTML = '<div><span class="mono" style="color:#15803d;font-weight:700;">' + (s.sh_doc || '—') + '</span></div>' +
                                  '<div style="font-size:11px;color:#64748b;margin-top:1px;">' + (s.doc_tur || '—') + '</div>';
            cells[7].innerHTML = '<div style="font-size:12px;color:#334155;line-height:1.3;">' + (s.mak || '—') + '</div>' +
                                  '<div style="font-size:11px;color:#0284c7;margin-top:3px;font-weight:600;">' + (s.yon || '—') + '</div>';
          }
        }
      } else {
        if (statusBox) {
          statusBox.style.background = '#fee2e2';
          statusBox.style.color = '#991b1b';
          statusBox.style.border = '1px solid #f87171';
          statusBox.innerHTML = 'QR kod topilmadi: ' + (res.error || 'Rasmlarda QR-kod mavjud emas yoki sifatsiz');
        }
      }
    })
    .catch(function(e) {
      if (btn) {
        btn.disabled = false;
        btn.innerHTML = '<svg class="svg-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="7" height="7"></rect><rect x="14" y="3" width="7" height="7"></rect><rect x="14" y="14" width="7" height="7"></rect><rect x="3" y="14" width="7" height="7"></rect></svg> QR Skaner (Avtomatik)';
        btn.style.opacity = '1';
      }
      if (statusBox) {
        statusBox.style.background = '#fee2e2';
        statusBox.style.color = '#991b1b';
        statusBox.style.border = '1px solid #f87171';
        statusBox.innerHTML = 'Server bilan ulanishda xatolik: ' + e;
      }
    });
};

/* 2. TALABANI BAZADAN BUTUNLAY O'CHIRISH */
window.deleteCurrentStudent = function() {
  if (window.currentStudentIdx === null || !RAW_STUDENTS[window.currentStudentIdx]) return;
  const s = RAW_STUDENTS[window.currentStudentIdx];

  const studentName = s.fish || s.ism || 'ushbu talaba';
  const confirmMsg = "Haqiqatan ham " + studentName + " (Shartnoma: #" + (s.shnum || '—') + ") ni bazadan butunlay o'chirib tashlamoqchimisiz?\n\nBu amal Excel bazadan ham o'chiradi!";

  if (!confirm(confirmMsg)) return;

  const btn = document.getElementById('btnDeleteStudentTop');
  if (btn) {
    btn.disabled = true;
    btn.innerHTML = 'O\'chirilmoqda...';
    btn.style.opacity = '0.7';
  }

  const apiHost = (window.location.protocol === 'http:' || window.location.protocol === 'https:') ? '' : 'http://localhost:8080';
  const url = apiHost + '/api/delete_student?row=' + (s.row || 0);

  fetch(url)
    .then(function(r) { return r.json(); })
    .then(function(res) {
      if (res && res.success) {
        alert(studentName + " bazadan muvaffaqiyatli o'chirildi!");
        window.closeStudentModal();
        location.reload();
      } else {
        alert("O'chirishda xatolik: " + (res.error || 'Noma\'lum xato'));
        if (btn) {
          btn.disabled = false;
          btn.innerHTML = '<svg class="svg-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg> Talabani O\'chirish';
          btn.style.opacity = '1';
        }
      }
    })
    .catch(function(err) {
      alert("Server bilan ulanishda xatolik: " + err);
      if (btn) {
        btn.disabled = false;
        btn.innerHTML = '<svg class="svg-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg> Talabani O\'chirish';
        btn.style.opacity = '1';
      }
    });
};

/* AI ORQALI QAYTA TEKSHIRISH TUGMASI (QR-FIRST + GEMINI 2.5 PRO) */
window.reanalyzeCurrentStudent = function() {
  if (window.currentStudentIdx === null || !RAW_STUDENTS[window.currentStudentIdx]) return;
  const s = RAW_STUDENTS[window.currentStudentIdx];

  if (!s.doc_file) {
    alert("Bu talabaning Word fayli yo'q, tahlil qilib bo'lmaydi!");
    return;
  }

  const btn = document.getElementById('btnReanalyze');
  const statusBox = document.getElementById('reanalyzeStatus');

  if (btn) {
    btn.disabled = true;
    btn.innerHTML = 'QR & Pro model tahlil qilmoqda...';
    btn.style.opacity = '0.7';
  }

  if (statusBox) {
    statusBox.style.display = 'block';
    statusBox.style.background = '#eff6ff';
    statusBox.style.color = '#1d4ed8';
    statusBox.style.border = '1px solid #bfdbfe';
    statusBox.innerHTML = '<strong>QR-kodlar (e-shahodatnoma & ID-karta)</strong> tekshirilmoqda hamda <strong>Gemini 2.5 Pro</strong> modeli orqali sinchiklab qayta o\'qilmoqda...';
  }

  const apiHost = (window.location.protocol === 'http:' || window.location.protocol === 'https:') ? '' : 'http://localhost:8080';
  const url = apiHost + '/api/reanalyze_student?file=' + encodeURIComponent(s.doc_file) + '&row=' + (s.row || 0) + '&model=pro';

  fetch(url)
    .then(function(r) { return r.json(); })
    .then(function(res) {
      if (btn) {
        btn.disabled = false;
        btn.innerHTML = ICONS.zap + ' AI Pro Qayta Tekshirish';
        btn.style.opacity = '1';
      }

      if (res.success && res.data) {
        const d = res.data;
        if (statusBox) {
          statusBox.style.background = '#dcfce7';
          statusBox.style.color = '#15803d';
          statusBox.style.border = '1px solid #86efac';
          let qrNotice = d.sh_qr ? ' (QR-kod orqali 100% rasmiy tasdiqlandi)' : '';
          statusBox.innerHTML = `Muvaffaqiyatli qayta tekshirildi${qrNotice} va Excel bazaga saqlandi!`;
        }

        // Ma'lumotlarni yangilaymiz
        if (d.ism) { s.ism = d.ism; s.fish = (d.ism + ' ' + (d.ota || s.ota || '')).trim(); }
        if (d.pass_ser) s.pv = d.pass_ser;
        if (d.pass_type) s.pass_type = d.pass_type;
        if (d.pinfl) s.pinfl = String(d.pinfl);
        if (d.dob) s.dob = d.dob;
        if (d.pass_ber) s.ber = d.pass_ber;
        if (d.ota) s.ota = d.ota;
        if (d.sh_doc) s.sh_doc = d.sh_doc;
        if (d.sh_qr) s.sh_qr = d.sh_qr;
        if (d.doc_tur) s.doc_tur = d.doc_tur;
        if (d.maktab) s.mak = d.maktab;
        if (d.yil) s.yil = String(d.yil);

        // Faqat ma'lumotlar kartalarini yangilaymiz (Rasmlar o'z joyida qoladi!)
        renderInfoCards(s, window.isEditMode);

        // Jadvaldagi qatorni ham yangilaymiz
        const rows = document.querySelectorAll('.student-row');
        if (rows[window.currentStudentIdx]) {
          const rEl = rows[window.currentStudentIdx];
          
          rEl.setAttribute('data-name', (s.fish || '').toLowerCase());
          rEl.setAttribute('data-pass', (s.pv || '').toLowerCase());
          rEl.setAttribute('data-pinfl', s.pinfl || '');
          rEl.setAttribute('data-dob', (s.dob || '') + ' ' + (s.ber || ''));
          rEl.setAttribute('data-doc', (s.sh_doc || '').toLowerCase());
          rEl.setAttribute('data-doctype', s.doc_tur || '');
          rEl.setAttribute('data-mak', (s.mak || '').toLowerCase());
          rEl.setAttribute('data-yil', s.yil || '');
          rEl.setAttribute('data-yon', (s.yon || '').toLowerCase());

          const cells = rEl.querySelectorAll('td');
          if (cells.length >= 10) {
            cells[3].innerHTML = '<div><span class="mono" style="color:#1e3c72;font-weight:700;font-size:13px;">' + (s.pv || '—') + '</span></div>';
            cells[4].innerHTML = '<span class="mono" style="color:#0f172a;font-size:12.5px;letter-spacing:0.5px;">' + (s.pinfl || '—') + '</span>';
            cells[5].innerHTML = '<div style="font-size:12px;color:#0f172a;">DOB: <strong>' + (s.dob || '—') + '</strong></div>' +
                                  '<div style="font-size:11.5px;color:#7c3aed;margin-top:2px;">Berilgan: <strong>' + (s.ber || '—') + '</strong></div>';
            cells[6].innerHTML = '<div><span class="mono" style="color:#15803d;font-weight:700;">' + (s.sh_doc || '—') + '</span></div>' +
                                  '<div style="font-size:11px;color:#64748b;margin-top:1px;">' + (s.doc_tur || '—') + '</div>';
            cells[7].innerHTML = '<div style="font-size:12px;color:#334155;line-height:1.3;">' + (s.mak || '—') + '</div>' +
                                  '<div style="font-size:11px;color:#0284c7;margin-top:3px;font-weight:600;">' + (s.yon || '—') + '</div>';
            cells[8].innerText = s.yil || '—';
          }
        }
        alert("AI orqali qayta tekshirildi va Excel bazaga saqlandi!");
      } else {
        if (statusBox) {
          statusBox.style.background = '#fee2e2';
          statusBox.style.color = '#991b1b';
          statusBox.style.border = '1px solid #f87171';
          statusBox.innerHTML = 'Xatolik: ' + (res.error || 'Qayta tahlil qilib bo\'lmadi');
        }
        alert("Xatolik: " + (res.error || 'Qayta tahlil qilib bo\'lmadi'));
      }
    })
    .catch(function(e) {
      if (btn) {
        btn.disabled = false;
        btn.innerHTML = ICONS.zap + ' AI Qayta Tekshirish';
        btn.style.opacity = '1';
      }
      if (statusBox) {
        statusBox.style.background = '#fee2e2';
        statusBox.style.color = '#991b1b';
        statusBox.style.border = '1px solid #f87171';
        statusBox.innerHTML = 'Server bilan ulanishda xatolik: ' + e;
      }
      alert("Server bilan ulanishda xatolik: " + e);
    });
};

window.closeModal = function() {
  const m = document.getElementById('viewerModal');
  if (m) m.style.display = 'none';
};

window.closeModalOnBackdrop = function(e) {
  if (e.target.id === 'viewerModal') window.closeModal();
};

/* =========================================================================
   LIGHTBOX (SHU OYNANING O'ZIDA KATTALASHTIRISH, AYLANTIRISH VA SURISH)
   ========================================================================= */

window.openLightbox = function(idx) {
  if (!window.currentDocImages || window.currentDocImages.length === 0) return;
  window.currentImgIdx = idx;
  window.imgZoom = 1;
  window.imgRotate = 0;
  window.imgPanX = 0;
  window.imgPanY = 0;

  let lb = document.getElementById('imgLightbox');
  if (!lb) {
    lb = document.createElement('div');
    lb.id = 'imgLightbox';
    lb.style.cssText = 'position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,0.94);z-index:999999;display:flex;flex-direction:column;align-items:center;justify-content:center;user-select:none;backdrop-filter:blur(8px);';
    lb.innerHTML = `
      <!-- Toolbar -->
      <div style="position:absolute;top:16px;left:20px;right:20px;display:flex;justify-content:space-between;align-items:center;z-index:1000000;">
        <div style="color:#fff;font-size:14px;font-weight:700;display:flex;align-items:center;gap:12px;">
          <span id="lbCounter" style="background:#1e293b;padding:6px 12px;border-radius:8px;border:1px solid #334155;">1 / 2</span>
          <span style="font-size:12px;color:#94a3b8;">(Sichqoncha g'ildiragi orqali Zoom qiling yoki suring)</span>
        </div>
        <div style="display:flex;gap:8px;align-items:center;">
          <button type="button" class="btn" style="background:#334155;color:#fff;padding:8px 14px;display:inline-flex;align-items:center;gap:6px;" onclick="zoomLightbox(0.25)" title="Kattalashtirish">${ICONS.zoomIn} Zoom +</button>
          <button type="button" class="btn" style="background:#334155;color:#fff;padding:8px 14px;display:inline-flex;align-items:center;gap:6px;" onclick="zoomLightbox(-0.25)" title="Kichraytirish">${ICONS.zoomOut} Zoom -</button>
          <button type="button" class="btn" style="background:#334155;color:#fff;padding:8px 14px;display:inline-flex;align-items:center;gap:6px;" onclick="rotateLightbox(90)" title="O'ngga 90 gradus burish">${ICONS.rotate} Aylantirish</button>
          <button type="button" class="btn" style="background:#334155;color:#fff;padding:8px 14px;display:inline-flex;align-items:center;gap:6px;" onclick="resetLightbox()" title="Asl o'lcham">${ICONS.reset} Reset</button>
          <button type="button" class="btn" style="background:#ef4444;color:#fff;padding:8px 18px;font-size:14px;font-weight:bold;display:inline-flex;align-items:center;gap:6px;" onclick="closeLightbox()">${ICONS.close} Yopish</button>
        </div>
      </div>

      <!-- Navigation Arrows -->
      <button type="button" id="lbPrevBtn" style="position:absolute;left:20px;top:50%;transform:translateY(-50%);background:rgba(255,255,255,0.15);color:#fff;border:none;width:54px;height:54px;border-radius:50%;cursor:pointer;display:flex;align-items:center;justify-content:center;z-index:1000000;transition:all 0.2s;" onclick="navLightbox(-1)">${ICONS.chevronLeft}</button>
      <button type="button" id="lbNextBtn" style="position:absolute;right:20px;top:50%;transform:translateY(-50%);background:rgba(255,255,255,0.15);color:#fff;border:none;width:54px;height:54px;border-radius:50%;cursor:pointer;display:flex;align-items:center;justify-content:center;z-index:1000000;transition:all 0.2s;" onclick="navLightbox(1)">${ICONS.chevronRight}</button>

      <!-- Image Canvas Area -->
      <div id="lbImageWrap" style="width:100%;height:100%;display:flex;align-items:center;justify-content:center;overflow:hidden;cursor:grab;">
        <img id="lbMainImg" src="" style="max-width:90vw;max-height:85vh;object-fit:contain;transition:transform 0.15s ease-out;box-shadow:0 10px 40px rgba(0,0,0,0.8);border-radius:6px;pointer-events:auto;" draggable="false">
      </div>
    `;
    document.body.appendChild(lb);

    // Event listeners for zoom & pan
    const wrap = document.getElementById('lbImageWrap');
    wrap.addEventListener('wheel', function(e) {
      e.preventDefault();
      const delta = e.deltaY < 0 ? 0.2 : -0.2;
      zoomLightbox(delta);
    }, { passive: false });

    wrap.addEventListener('mousedown', function(e) {
      if (e.target.id === 'lbMainImg' || e.target.id === 'lbImageWrap') {
        window.isDragging = true;
        window.dragStartX = e.clientX - window.imgPanX;
        window.dragStartY = e.clientY - window.imgPanY;
        wrap.style.cursor = 'grabbing';
      }
    });

    window.addEventListener('mousemove', function(e) {
      if (window.isDragging) {
        window.imgPanX = e.clientX - window.dragStartX;
        window.imgPanY = e.clientY - window.dragStartY;
        applyLightboxTransform();
      }
    });

    window.addEventListener('mouseup', function() {
      window.isDragging = false;
      if (wrap) wrap.style.cursor = 'grab';
    });

    // Keyboard support
    window.addEventListener('keydown', function(e) {
      if (document.getElementById('imgLightbox') && document.getElementById('imgLightbox').style.display !== 'none') {
        if (e.key === 'Escape') closeLightbox();
        if (e.key === 'ArrowLeft') navLightbox(-1);
        if (e.key === 'ArrowRight') navLightbox(1);
        if (e.key === 'r' || e.key === 'R') rotateLightbox(90);
      }
    });
  }

  lb.style.display = 'flex';
  updateLightboxImage();
};

function updateLightboxImage() {
  const imgEl = document.getElementById('lbMainImg');
  const counterEl = document.getElementById('lbCounter');
  const prevBtn = document.getElementById('lbPrevBtn');
  const nextBtn = document.getElementById('lbNextBtn');

  if (!imgEl) return;

  const total = window.currentDocImages.length;
  imgEl.src = window.currentDocImages[window.currentImgIdx];
  if (counterEl) counterEl.innerText = (window.currentImgIdx + 1) + ' / ' + total;

  if (prevBtn) prevBtn.style.display = (total > 1) ? 'flex' : 'none';
  if (nextBtn) nextBtn.style.display = (total > 1) ? 'flex' : 'none';

  applyLightboxTransform();
}

function applyLightboxTransform() {
  const imgEl = document.getElementById('lbMainImg');
  if (imgEl) {
    imgEl.style.transform = 'translate(' + window.imgPanX + 'px, ' + window.imgPanY + 'px) scale(' + window.imgZoom + ') rotate(' + window.imgRotate + 'deg)';
  }
}

window.zoomLightbox = function(step) {
  window.imgZoom = Math.max(0.4, Math.min(5.0, window.imgZoom + step));
  applyLightboxTransform();
};

window.rotateLightbox = function(deg) {
  window.imgRotate = (window.imgRotate + deg) % 360;
  applyLightboxTransform();
};

window.resetLightbox = function() {
  window.imgZoom = 1;
  window.imgRotate = 0;
  window.imgPanX = 0;
  window.imgPanY = 0;
  applyLightboxTransform();
};

window.navLightbox = function(dir) {
  const total = window.currentDocImages.length;
  if (total <= 1) return;
  window.currentImgIdx = (window.currentImgIdx + dir + total) % total;
  window.imgZoom = 1;
  window.imgRotate = 0;
  window.imgPanX = 0;
  window.imgPanY = 0;
  updateLightboxImage();
}

window.closeLightbox = function() {
  const lb = document.getElementById('imgLightbox');
  if (lb) lb.style.display = 'none';
};

/* JONLI FILTRLAR (AVTOMATIK SAQLANADI VA F5 DA TIKLANADI) */
window.filterRows = function(skipSave = false) {
  const getVal = (id) => (document.getElementById(id) ? document.getElementById(id).value.toLowerCase().trim() : '');
  const getRaw = (id) => (document.getElementById(id) ? document.getElementById(id).value : '');

  const gSearch = getVal('globalSearch');
  const fGroup = getVal('filterGroup');
  const pType = getRaw('filterPassType');
  const dType = getRaw('filterDocType');
  const yon = getVal('filterYon');
  const status = getRaw('filterStatus');
  const nameMatch = getRaw('filterNameMatch');
  const fVerified = getVal('filterVerified');
  const colVerified = getVal('col_verified');
  
  const colGroup = getVal('col_group');
  const colShnum = getVal('col_shnum');
  const colName  = getVal('col_name');
  const colFixed = getVal('col_fixed');
  const colPassFish = getVal('col_passfish');
  const colCertFish = getVal('col_certfish');
  const colPass  = getVal('col_pass');
  const colPinfl = getVal('col_pinfl');
  const colDob   = getVal('col_dob');
  const colDoc   = getVal('col_doc');
  const colMak   = getVal('col_mak');
  const colYil   = getVal('col_yil');
  const colFile  = getVal('col_file');

  const rows = document.querySelectorAll('.student-row');
  const cards = document.querySelectorAll('.student-card');
  let visibleCount = 0;

  for (let i = 0; i < rows.length; i++) {
    const r = rows[i];
    const card = cards[i] || null;

    const dShnum = r.getAttribute('data-shnum');
    const dName  = r.getAttribute('data-name');
    const dGroup = (r.getAttribute('data-group') || '').toLowerCase();
    const dPass  = r.getAttribute('data-pass');
    const dPassType = r.getAttribute('data-passtype');
    const dPinfl = r.getAttribute('data-pinfl');
    const dDob   = r.getAttribute('data-dob');
    const dDoc   = r.getAttribute('data-doc');
    const dDocType = r.getAttribute('data-doctype');
    const dMak   = r.getAttribute('data-mak');
    const dYil   = r.getAttribute('data-yil');
    const dYon   = r.getAttribute('data-yon');
    const dStatus = r.getAttribute('data-status');
    const dFile  = r.getAttribute('data-file');
    const dFixed = r.getAttribute('data-fixedfish') || '';
    const dPassFish = r.getAttribute('data-passfish') || '';
    const dCertFish = r.getAttribute('data-certfish') || '';
    const dVerified = (r.getAttribute('data-verified') || '').toLowerCase();

    let visible = true;

    if (gSearch) {
      const textAll = dGroup + ' ' + dShnum + ' ' + dName + ' ' + dPass + ' ' + dPinfl + ' ' + dMak + ' ' + dFile + ' ' + dFixed + ' ' + dPassFish + ' ' + dCertFish;
      if (!textAll.includes(gSearch)) visible = false;
    }

    if (visible && fGroup) {
      const fgLower = fGroup.toLowerCase();
      if (fgLower === 'belgilanmagan' || fgLower === 'unassigned' || fgLower === 'n') {
        if (dGroup !== '' && dGroup !== 'belgilanmagan' && dGroup !== 'none' && dGroup !== 'n') visible = false;
      } else if (dGroup !== fgLower) {
        visible = false;
      }
    }
    if (visible && pType && dPassType !== pType) visible = false;
    if (visible && dType && dDocType !== dType) visible = false;
    if (visible && yon) {
      if (yon === 'hamshira_feldsher') {
        if (!dYon.includes('hamshira') && !dYon.includes('feldsh') && !dYon.includes('davolash')) visible = false;
      } else {
        if (!dYon.includes(yon)) visible = false;
      }
    }
    if (visible && status && dStatus !== status) visible = false;
    if (visible && nameMatch) {
      const dNameMatch = r.getAttribute('data-namematch') || '';
      if (nameMatch === 'none') { if (dNameMatch !== '') visible = false; }
      else if (dNameMatch !== nameMatch) visible = false;
    }
    if (visible && fVerified && dVerified !== fVerified) visible = false;

    if (visible && colGroup && !dGroup.includes(colGroup)) visible = false;
    if (visible && colShnum && !dShnum.includes(colShnum)) visible = false;
    if (visible && colName && !dName.includes(colName)) visible = false;
    if (visible && colFixed && !dFixed.includes(colFixed)) visible = false;
    if (visible && colPassFish && !dPassFish.includes(colPassFish)) visible = false;
    if (visible && colCertFish && !dCertFish.includes(colCertFish)) visible = false;
    if (visible && colPass && !dPass.includes(colPass)) visible = false;
    if (visible && colPinfl && !dPinfl.includes(colPinfl)) visible = false;
    if (visible && colDob && !dDob.includes(colDob)) visible = false;
    if (visible && colDoc && !dDoc.includes(colDoc)) visible = false;
    if (visible && colMak && !dMak.includes(colMak)) visible = false;
    if (visible && colYil && !dYil.includes(colYil)) visible = false;
    if (visible && colFile && !dFile.includes(colFile)) visible = false;
    if (visible && colVerified && dVerified !== colVerified) visible = false;

    r.style.display = visible ? '' : 'none';
    if (card) card.style.display = visible ? '' : 'none';

    if (visible) {
      visibleCount++;
      const firstTd = r.querySelector('td:first-child');
      if (firstTd) firstTd.innerText = visibleCount;
      if (card) {
        const trBadge = card.querySelector('.card-tr-badge');
        if (trBadge) trBadge.innerText = '#' + visibleCount;
      }
    }
  }

  const shownSpan = document.getElementById('shownCount');
  if (shownSpan) shownSpan.innerText = visibleCount;

  // Filtr holatini avtomatik saqlash (F5 bo'lganda buzilmasligi uchun)
  if (!skipSave) {
    saveActiveFilters();
  }
};

/* FILTRLARNI LOCALSTORAGE DA SAQLASH VA TIKLASH (F5 DA BUZILMASLIGI UCHUN) */
function saveActiveFilters() {
  try {
    const fGroup = (document.getElementById('filterGroup') ? document.getElementById('filterGroup').value : '').trim();
    const gSearch = document.getElementById('globalSearch') ? document.getElementById('globalSearch').value : '';
    const pType = document.getElementById('filterPassType') ? document.getElementById('filterPassType').value : '';
    const dType = document.getElementById('filterDocType') ? document.getElementById('filterDocType').value : '';
    const yon = document.getElementById('filterYon') ? document.getElementById('filterYon').value : '';
    const status = document.getElementById('filterStatus') ? document.getElementById('filterStatus').value : '';
    const nameMatch = document.getElementById('filterNameMatch') ? document.getElementById('filterNameMatch').value : '';
    const fVerified = document.getElementById('filterVerified') ? document.getElementById('filterVerified').value : '';

    const filterState = {
      group: fGroup,
      search: gSearch,
      passType: pType,
      docType: dType,
      yon: yon,
      status: status,
      nameMatch: nameMatch,
      verified: fVerified
    };
    localStorage.setItem('student_portal_filters', JSON.stringify(filterState));
  } catch(e) {}
}

window.restoreActiveFilters = function() {
  try {
    const raw = localStorage.getItem('student_portal_filters');
    if (!raw) return false;
    const saved = JSON.parse(raw);
    if (!saved) return false;

    let hasFilter = false;

    // 1. Guruh filtri (F5 da birinchi navbatda tiklanadi!)
    if (saved.group) {
      const grpSelect = document.getElementById('filterGroup');
      if (grpSelect) {
        grpSelect.value = saved.group;
        hasFilter = true;
      }
      // Guruh monitoring kartasi va tabini faollashtirish
      document.querySelectorAll('.grp-stat-card').forEach(function(b) { b.classList.remove('active'); });
      const card = document.getElementById('grp-stat-card-' + saved.group);
      if (card) card.classList.add('active');

      document.querySelectorAll('.kontingent-row').forEach(function(r) { r.classList.remove('active'); });
      const kId = (saved.group === 'belgilanmagan' || saved.group === 'unassigned') ? 'kontingent-row-unassigned' : ('kontingent-row-' + saved.group);
      const kRow = document.getElementById(kId);
      if (kRow) kRow.classList.add('active');

      document.querySelectorAll('.group-tab-btn').forEach(function(b) { b.classList.remove('active'); });
      const tab = document.getElementById('tab_' + saved.group);
      if (tab) tab.classList.add('active');
    } else {
      document.querySelectorAll('.grp-stat-card').forEach(function(b) { b.classList.remove('active'); });
      const allCard = document.getElementById('grp-stat-card-all');
      if (allCard) allCard.classList.add('active');
      document.querySelectorAll('.kontingent-row').forEach(function(r) { r.classList.remove('active'); });
      const allTab = document.getElementById('tab_all');
      if (allTab) {
        document.querySelectorAll('.group-tab-btn').forEach(function(b) { b.classList.remove('active'); });
        allTab.classList.add('active');
      }
    }

    // 2. Qidiruv matni
    if (saved.search) {
      const searchInput = document.getElementById('globalSearch');
      if (searchInput) {
        searchInput.value = saved.search;
        hasFilter = true;
      }
    }

    // 3. Qo'shimcha filtrlar
    if (saved.passType && document.getElementById('filterPassType')) {
      document.getElementById('filterPassType').value = saved.passType;
      hasFilter = true;
    }
    if (saved.docType && document.getElementById('filterDocType')) {
      document.getElementById('filterDocType').value = saved.docType;
      hasFilter = true;
    }
    if (saved.yon && document.getElementById('filterYon')) {
      document.getElementById('filterYon').value = saved.yon;
      hasFilter = true;
    }
    if (saved.status && document.getElementById('filterStatus')) {
      document.getElementById('filterStatus').value = saved.status;
      hasFilter = true;
    }
    if (saved.nameMatch && document.getElementById('filterNameMatch')) {
      document.getElementById('filterNameMatch').value = saved.nameMatch;
      hasFilter = true;
    }
    if (saved.verified && document.getElementById('filterVerified')) {
      document.getElementById('filterVerified').value = saved.verified;
      hasFilter = true;
    }

    if (hasFilter) {
      window.filterRows(true);
      return true;
    }
  } catch(e) {
    console.error("Filtrlarni tiklashda xato:", e);
  }
  return false;
};

window.filterByVerification = function(val) {
  const fv = document.getElementById('filterVerified');
  if (fv) {
    fv.value = val ? val.toLowerCase() : '';
    window.filterRows();
  }
};

window.resetAllFilters = function() {
  try {
    localStorage.removeItem('student_portal_filters');
  } catch(e) {}

  ['globalSearch', 'filterGroup', 'filterPassType', 'filterDocType', 'filterYon', 'filterStatus', 'filterNameMatch', 'filterVerified', 'col_verified'].forEach(function(id) {
    const el = document.getElementById(id);
    if (el) el.value = '';
  });
  document.querySelectorAll('.col-filter').forEach(function(input) { input.value = ''; });

  // Group tab & card active holatini tozalash
  document.querySelectorAll('.grp-stat-card').forEach(function(b) { b.classList.remove('active'); });
  const allCard = document.getElementById('grp-stat-card-all');
  if (allCard) allCard.classList.add('active');
  document.querySelectorAll('.kontingent-row').forEach(function(r) { r.classList.remove('active'); });
  document.querySelectorAll('.group-tab-btn').forEach(function(b) { b.classList.remove('active'); });
  const allTab = document.getElementById('tab_all');
  if (allTab) allTab.classList.add('active');

  window.filterRows();
};

/* GURUHLAR TUGMASI VA MONITORING KARTALARI BOSILGANDA */
window.filterByGroup = function(groupName) {
  const grpSelect = document.getElementById('filterGroup');
  const currentVal = grpSelect ? grpSelect.value : '';

  // Agar allaqachon tanlangan guruh yana bir bor bosilsa, tanlovni bekor qilib barchasiga qaytish (toggle)
  if (groupName && currentVal === groupName) {
    groupName = '';
  }

  document.getElementById('globalSearch').value = '';
  document.getElementById('filterPassType').value = '';
  document.getElementById('filterDocType').value = '';
  document.getElementById('filterStatus').value = '';
  document.querySelectorAll('.col-filter').forEach(function(input) { input.value = ''; });
  
  if (grpSelect) grpSelect.value = groupName;

  // 1. Monitoring kartalariga active sinfini o'rnatish
  document.querySelectorAll('.grp-stat-card').forEach(function(b) { b.classList.remove('active'); });
  if (!groupName) {
    const allCard = document.getElementById('grp-stat-card-all');
    if (allCard) allCard.classList.add('active');
  } else {
    const card = document.getElementById('grp-stat-card-' + groupName);
    if (card) card.classList.add('active');
  }

  // 2. Kontingent jadvalidagi tegishli qatorni faollashtirish
  document.querySelectorAll('.kontingent-row').forEach(function(r) { r.classList.remove('active'); });
  if (groupName) {
    const kId = (groupName === 'belgilanmagan' || groupName === 'unassigned' || groupName.toLowerCase() === 'n') ? 'kontingent-row-unassigned' : ('kontingent-row-' + groupName);
    const kRow = document.getElementById(kId);
    if (kRow) kRow.classList.add('active');
  }

  // 3. Agar mavjud bo'lsa group-tab tugmalarini ham sinxronlash
  document.querySelectorAll('.group-tab-btn').forEach(function(b) { b.classList.remove('active'); });
  if (!groupName) {
    const allTab = document.getElementById('tab_all');
    if (allTab) allTab.classList.add('active');
  } else {
    const tab = document.getElementById('tab_' + groupName);
    if (tab) tab.classList.add('active');
  }

  window.filterRows();
};

/* STATISTIKA KARTALARI BOSILGANDA TEZKOR FILTRLASH */
window.filterByDirection = function(keyword) {
  window.resetAllFilters();
  const select = document.getElementById('filterYon');
  if (select) {
    if (!keyword) {
      select.value = '';
    } else if (keyword.toLowerCase() === 'hamshira_feldsher') {
      select.value = 'hamshira_feldsher';
      if (select.selectedIndex === -1) {
        // Option mavjud bo'lmasa vaqtincha qo'shamiz
        const opt = document.createElement('option');
        opt.value = 'hamshira_feldsher';
        opt.text = 'Hamshiralik ishi (Barchasi)';
        select.appendChild(opt);
        select.value = 'hamshira_feldsher';
      }
    } else {
      for (let i = 0; i < select.options.length; i++) {
        if (select.options[i].value.toLowerCase().includes(keyword.toLowerCase())) {
          select.selectedIndex = i;
          break;
        }
      }
    }
  }
  window.filterRows();
};

window.filterByStatus = function(statusVal) {
  window.resetAllFilters();
  const select = document.getElementById('filterStatus');
  if (select) select.value = statusVal;
  window.filterRows();
};

window.filterByPassType = function(ptype) {
  window.resetAllFilters();
  const select = document.getElementById('filterPassType');
  if (select) select.value = ptype;
  window.filterRows();
};

/* KARTA VA JADVAL KO'RINISHINI ALMASHTIRISH (DISPLAY MODE) */
window.switchDisplayMode = function(mode) {
  const cardsCont = document.getElementById('studentsCardsContainer');
  const tableCont = document.getElementById('studentsTableContainer');
  const btnCards = document.getElementById('btnModeCards');
  const btnTable = document.getElementById('btnModeTable');

  try {
    localStorage.setItem('student_portal_display_mode', mode);
  } catch(e) {}

  if (mode === 'cards') {
    if (cardsCont) cardsCont.style.display = 'flex';
    if (tableCont) tableCont.style.display = 'none';
    if (btnCards) btnCards.classList.add('active');
    if (btnTable) btnTable.classList.remove('active');
  } else {
    if (cardsCont) cardsCont.style.display = 'none';
    if (tableCont) tableCont.style.display = 'block';
    if (btnTable) btnTable.classList.add('active');
    if (btnCards) btnCards.classList.remove('active');
  }
};

/* KARTA VA JADVALNING O'ZIDAN GURUHNI TEZKOR O'ZGARTIRISH */
window.changeStudentGroup = function(studentIdx, newGroup, rowIdx) {
  if (studentIdx === undefined || !RAW_STUDENTS[studentIdx]) return;
  const s = RAW_STUDENTS[studentIdx];
  s.group = newGroup;

  // Qatordagi va kartadagi data-group atributini yangilaymiz
  const rowEl = document.querySelectorAll('.student-row')[studentIdx];
  if (rowEl) {
    rowEl.setAttribute('data-group', newGroup.toLowerCase());
    const sel = rowEl.querySelector('.group-select');
    if (sel && sel.value !== newGroup) sel.value = newGroup;
  }
  const cardEl = document.querySelectorAll('.student-card')[studentIdx];
  if (cardEl) {
    cardEl.setAttribute('data-group', newGroup.toLowerCase());
    const cardBadge = cardEl.querySelector('.card-group-badge');
    if (cardBadge) {
      const grpClean = (newGroup || '').replace(/[^a-zA-Z0-9]/g, '').toLowerCase();
      cardBadge.className = 'card-group-badge grp-' + (grpClean || 'n');
      const svg = cardBadge.querySelector('svg');
      cardBadge.innerHTML = (svg ? svg.outerHTML + ' ' : '') + (newGroup || '—');
    }
    const cardSel = cardEl.querySelector('.card-group-select');
    if (cardSel && cardSel.value !== newGroup) cardSel.value = newGroup;
  }

  // Serverga yuborib Excel bazaga saqlaymiz
  const apiHost = (window.location.protocol === 'http:' || window.location.protocol === 'https:') ? '' : 'http://localhost:8080';
  const url = apiHost + '/api/update_student?row=' + (rowIdx || s.row) + '&group=' + encodeURIComponent(newGroup);

  // Mini Toast bildirishnomasi
  showToast(`${s.ism} guruhi "${newGroup}" ga o'zgartirildi va saqlandi!`, 'success');

  // Guruhlar tasdiqlash monitoringini qayta hisoblash
  if (typeof window.updateGroupsVerificationStats === 'function') {
    window.updateGroupsVerificationStats();
  }

  fetch(url).catch(function(err) {
    console.error("Guruhni saqlashda xatolik:", err);
  });
};

/* ASOSIY KO'RINISHNI ALMASHTIRISH (Baza vs Guruhlar Jurnali) */
window.switchMainView = function(viewName) {
  const dbSection = document.getElementById('view_database_section');
  const grpSection = document.getElementById('view_groups_section');
  const btnDb = document.getElementById('btn_switch_db');
  const btnGrp = document.getElementById('btn_switch_groups');

  try {
    localStorage.setItem('student_portal_main_view', viewName);
  } catch(e) {}

  if (viewName === 'groups') {
    if (dbSection) dbSection.style.display = 'none';
    if (grpSection) grpSection.style.display = 'block';
    if (btnDb) btnDb.classList.remove('active');
    if (btnGrp) btnGrp.classList.add('active');
    renderGroupsJournalTab();
  } else {
    if (dbSection) dbSection.style.display = 'block';
    if (grpSection) grpSection.style.display = 'none';
    if (btnDb) btnDb.classList.add('active');
    if (btnGrp) btnGrp.classList.remove('active');
  }
};

/* AKADEMIK GURUHLAR JURNALINI DINAMIK CHIZISH (GURUHLAR 2-USTUNLI GRID + YAXLIT F.I.SH JADVALI) */
window.renderGroupsJournalTab = function() {
  const container = document.getElementById('groupsJournalContainer');
  if (!container) return;

  const groups = ["26-01", "26-02", "26-03", "26-04", "26-05", "26-06", "26-07"];
  const groupLeaders = {
    "26-01": "Mirzayeva.D",
    "26-02": "Ochilov.D",
    "26-03": "To'rayeva.S",
    "26-04": "Hamdamova.M",
    "26-05": "Rayimova.X",
    "26-06": "Yuldashev.O",
    "26-07": "Asraliyev.A"
  };

  const groupTitles = {
    "26-01": "Farmatsiya ishi",
    "26-02": "Hamshiralik ishi",
    "26-03": "Hamshiralik ishi",
    "26-04": "Hamshiralik ishi",
    "26-05": "Hamshiralik ishi",
    "26-06": "Hamshiralik ishi",
    "26-07": "Hamshiralik ishi"
  };

  // Guruhlar aniq 2 ta ustunli GRID ko'rinishida joylashadi
  let html = `
    <div class="group-journal-toolbar">
      <div class="group-journal-toolbar-title">
        <svg style="width:16px;height:16px;stroke:#0969da;fill:none;stroke-width:2;" viewBox="0 0 24 24"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
        Barcha guruhlar (<strong>${RAW_STUDENTS.length} nafar talaba</strong>)
      </div>
      <div style="display:flex; gap:8px; flex-wrap:wrap;">
        <button type="button" class="btn btn-export"
          style="font-size:12px; padding:6px 18px;"
          onclick="exportAllGroupsMultiSheetExcel()"
          title="Barcha 7 guruh bitta ko'p sahifali Excel faylda">
          <svg style="width:14px;height:14px;fill:none;stroke:currentColor;stroke-width:2;" viewBox="0 0 24 24"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
          Barcha .xlsx
        </button>
        <button type="button" class="btn btn-danger"
          style="font-size:12px; padding:6px 18px;"
          onclick="downloadAllGroupPdfs()"
          title="Barcha 7 guruh PDF jurnallarini yangi tabda ochish">
          <svg style="width:14px;height:14px;fill:none;stroke:currentColor;stroke-width:2;" viewBox="0 0 24 24"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
          Barcha PDF
        </button>
      </div>
    </div>
    <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(480px, 1fr)); gap:20px;">`;

  groups.forEach(function(g) {
    const gStudents = RAW_STUDENTS.filter(function(st) { return (st.group || '') === g; });
    gStudents.sort(function(a, b) { return (a.ism || '').localeCompare(b.ism || '', 'uz'); });

    const isFarmat = (g === '26-01');
    const badgeBg = isFarmat ? '#059669' : '#2563eb';
    const leaderName = groupLeaders[g] || '—';

    html += `
      <div class="group-grid-card">
        
        <!-- Guruh Card Header (flat, minimalist) -->
        <div class="group-card-header">
          <div>
            <div style="display:flex; align-items:center; gap:8px;">
              <span style="background:${badgeBg}; color:#fff; font-weight:600; font-size:12px; padding:2px 9px; border-radius:5px; letter-spacing:0.2px;">Guruh ${g}</span>
              <h3 style="font-size:13.5px; font-weight:600; margin:0; color:#e2e8f0;">${groupTitles[g]}</h3>
            </div>
            <p style="font-size:11.5px; color:#94a3b8; margin-top:3px; display:flex; align-items:center; gap:5px;">
              ${ICONS.user} Guruh rahbari: <strong style="color:#60a5fa;">${leaderName}</strong> &nbsp;&bull;&nbsp; Jami: <strong style="color:#fff;">${gStudents.length} nafar</strong>
            </p>
          </div>
          <div style="display:flex; gap:6px; align-items:center;">
            <button type="button" class="btn btn-danger" style="padding:4px 14px; font-size:11.5px;" onclick="openGroupPdf('${g}')" title="Guruh jurnalini toza A4 PDF formatda ochish">
              <svg style="width:13px;height:13px;" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline></svg> PDF
            </button>
            <button type="button" class="btn btn-export" style="padding:4px 14px; font-size:11.5px;" onclick="exportSingleGroupExcel('${g}')" title="Excel (.xlsx) formatda yuklab olish">
              <svg style="width:13px;height:13px;fill:none;stroke:currentColor;stroke-width:2;" viewBox="0 0 24 24"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg> .xlsx
            </button>
          </div>
        </div>

        <!-- Talabalar Jadvali: T/R, F.I.SH va Tug'ilgan Sana (aniq chiziqli grid jadval) -->
        <div style="width:100%; overflow:hidden;">
          <table class="group-journal-table">
            <thead>
              <tr>
                <th style="width:40px; text-align:center;">T/R</th>
                <th>F.I.SH (Talaba Ism Sharif)</th>
                <th style="width:120px; text-align:center;">Tug'ilgan Sana</th>
              </tr>
            </thead>
            <tbody>
    `;

    if (gStudents.length === 0) {
      html += `<tr><td colspan="3" style="text-align:center; padding:18px; color:#94a3b8; font-weight:600;">Ushbu guruhda talabalar mavjud emas</td></tr>`;
    } else {
      gStudents.forEach(function(st, idx) {
        const fullFish = st.fish || `${st.ism} ${st.ota}`.trim();
        
        html += `
          <tr class="group-journal-row" onclick="openStudentByRow(${st.row})">
            <td style="text-align:center; font-weight:700; font-size:11.5px;">${idx + 1}</td>
            <td class="td-st-name" title="${fullFish}">
              ${fullFish}
            </td>
            <td class="td-st-dob" style="text-align:center; font-size:12px;">
              ${st.dob || '—'}
            </td>
          </tr>
        `;
      });
    }

    html += `
            </tbody>
          </table>
        </div>

      </div>
    `;
  });

  const unassignedStudents = RAW_STUDENTS.filter(function(st) { return !st.group || !groups.includes(st.group); });
  if (unassignedStudents.length > 0) {
    unassignedStudents.sort(function(a, b) { return (a.ism || '').localeCompare(b.ism || '', 'uz'); });
    html += `
      <div class="group-grid-card group-grid-card-n">
        <div class="group-card-header" style="background:#78350f;">
          <div>
            <div style="display:flex; align-items:center; gap:8px;">
              <span style="background:#d97706; color:#fff; font-weight:800; font-size:12.5px; padding:3px 9px; border-radius:6px;">N-Guruh</span>
              <h3 style="font-size:14.5px; font-weight:800; margin:0; letter-spacing:-0.2px; color:#fff;">N-Guruh (Taqsimlanmagan / Noma'lumlar)</h3>
            </div>
            <p style="font-size:11.5px; color:#fef08a; margin-top:3px; display:flex; align-items:center; gap:5px;">
              ${ICONS.infoSm} Holati: <strong>Guruh tayinlanishi kutilmoqda</strong> &nbsp;&bull;&nbsp; Jami: <strong style="color:#fff;">${unassignedStudents.length} nafar</strong>
            </p>
          </div>
          <button type="button" class="btn btn-export" style="padding:4px 14px; font-size:11.5px; background:#d97706; border-color:#b45309;" onclick="exportSingleGroupExcel('N')">
            <svg class="svg-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg> .xlsx
          </button>
        </div>
        <div style="width:100%; overflow:hidden;">
          <table class="group-journal-table group-journal-table-n">
            <thead>
              <tr>
                <th style="width:40px; text-align:center;">T/R</th>
                <th>F.I.SH (Talaba Ism Sharif)</th>
                <th style="width:120px; text-align:center;">Tug'ilgan Sana</th>
              </tr>
            </thead>
            <tbody>
    `;
    unassignedStudents.forEach(function(st, idx) {
      const fullFish = st.fish || `${st.ism} ${st.ota}`.trim();
      html += `
        <tr class="group-journal-row" onclick="openStudentByRow(${st.row})">
          <td style="text-align:center; font-weight:700; font-size:11.5px;">${idx + 1}</td>
          <td class="td-st-name" title="${fullFish}">
            ${fullFish}
          </td>
          <td class="td-st-dob" style="text-align:center; font-size:12px;">
            ${st.dob || '—'}
          </td>
        </tr>
      `;
    });
    html += `
            </tbody>
          </table>
        </div>
      </div>
    `;
  }

  html += `</div></div>`; /* inner grid + outer wrapper */
  container.innerHTML = html;
};

/* BARCHA 7 TA GURUH JURNALINI 1 TA YAGONA PDF HUJJATDA OCHISH (HAR BIR GURUH ALOHIDA VAROQDA) */
window.downloadAllGroupPdfs = function() {
  showToast('Barcha 7 ta guruh jurnali bitta PDF hujjatda ochilmoqda...', 'success');
  window.open('pdf_jurnallar/Barcha_Guruhlar_Jurnali.pdf', '_blank');
};

/* GURUH JURNALINI TOZA PDF BO'LIB OCHISH (YUKLAB OLMASDAN, BRAUZERDA BEVOSITA KO'RISH VA CHOP ETISH) */
window.openGroupPdf = function(groupCode) {
  showToast("Guruh " + groupCode + " ning toza PDF jurnali ochilmoqda...", "success");
  const pdfUrl = 'pdf_jurnallar/Guruh_' + encodeURIComponent(groupCode) + '.pdf';
  window.open(pdfUrl, '_blank');
};

window.openStudentByRow = function(rowNum) {
  const idx = RAW_STUDENTS.findIndex(function(s) { return s.row === rowNum; });
  if (idx !== -1) openStudentModal(idx);
};

/* =========================================================================
   CHIROYLI EXCEL YARATISH HELPER (14pt font, rangli header, alternating rows)
   ========================================================================= */
window._buildStyledSheet = function(students) {
  var COLS = [
    { header: 'T/R',             key: '__tr',   wch: 5  },
    { header: 'Guruh',           key: 'group',  wch: 8  },
    { header: 'Shartnoma #',     key: 'shnum',  wch: 11 },
    { header: "F.I.SH (Talaba)", key: '__fish', wch: 32 },
    { header: 'Pasport',         key: 'pv',     wch: 12 },
    { header: 'JSHSHIR',         key: 'pinfl',  wch: 16 },
    { header: "Tug'ilgan sana",  key: 'dob',    wch: 14 },
    { header: 'Hujjat raqami',   key: 'sh_doc', wch: 13 },
    { header: 'Muassasa',        key: 'mak',    wch: 36 },
    { header: 'Bitirgan yili',   key: 'yil',    wch: 13 },
    { header: "Yo'nalish",       key: 'yon',    wch: 18 },
    { header: 'Telefon',         key: 'tel',    wch: 14 },
    { header: 'Holati',          key: '__ver',  wch: 13 }
  ];

  /* ---- Stillar (14pt font, to'liq aniq chiziqlar) ---- */
  var borderGrid = {
    top:    { style: 'thin', color: { rgb: '94A3B8' } },
    bottom: { style: 'thin', color: { rgb: '94A3B8' } },
    left:   { style: 'thin', color: { rgb: '94A3B8' } },
    right:  { style: 'thin', color: { rgb: '94A3B8' } }
  };
  var hSt = {
    font: { bold: true, sz: 14, color: { rgb: 'FFFFFF' }, name: 'Calibri' },
    fill: { fgColor: { rgb: '0F172A' }, patternType: 'solid' },
    alignment: { horizontal: 'center', vertical: 'center', wrapText: false },
    border: {
      top:    { style: 'medium', color: { rgb: '334155' } },
      bottom: { style: 'medium', color: { rgb: '334155' } },
      left:   { style: 'thin', color: { rgb: '334155' } },
      right:  { style: 'thin', color: { rgb: '334155' } }
    }
  };
  var dSt = function(alt, bold) { return {
    font: { sz: 14, name: 'Calibri', bold: !!bold, color: { rgb: '0F172A' } },
    fill: { fgColor: { rgb: alt ? 'F1F5F9' : 'FFFFFF' }, patternType: 'solid' },
    alignment: { vertical: 'center', wrapText: false },
    border: borderGrid
  }; };
  var trSt = function(alt) { return {
    font: { sz: 14, name: 'Calibri', color: { rgb: '475569' }, bold: true },
    fill: { fgColor: { rgb: alt ? 'F1F5F9' : 'FFFFFF' }, patternType: 'solid' },
    alignment: { horizontal: 'center', vertical: 'center' },
    border: borderGrid
  }; };

  /* ---- Ma'lumotlardan sheet yaratish ---- */
  var aoa = [COLS.map(function(c) { return c.header; })];
  students.forEach(function(st, i) {
    var fish = st.fish || ((st.ism || '') + ' ' + (st.ota || '')).trim();
    aoa.push([
      i + 1,
      st.group  || '',
      st.shnum  || '',
      fish,
      st.pv     || '',
      st.pinfl  || '',
      st.dob    || '',
      st.sh_doc || '',
      st.mak    || '',
      st.yil    || '',
      st.yon    || '',
      st.tel    || '',
      st.verified || 'KUTILMOQDA'
    ]);
  });

  var ws = XLSX.utils.aoa_to_sheet(aoa);

  /* ---- Har bir katakka stil qo'shish ---- */
  var range = XLSX.utils.decode_range(ws['!ref'] || 'A1');
  for (var R = range.s.r; R <= range.e.r; R++) {
    for (var C = range.s.c; C <= range.e.c; C++) {
      var addr = XLSX.utils.encode_cell({ r: R, c: C });
      if (!ws[addr]) continue;
      var alt = R % 2 === 0;
      if (R === 0) {
        ws[addr].s = hSt;
      } else if (C === 0) {
        ws[addr].s = trSt(alt); /* T/R */
      } else if (C === 3) {
        ws[addr].s = dSt(alt, true); /* FISH - bold */
      } else {
        ws[addr].s = dSt(alt, false);
      }
    }
  }

  /* ---- Ustun kengliklari ---- */
  ws['!cols'] = COLS.map(function(c) { return { wch: c.wch }; });

  /* ---- Qator balandliklari ---- */
  var rows = [{ hpt: 26 }]; /* header */
  for (var i = 0; i < students.length; i++) rows.push({ hpt: 22 });
  ws['!rows'] = rows;

  /* ---- Muzlatish (freeze) va avtofil'tr ---- */
  ws['!freeze'] = { xSplit: 0, ySplit: 1 };
  ws['!autofilter'] = { ref: 'A1:M1' };

  return ws;
};

/* 1 TA ALOHIDA GURUHNI FORMATLANGAN EXCEL QILIB YUKLASH */
window.exportSingleGroupExcel = function(groupName) {
  var isRemote = (window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1');
  if (isRemote && typeof XLSX !== 'undefined') {
    var gStudents = RAW_STUDENTS.filter(function(st) { return (st.group || '') === groupName; });
    gStudents.sort(function(a, b) { return (a.ism || '').localeCompare(b.ism || '', 'uz'); });
    var ws = window._buildStyledSheet(gStudents);
    var wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Guruh ' + groupName);
    XLSX.writeFile(wb, 'Guruh_' + groupName + '_Talabalar_Royxati.xlsx', { cellStyles: true, bookSST: false });
    showToast('Guruh ' + groupName + ' Excel yuklab olindi!', 'success');
    return;
  }
  var apiHost = (window.location.protocol === 'http:' || window.location.protocol === 'https:') ? '' : 'http://localhost:8080';
  window.location.href = apiHost + '/api/export_group_excel?group=' + encodeURIComponent(groupName);
  showToast('Guruh ' + groupName + ' ning rasmiy sarlavhali jurnali yuklanmoqda...', 'success');
};

/* GURUH JURNALINI PDF / PRINT UCHUN OCHISH — TOZA A4, BO'SH SAHIFA YO'Q */
window.printGroupJournal = function(groupCode) {
  const groupLeaders = {
    "26-01": "Mirzayeva.D", "26-02": "Ochilov.D", "26-03": "To'rayeva.S",
    "26-04": "Hamdamova.M", "26-05": "Rayimova.X", "26-06": "Yuldashev.O", "26-07": "Asraliyev.A"
  };

  const gStudents = RAW_STUDENTS.filter(function(st) { return (st.group || '') === groupCode; });
  gStudents.sort(function(a, b) { return (a.ism || '').localeCompare(b.ism || '', 'uz'); });

  const leader = groupLeaders[groupCode] || '—';
  const title = "2026-2027 O\u02BCquv Yili  |  " + groupCode + "  -  Guruh Talabalari Ro\u02BCyxati";

  let rows = '';
  gStudents.forEach(function(st, idx) {
    const fio = st.fish || ((st.ism || '') + ' ' + (st.ota || '')).trim();
    const dob = st.dob || '\u2014';
    const bg = idx % 2 === 0 ? '#ffffff' : '#f0f4f8';
    rows += '<tr style="background:' + bg + ';">' +
      '<td class="tc">' + (idx + 1) + '</td>' +
      '<td class="tl">' + fio + '</td>' +
      '<td class="tc">' + dob + '</td>' +
      '</tr>';
  });

  const html = [
    '<!DOCTYPE html>',
    '<html lang="uz">',
    '<head>',
    '<meta charset="UTF-8">',
    '<title>' + groupCode + ' Guruh Jurnali</title>',
    '<style>',
    /* Reset */
    '*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }',
    'html, body { width: 100%; height: auto; background: #fff; }',
    'body { font-family: Cambria, "Times New Roman", serif; font-size: 11pt; color: #000; }',

    /* Page setup — minimal margins, no extra space */
    '@page {',
    '  size: A4 portrait;',
    '  margin: 12mm 10mm 10mm 10mm;',
    '}',

    /* Wrapper — exact content width, no min-height */
    '.wrap { display: block; width: 100%; }',

    /* Title */
    '.title {',
    '  font-size: 13pt; font-weight: 800; text-align: center;',
    '  text-transform: uppercase; letter-spacing: 0.4px;',
    '  padding: 0 0 3pt 0; border-bottom: 2pt solid #000;',
    '  margin-bottom: 4pt;',
    '}',
    '.sub {',
    '  font-size: 9.5pt; text-align: center; color: #444;',
    '  margin-bottom: 8pt;',
    '}',

    /* Table */
    'table {',
    '  width: 100%; border-collapse: collapse;',
    '  table-layout: fixed; font-size: 10.5pt;',
    '}',
    'col.c1 { width: 28pt; }',
    'col.c2 { width: auto; }',
    'col.c3 { width: 68pt; }',
    'thead tr {',
    '  background: #1e293b; color: #fff;',
    '}',
    'thead th {',
    '  border: 1pt solid #000; padding: 3pt 4pt;',
    '  font-size: 9.5pt; font-weight: 700;',
    '  text-transform: uppercase; letter-spacing: 0.3px;',
    '}',
    'tbody tr { page-break-inside: avoid; }',
    'td {',
    '  border: 0.5pt solid #94a3b8; padding: 2.5pt 4pt;',
    '  vertical-align: middle;',
    '}',
    '.tc { text-align: center; }',
    '.tl { text-align: left; }',
    'tbody tr:last-child td { border-bottom: 1pt solid #000; }',

    /* Footer */
    '.footer {',
    '  margin-top: 6pt; font-size: 8pt;',
    '  color: #64748b; text-align: center;',
    '  border-top: 0.5pt solid #cbd5e1; padding-top: 4pt;',
    '}',

    /* Print — hide everything except .wrap */
    '@media print {',
    '  html, body { height: auto !important; overflow: visible !important; }',
    '  .wrap { page-break-after: avoid; }',
    '  tbody tr:last-child { page-break-after: avoid; }',
    '}',
    '</style>',
    '</head>',
    '<body>',
    '<div class="wrap">',
    '  <div class="title">' + title + '</div>',
    '  <div class="sub">',
    '    Guruh rahbari: <strong>' + leader + '</strong>',
    '    &nbsp;&bull;&nbsp; Jami: <strong>' + gStudents.length + ' nafar</strong>',
    '  </div>',
    '  <table>',
    '    <colgroup><col class="c1"><col class="c2"><col class="c3"></colgroup>',
    '    <thead>',
    '      <tr>',
    '        <th class="tc">T/R</th>',
    '        <th class="tl">Talabaning Toʻliq F.I.SH</th>',
    '        <th class="tc">Tugʻilgan Sana</th>',
    '      </tr>',
    '    </thead>',
    '    <tbody>' + rows + '</tbody>',
    '  </table>',
    '</div>',
    '<script>',
    '(function() {',
    '  function doPrint() { window.focus(); window.print(); }',
    '  if (document.readyState === "complete") { doPrint(); }',
    '  else { window.addEventListener("load", doPrint); }',
    '})();',
    '<\/script>',
    '</body></html>'
  ].join('\n');

  const win = window.open('', '_blank');
  if (win) {
    win.document.open();
    win.document.write(html);
    win.document.close();
  } else {
    showToast("Yangi oyna bloklangan. Brauzer sozlamalarida popup ruxsat bering.", "error");
  }
};

/* BARCHA GURUHLAR VA JAMI TALABALARNI MULTI-SHEET FORMATLANGAN EXCEL QILIB YUKLASH */
window.exportAllGroupsMultiSheetExcel = function() {
  showToast("Barcha guruhlar chiroyli Excel tayyorlanmoqda...", "success");

  var isRemote = (window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1');

  if (isRemote && typeof XLSX !== 'undefined') {
    var wb = XLSX.utils.book_new();
    var groups = ['26-01','26-02','26-03','26-04','26-05','26-06','26-07'];

    /* 1-sheet: Jami barcha talabalar */
    var wsAll = window._buildStyledSheet(RAW_STUDENTS);
    XLSX.utils.book_append_sheet(wb, wsAll, "Jami talabalar");

    /* Har bir guruh alohida sheet */
    groups.forEach(function(g) {
      var gSt = RAW_STUDENTS.filter(function(s) { return (s.group || '') === g; });
      gSt.sort(function(a, b) { return (a.ism || '').localeCompare(b.ism || '', 'uz'); });
      XLSX.utils.book_append_sheet(wb, window._buildStyledSheet(gSt), "Guruh " + g);
    });

    /* Guruhsizlar (agar bor bo'lsa) */
    var nSt = RAW_STUDENTS.filter(function(s) { return !s.group || s.group === 'N' || s.group === ''; });
    if (nSt.length > 0) XLSX.utils.book_append_sheet(wb, window._buildStyledSheet(nSt), "Guruhsizlar");

    XLSX.writeFile(wb, 'Talabalar_Barcha_Guruhlar_2026-2027.xlsx', { cellStyles: true, bookSST: false });
    showToast("Chiroyli formatlangan 8 sahifali Excel yuklab olindi!", "success");
    return;
  }

  /* Localhost: server API */
  var a = document.createElement('a');
  a.href = '/api/export_all_groups_excel';
  a.download = 'Talabalar_Barcha_Guruhlar_2026-2027.xlsx';
  document.body.appendChild(a); a.click(); a.remove();
  showToast("Barcha guruhlar jurnali yuklanmoqda...", "success");
};

/* GURUHLAR JURNALI: 1-list Jami (Guruhi ustuni), 2-8 listlar har guruh alohida */
window.exportGroupJournal = function() {
  showToast("Guruhlar jurnali tayyorlanmoqda...", "success");

  const isRemote = (window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1');

  // Vercel: SheetJS orqali brauzerda yaratish
  if (isRemote && typeof XLSX !== 'undefined') {
    // exportAllGroupsMultiSheetExcel bilan bir xil mantig
    window.exportAllGroupsMultiSheetExcel();
    return;
  }

  // Localhost: server API
  const a = document.createElement('a');
  a.href = '/api/export_group_journal';
  a.download = 'Talabalar_Guruh_Jurnali_2026-2027.xlsx';
  document.body.appendChild(a);
  a.click();
  a.remove();
  showToast("Guruhlar jurnali yuklanmoqda...", "success");
};

/* TOAST BILDIRISHNOMA */
window.showToast = function(msg, type) {
  let toast = document.getElementById('systemToast');
  if (!toast) {
    toast = document.createElement('div');
    toast.id = 'systemToast';
    toast.style.position = 'fixed';
    toast.style.bottom = '24px';
    toast.style.right = '24px';
    toast.style.zIndex = '999999';
    toast.style.padding = '12px 20px';
    toast.style.borderRadius = '10px';
    toast.style.fontWeight = '700';
    toast.style.fontSize = '13px';
    toast.style.boxShadow = '0 10px 25px -5px rgba(0,0,0,0.3)';
    toast.style.transition = 'all 0.3s ease';
    document.body.appendChild(toast);
  }
  toast.style.background = (type === 'success') ? '#10b981' : '#ef4444';
  toast.style.color = '#fff';
  toast.innerText = msg;
  toast.style.display = 'block';
  toast.style.opacity = '1';
  toast.style.transform = 'translateY(0)';

  setTimeout(function() {
    toast.style.opacity = '0';
    toast.style.transform = 'translateY(10px)';
    setTimeout(function() { toast.style.display = 'none'; }, 300);
  }, 3500);
};

/* EXCEL EKSPORT - TO'LIQ, JADVALLI CHIZIQLI VA RANGLI */
window.exportFilteredToExcel = function() {
  var isRemote = (window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1');
  var groupFilter = (document.getElementById('filterGroup') || {}).value || '';
  var statusFilter = (document.getElementById('filterStatus') || {}).value || '';

  if (isRemote && typeof XLSX !== 'undefined') {
    var students = RAW_STUDENTS.slice();
    if (groupFilter) students = students.filter(function(s) { return (s.group || '') === groupFilter; });
    if (statusFilter) students = students.filter(function(s) { return (s.verified || '') === statusFilter; });
    var ws = window._buildStyledSheet(students);
    var wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Talabalar");
    var fname = groupFilter ? 'Guruh_' + groupFilter + '_Royxati.xlsx' : 'Talabalar_Toliq_Royxati.xlsx';
    XLSX.writeFile(wb, fname, { cellStyles: true, bookSST: false });
    showToast("Chiroyli Excel yuklab olindi (" + students.length + " nafar)!", "success");
    return;
  }

  /* Localhost: server API */
  var gf = (document.getElementById('groupFilter') || {}).value || groupFilter;
  var sf = (document.getElementById('statusFilter') || {}).value || statusFilter;
  showToast("To'liq Excel fayl yuklanmoqda...", "success");
  window.location.href = '/api/export_full_excel?group=' + encodeURIComponent(gf) + '&status=' + encodeURIComponent(sf);
};

/* =========================================================================
   YANGI TALABA QO'SHISH (MODAL, AI O'QISH VA SAQLASH)
   ========================================================================= */

window.openAddStudentModal = function() {
  const m = document.getElementById('addStudentModal');
  if (m) {
    // Formani tozalash
    document.getElementById('newDocFileInput').value = '';
    const labelSpan = document.getElementById('selectedFileName');
    if (labelSpan) {
      labelSpan.innerText = 'Word (.docx) yoki rasm tanlang...';
      labelSpan.style.color = '';
      labelSpan.style.fontWeight = '';
    }
    document.getElementById('newDocStatus').style.display = 'none';
    document.getElementById('add_ism').value = '';
    document.getElementById('add_ota').value = '';
    document.getElementById('add_shnum').value = '';
    document.getElementById('add_pv').value = '';
    document.getElementById('add_pinfl').value = '';
    document.getElementById('add_dob').value = '';
    document.getElementById('add_ber').value = '';
    document.getElementById('add_tel').value = '';
    document.getElementById('add_doctur').value = 'Shahodatnoma';
    document.getElementById('add_shdoc').value = '';
    document.getElementById('add_mak').value = '';
    document.getElementById('add_yil').value = '2024';
    document.getElementById('add_yon').value = 'Hamshiralik ishi - 3 yillik';
    document.getElementById('add_docfile').value = '';
    
    m.style.display = 'flex';
  }
};

window.closeAddStudentModal = function() {
  const m = document.getElementById('addStudentModal');
  if (m) m.style.display = 'none';
};

window.closeAddModalOnBackdrop = function(e) {
  if (e.target.id === 'addStudentModal') window.closeAddStudentModal();
};

/* YUKLANGAN WORD/RASMNI AI ORQALI O'QISH */
window.analyzeUploadedNewDoc = function(usePro = false) {
  const fileInput = document.getElementById('newDocFileInput');
  if (!fileInput || !fileInput.files || fileInput.files.length === 0) {
    alert("Iltimos, avval Word (.docx) yoki rasm faylini tanlang!");
    return;
  }

  const file = fileInput.files[0];
  const statusBox = document.getElementById('newDocStatus');
  const btnPro = document.getElementById('btnAnalyzeNewDocPro');
  const btnNormal = document.getElementById('btnAnalyzeNewDoc');

  if (btnPro) {
    btnPro.disabled = true;
    btnPro.style.opacity = '0.7';
    if (usePro) btnPro.innerHTML = 'QR & AI Pro tahlil qilmoqda...';
  }
  if (btnNormal) {
    btnNormal.disabled = true;
    btnNormal.style.opacity = '0.7';
    if (!usePro) btnNormal.innerHTML = 'AI tahlil qilmoqda...';
  }

  if (statusBox) {
    statusBox.style.display = 'block';
    statusBox.style.background = '#eff6ff';
    statusBox.style.color = '#1d4ed8';
    statusBox.style.border = '1px solid #bfdbfe';
    if (usePro) {
      statusBox.innerHTML = '<strong>QR-kodlar (e-shahodatnoma & ID-karta)</strong> tekshirilmoqda hamda eng yuqori aniqlikdagi <strong>Gemini 2.5 Pro</strong> modeli orqali sinchiklab o\'qilmoqda...';
    } else {
      statusBox.innerHTML = 'Fayl ichidagi pasport/ID va shahodatnoma AI orqali o\'qilmoqda...';
    }
  }

  const reader = new FileReader();
  reader.onload = function(e) {
    const isRemoteHost = (window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1');

    if (isRemoteHost) {
      if (btnPro) {
        btnPro.disabled = false;
        btnPro.style.opacity = '1';
        btnPro.innerHTML = '<svg class="svg-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"></polygon></svg> QR & AI Pro Bilan Tekshirish';
      }
      if (btnNormal) {
        btnNormal.disabled = false;
        btnNormal.style.opacity = '1';
        btnNormal.innerHTML = '<svg class="svg-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg> Oddiy AI';
      }
      if (statusBox) {
        statusBox.style.display = 'block';
        statusBox.style.background = '#fef3c7';
        statusBox.style.color = '#92400e';
        statusBox.style.border = '1px solid #fcd34d';
        statusBox.innerHTML = '<strong>Eslatma:</strong> AI tahlil API kaliti o\'chirilgan yoki serverga ulanmagan. Iltimos, ma\'lumotlarni quyidagi maydonlarga qo\'lda kiriting (Faqat Ism-Familiya, Sharif va Guruh majburiy).';
      }
      document.getElementById('add_docfile').value = file.name;
      return;
    }

    const b64 = e.target.result.split(',')[1];
    const apiHost = 'http://localhost:8080';

    fetch(apiHost + '/api/analyze_docx', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        filename: file.name,
        file_base64: b64,
        model: usePro ? 'pro' : 'flash',
        use_pro: usePro
      })
    })
    .then(function(r) {
      if (!r.ok) {
        throw new Error("AI server javob bermadi (kod: " + r.status + "). Iltimos, ma'lumotlarni qo'lda kiriting.");
      }
      return r.json();
    })
    .then(function(res) {
      if (btnPro) {
        btnPro.disabled = false;
        btnPro.style.opacity = '1';
        btnPro.innerHTML = '<svg class="svg-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"></polygon></svg> QR & AI Pro Bilan Tekshirish';
      }
      if (btnNormal) {
        btnNormal.disabled = false;
        btnNormal.style.opacity = '1';
        btnNormal.innerHTML = '<svg class="svg-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg> Oddiy AI';
      }

      if (res && res.success !== false) {
        if (statusBox) {
          statusBox.style.background = '#dcfce7';
          statusBox.style.color = '#15803d';
          statusBox.style.border = '1px solid #86efac';
          let qrNotice = res.sh_qr ? ' (QR-kod orqali 100% rasmiy tasdiqlandi)' : '';
          statusBox.innerHTML = `Hujjatlar muvaffaqiyatli va aniq o'qildi${qrNotice}! Ma'lumotlarni tekshiring va "Bazaga Qo'shish" tugmasini bosing.`;
        }

        // Formaga to'ldirish
        if (res.ism) document.getElementById('add_ism').value = res.ism;
        if (res.ota) document.getElementById('add_ota').value = res.ota;
        if (res.shnum) document.getElementById('add_shnum').value = res.shnum;
        if (res.pass_val) document.getElementById('add_pv').value = res.pass_val;
        if (res.pinfl) document.getElementById('add_pinfl').value = res.pinfl;
        if (res.dob) document.getElementById('add_dob').value = res.dob;
        
        // FAQAT Pasport Berilgan Sanasi (Shahodatnoma sanasi EMAS!)
        if (res.ber_sana) document.getElementById('add_ber').value = res.ber_sana;
        
        if (res.cert_tur) document.getElementById('add_doctur').value = res.cert_tur;
        if (res.cert_val) document.getElementById('add_shdoc').value = res.cert_val;
        if (res.maktab) document.getElementById('add_mak').value = res.maktab;
        if (res.yil) document.getElementById('add_yil').value = res.yil;
        if (res.yonalis) document.getElementById('add_yon').value = res.yonalis;
        document.getElementById('add_docfile').value = file.name;

      } else {
        if (statusBox) {
          statusBox.style.background = '#fee2e2';
          statusBox.style.color = '#991b1b';
          statusBox.style.border = '1px solid #f87171';
          statusBox.innerHTML = 'Xatolik: ' + (res.error || 'Faylni o\'qib bo\'lmadi');
        }
      }
    })
    .catch(function(err) {
      if (btnPro) {
        btnPro.disabled = false;
        btnPro.style.opacity = '1';
        btnPro.innerHTML = '<svg class="svg-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"></polygon></svg> QR & AI Pro Bilan Tekshirish';
      }
      if (btnNormal) {
        btnNormal.disabled = false;
        btnNormal.style.opacity = '1';
        btnNormal.innerHTML = '<svg class="svg-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg> Oddiy AI';
      }
      if (statusBox) {
        statusBox.style.background = '#fee2e2';
        statusBox.style.color = '#991b1b';
        statusBox.style.border = '1px solid #f87171';
        statusBox.innerHTML = 'Server bilan ulanishda xatolik: ' + err;
      }
    });
  };
  reader.readAsDataURL(file);
};

// Yangi qo'shilgan talabalarni darhol DOMga kiritish (Optimistik yangilash)
window.savePendingStudentToStorage = function(s) {
  try {
    let list = JSON.parse(localStorage.getItem('student_pending_students') || '[]');
    if (!Array.isArray(list)) list = [];
    const exists = list.some(function(item) {
      return (item.pinfl && s.pinfl && item.pinfl.toString().trim() === s.pinfl.toString().trim()) ||
             (item.fish && s.fish && item.fish.trim().toLowerCase() === s.fish.trim().toLowerCase() && (item.group || '') === (s.group || ''));
    });
    if (!exists) {
      list.push(s);
      localStorage.setItem('student_pending_students', JSON.stringify(list));
    }
  } catch(e) {}
};

window.reconcilePendingStudents = function() {
  if (typeof RAW_STUDENTS === 'undefined' || !Array.isArray(RAW_STUDENTS)) return;
  try {
    let list = JSON.parse(localStorage.getItem('student_pending_students') || '[]');
    if (!list || !list.length) return;
    const remaining = [];
    list.forEach(function(st) {
      const alreadyInRaw = RAW_STUDENTS.some(function(item) {
        const pinflMatch = (item.pinfl && st.pinfl && item.pinfl.toString().trim() === st.pinfl.toString().trim());
        const nameMatch = (item.fish && st.fish && item.fish.trim().toLowerCase() === st.fish.trim().toLowerCase() && (item.group || '') === (st.group || ''));
        return pinflMatch || nameMatch;
      });
      if (!alreadyInRaw) {
        window.insertStudentToDOM(st);
        remaining.push(st);
      }
    });
    localStorage.setItem('student_pending_students', JSON.stringify(remaining));
  } catch(e) {
    console.error("Reconcile pending students error:", e);
  }
};

window.insertStudentToDOM = function(s) {
  if (typeof RAW_STUDENTS === 'undefined') window.RAW_STUDENTS = [];

  let existingIdx = -1;
  for (let i = 0; i < RAW_STUDENTS.length; i++) {
    const item = RAW_STUDENTS[i];
    if (item.pinfl && s.pinfl && item.pinfl.toString().trim() === s.pinfl.toString().trim()) {
      existingIdx = i;
      break;
    }
    if (item.fish && s.fish && item.fish.trim().toLowerCase() === s.fish.trim().toLowerCase() && (item.group || '') === (s.group || '')) {
      existingIdx = i;
      break;
    }
  }

  let sIdx;
  if (existingIdx !== -1) {
    sIdx = existingIdx;
    RAW_STUDENTS[sIdx] = Object.assign(RAW_STUDENTS[sIdx], s);
  } else {
    RAW_STUDENTS.push(s);
    sIdx = RAW_STUDENTS.length - 1;
  }

  const trNum = sIdx + 1;
  const grpName = s.group || '—';
  const grpClean = (grpName || '').replace(/[^a-zA-Z0-9]/g, '').toLowerCase();
  const grpClass = 'grp-' + (grpClean || 'n');
  const cleanFish = s.fish || (s.ism + ' ' + (s.ota || '')).trim();

  // 1. Table tbody
  const tbody = document.getElementById('studentsTbody');
  if (tbody) {
    let tr = document.getElementById('student-row-' + sIdx);
    if (!tr) {
      tr = document.createElement('tr');
      tr.id = 'student-row-' + sIdx;
      tr.className = 'student-row';
      tbody.appendChild(tr);
    }
    tr.setAttribute('data-shnum', (s.shnum || '').toLowerCase());
    tr.setAttribute('data-name', cleanFish.toLowerCase());
    tr.setAttribute('data-group', (s.group || '').toLowerCase());
    tr.setAttribute('data-pass', (s.pv || '').toLowerCase());
    tr.setAttribute('data-passtype', s.pass_type || 'Biometrik Pasport');
    tr.setAttribute('data-pinfl', s.pinfl || '');
    tr.setAttribute('data-dob', (s.dob || '') + ' ' + (s.ber || ''));
    tr.setAttribute('data-doc', (s.sh_doc || '').toLowerCase());
    tr.setAttribute('data-doctype', s.doc_tur || 'Shahodatnoma');
    tr.setAttribute('data-mak', (s.mak || '').toLowerCase());
    tr.setAttribute('data-yil', s.yil || '2024');
    tr.setAttribute('data-yon', (s.yon || '').toLowerCase());
    tr.setAttribute('data-status', s.status || 'chala');
    tr.setAttribute('data-file', (s.doc_file || '').toLowerCase());
    tr.setAttribute('data-verified', (s.verified || 'kutilmoqda').toLowerCase());

    const isVerified = (s.verified === 'TASDIQLANDI');
    const vBtnClass = isVerified ? 'btn-v-mini btn-v-ok' : 'btn-v-mini btn-v-wait';
    const vBtnHtml = isVerified ? (ICONS.checkSm + ' OK') : (ICONS.clockSm + ' Kutilmoqda');

    tr.innerHTML = `
      <td style="text-align:center;font-weight:700;color:#94a3b8;">${trNum}</td>
      <td style="text-align:center;white-space:nowrap;">
        <span class="table-group-badge ${grpClass}">${grpName}</span>
      </td>
      <td style="text-align:center;white-space:nowrap;">
        <span class="shnum-clean" onclick="openStudentModal(${sIdx})" title="Talaba oynasini ochish">#${s.shnum || '—'}</span>
      </td>
      <td style="cursor:pointer;" onclick="openStudentModal(${sIdx})" title="Talaba ma'lumotlarini ko'rish / Fayl biriktirish">
        <div class="student-name">${cleanFish}</div>
      </td>
      <td style="white-space:nowrap;">
        <span class="mono-pass">${s.pv || '—'}</span>
      </td>
      <td style="white-space:nowrap;text-align:center;">
        <span class="mono-pinfl">${s.pinfl || '—'}</span>
      </td>
      <td style="white-space:nowrap;text-align:center;">
        <span class="clean-dob">${s.dob || '—'}</span>
      </td>
      <td style="white-space:nowrap;">
        ${s.sh_doc ? `<span class="mono-doc">${s.sh_doc}</span>` : `<span style="color:#ef4444;font-weight:700;">—</span>`}
      </td>
      <td>
        <div class="cell-school" title="${s.mak || '—'}">${s.mak || '—'}</div>
      </td>
      <td style="text-align:center;font-weight:700;font-size:12px;color:inherit;">${s.yil || '—'}</td>
      <td style="text-align:center;white-space:nowrap;">
        <button type="button" class="btn-file-mini btn-file-has" onclick="openStudentModal(${sIdx})" title="${s.doc_file || 'Hujjat'}">
          ${ICONS.file} docx
        </button>
      </td>
      <td style="text-align:center;white-space:nowrap;">
        <button type="button" class="${vBtnClass}" id="vbtn-row-${sIdx}" onclick="toggleStudentVerification(${sIdx}, ${s.row || (sIdx + 2)})" title="Tasdiqlash holati">
          ${vBtnHtml}
        </button>
      </td>
      <td style="text-align:center;">
        <svg class="svg-status svg-success" viewBox="0 0 24 24" fill="none" stroke="#10b981" stroke-width="2.5"><polyline points="20 6 9 17 4 12"></polyline></svg>
      </td>
    `;
  }

  // 2. Card grid
  const grid = document.getElementById('studentsGrid');
  if (grid) {
    let card = document.getElementById('student-card-' + sIdx);
    if (!card) {
      card = document.createElement('div');
      card.id = 'student-card-' + sIdx;
      card.className = 'student-card';
      grid.appendChild(card);
    }
    card.setAttribute('data-group', (s.group || '').toLowerCase());
    card.innerHTML = `
      <div class="card-header" onclick="toggleStudentCard(this.parentElement)">
        <div class="card-header-left">
          <span class="card-tr-badge">#${trNum}</span>
          <span class="card-group-badge ${grpClass}">${grpName}</span>
          <h4 class="card-student-name">${cleanFish}</h4>
        </div>
        <div class="card-header-right">
          <span class="shnum-clean">#${s.shnum || '—'}</span>
          <span class="c-badge c-badge-full">QO'SHILDI</span>
        </div>
      </div>
      <div class="card-body">
        <div class="card-details-grid">
          <div class="card-box card-box-pass">
            <div class="box-title">SHAXSIY MA'LUMOTLAR</div>
            <div class="pass-info-list">
              <div class="pass-row"><span class="pass-label">Pasport:</span><strong>${s.pv || '—'}</strong></div>
              <div class="pass-row"><span class="pass-label">JSHSHIR:</span><strong>${s.pinfl || '—'}</strong></div>
              <div class="pass-row"><span class="pass-label">Tug'ilgan sana:</span><strong>${s.dob || '—'}</strong></div>
            </div>
          </div>
          <div class="card-box card-box-doc">
            <div class="box-title">TA'LIM HUJJATI</div>
            <div class="doc-info-list">
              <div class="doc-row"><span class="doc-label">Hujjat:</span><strong>${s.sh_doc || '—'}</strong></div>
              <div class="doc-row"><span class="doc-label">Muassasa:</span><strong>${s.mak || '—'}</strong></div>
              <div class="doc-row"><span class="doc-label">Bitirgan yili:</span><strong>${s.yil || '—'}</strong></div>
            </div>
          </div>
        </div>
        <div class="card-footer">
          <div class="card-footer-left">
            <span class="contact-label">Fayl:</span>
            <span class="file-name-pill">${s.doc_file || '—'}</span>
          </div>
          <div class="card-footer-right">
            <button type="button" class="btn-card-action btn-card-update" onclick="openStudentModal(${sIdx}, true)">Tahrirlash</button>
            <button type="button" class="btn-card-action" onclick="openStudentModal(${sIdx}, false)">Rasmlar</button>
          </div>
        </div>
      </div>
    `;
  }

  // 3. Update stats, groups journal, and filter
  if (typeof window.updateGroupsVerificationStats === 'function') {
    window.updateGroupsVerificationStats();
  }
  if (typeof window.renderGroupsJournalTab === 'function') {
    const grpSection = document.getElementById('view_groups_section');
    if (grpSection && grpSection.style.display !== 'none') {
      window.renderGroupsJournalTab();
    }
  }
  if (typeof window.filterRows === 'function') {
    window.filterRows(true);
  }
};

window.saveNewStudentData = function() {
  const ism = document.getElementById('add_ism').value.trim();
  const ota = document.getElementById('add_ota').value.trim();
  const group = document.getElementById('add_group') ? document.getElementById('add_group').value.trim() : '';
  const shnum = document.getElementById('add_shnum').value.trim();
  const pv = document.getElementById('add_pv').value.trim();
  const pinfl = document.getElementById('add_pinfl').value.trim();
  const dob = document.getElementById('add_dob').value.trim();
  const ber = document.getElementById('add_ber').value.trim();
  const doctur = document.getElementById('add_doctur').value.trim();
  const shdoc = document.getElementById('add_shdoc').value.trim();
  const mak = document.getElementById('add_mak').value.trim();
  const yil = document.getElementById('add_yil').value.trim();
  const yon = document.getElementById('add_yon').value.trim();
  const tel = document.getElementById('add_tel').value.trim();
  const docfile = document.getElementById('add_docfile').value.trim();

  // Majburiy maydonlar: Ismi va familiyasi, Otasining ismi, Guruh
  if (!ism) {
    if (typeof showToast === 'function') showToast("Iltimos, talabaning Ism va Familiyasini kiriting!", "error");
    else alert("Iltimos, talabaning Ism va Familiyasini kiriting!");
    document.getElementById('add_ism').focus();
    return;
  }

  if (!ota) {
    if (typeof showToast === 'function') showToast("Iltimos, talabaning Otasining ismini (Sharifini) kiriting!", "error");
    else alert("Iltimos, talabaning Otasining ismini (Sharifini) kiriting!");
    document.getElementById('add_ota').focus();
    return;
  }

  if (!group) {
    if (typeof showToast === 'function') showToast("Iltimos, talabaning Guruhini tanlang!", "error");
    else alert("Iltimos, talabaning Guruhini tanlang!");
    if (document.getElementById('add_group')) document.getElementById('add_group').focus();
    return;
  }

  const fullFish = (ism + ' ' + ota).trim();

  // 1. BIR ZUMDA (0 SONIYADA) EKRANGA VA BAZAGA QO'SHISH (INSTANT OPTIMISTIC UI)
  const newStudent = {
    row: (typeof RAW_STUDENTS !== 'undefined' ? RAW_STUDENTS.length + 2 : 100),
    tr: (typeof RAW_STUDENTS !== 'undefined' ? RAW_STUDENTS.length + 1 : 1),
    shnum: shnum || '—',
    sana: new Date().toLocaleDateString('ru-RU'),
    ism: ism,
    ota: ota,
    fish: fullFish,
    yon: yon || "Hamshiralik ishi - 3 yillik",
    group: group,
    pv: pv,
    pass_type: (pv && pv.toUpperCase().startsWith('A')) ? 'Biometrik Pasport' : 'ID-karta',
    pinfl: pinfl,
    dob: dob,
    ber: ber,
    sh_doc: shdoc,
    sh_qr: '',
    mak: mak,
    doc_tur: doctur || "Shahodatnoma",
    yil: yil || "2024",
    tel: tel,
    doc_file: docfile || (fullFish + ' ' + (shnum || '') + '.docx'),
    status: (pv && pinfl) ? 'full' : 'chala',
    pass_fish: '',
    cert_fish: (shdoc ? 'Mavjud' : ''),
    name_match: '',
    name_flag: '',
    verified: 'KUTILMOQDA'
  };

  // Ekranga darhol kiritish
  window.insertStudentToDOM(newStudent);
  window.savePendingStudentToStorage(newStudent);

  // Modalni darhol yopish
  window.closeAddStudentModal();

  // Formani tozalash
  const formFields = ['add_ism', 'add_ota', 'add_shnum', 'add_pv', 'add_pinfl', 'add_dob', 'add_ber', 'add_shdoc', 'add_mak', 'add_yil', 'add_yon', 'add_tel', 'add_docfile'];
  formFields.forEach(function(fid) {
    const el = document.getElementById(fid);
    if (el) el.value = '';
  });

  // Chiroyli, tezkor bildirishnoma
  if (typeof showToast === 'function') {
    showToast(`✅ ${fullFish} guruh ${group} ga qo'shildi!`, 'success');
  }

  // 2. FONDA SERVER VA GITHUB BILAN BOG'LANIB SAQLAYMIZ (Foydalanuvchi kutib o'tirmaydi)
  const apiHost = (window.location.protocol === 'http:' || window.location.protocol === 'https:') ? '' : 'http://localhost:8080';
  const url = apiHost + '/api/add_new_student?' +
    'ism=' + encodeURIComponent(ism) +
    '&ota=' + encodeURIComponent(ota) +
    '&shnum=' + encodeURIComponent(shnum) +
    '&pv=' + encodeURIComponent(pv) +
    '&pinfl=' + encodeURIComponent(pinfl) +
    '&dob=' + encodeURIComponent(dob) +
    '&ber=' + encodeURIComponent(ber) +
    '&doc_tur=' + encodeURIComponent(doctur) +
    '&sh_doc=' + encodeURIComponent(shdoc) +
    '&mak=' + encodeURIComponent(mak) +
    '&yil=' + encodeURIComponent(yil) +
    '&yon=' + encodeURIComponent(yon) +
    '&tel=' + encodeURIComponent(tel) +
    '&doc_file=' + encodeURIComponent(docfile) +
    '&group=' + encodeURIComponent(group);

  fetch(url)
    .then(function(r) { return r.json(); })
    .then(function(res) {
      if (res.success) {
        if (typeof showToast === 'function') {
          showToast(`☁️ ${fullFish} server bazasiga muvaffaqiyatli saqlandi!`, 'success');
        }
      } else {
        if (typeof showToast === 'function') {
          showToast("⚠️ Serverda saqlashda xatolik: " + (res.error || 'Noma\'lum xato'), 'error');
        }
      }
    })
    .catch(function(err) {
      console.warn("Serverga fon saqlash xatosi:", err);
    });
};

/* =========================================================================
   OPERATOR TASDIG'I (STUDENT VERIFICATION SYSTEM - BULLETPROOF PERSISTENCE)
   ========================================================================= */

// Yordamchi: DOMdagi karta va jadval qatorini yangilash
window.applyVerificationToDOM = function(studentIdx, newStatus) {
  if (studentIdx === undefined || typeof RAW_STUDENTS === 'undefined' || !RAW_STUDENTS[studentIdx]) return;
  const s = RAW_STUDENTS[studentIdx];
  s.verified = newStatus;

  // 1. Qator (table row) elementini yangilash
  const rows = document.querySelectorAll('.student-row');
  const rowEl = rows[studentIdx];
  if (rowEl) {
    rowEl.setAttribute('data-verified', newStatus.toLowerCase());
    const rowBtn = document.getElementById('vbtn-row-' + studentIdx);
    if (rowBtn) {
      if (newStatus === 'TASDIQLANDI') {
        rowBtn.className = 'btn-v-mini btn-v-ok';
        rowBtn.innerHTML = ICONS.checkSm + ' OK';
        rowBtn.title = 'Tasdiqni bekor qilish';
      } else {
        rowBtn.className = 'btn-v-mini btn-v-wait';
        rowBtn.innerHTML = ICONS.clockSm + ' Kutilmoqda';
        rowBtn.title = 'To\'g\'ri deb tasdiqlash';
      }
    }
  }

  // 2. Karta (card) elementini yangilash
  const cards = document.querySelectorAll('.student-card');
  const cardEl = document.getElementById('student-card-' + studentIdx) || cards[studentIdx];
  if (cardEl) {
    cardEl.setAttribute('data-verified', newStatus.toLowerCase());
    
    // YASHIL KARTAGA AYLANTIRISH YOKI BEKOR QILISH
    if (newStatus === 'TASDIQLANDI') {
      cardEl.classList.add('card-verified');
    } else {
      cardEl.classList.remove('card-verified');
    }

    const cardBadge = document.getElementById('vbadge-card-' + studentIdx);
    if (cardBadge) {
      if (newStatus === 'TASDIQLANDI') {
        cardBadge.className = 'c-badge c-badge-verified';
        cardBadge.innerHTML = ICONS.checkSm + 'TASDIQLANDI';
      } else {
        cardBadge.className = 'c-badge c-badge-pending';
        cardBadge.innerHTML = ICONS.clockSm + 'KUTILMOQDA';
      }
    }
    const cardBtn = document.getElementById('vbtn-card-' + studentIdx);
    if (cardBtn) {
      if (newStatus === 'TASDIQLANDI') {
        cardBtn.className = 'btn-verify btn-verified';
        cardBtn.innerHTML = ICONS.checkSm + 'Tasdiqlangan';
        cardBtn.title = 'Tasdiqni bekor qilish';
      } else {
        cardBtn.className = 'btn-verify btn-verify-action';
        cardBtn.innerHTML = ICONS.checkSm + 'Ma\'lumotlar to\'g\'ri';
        cardBtn.title = 'Ma\'lumotlarni to\'g\'ri deb tasdiqlash';
      }
    }
  }
};

window.toggleStudentVerification = function(studentIdx, rowIdx) {
  if (studentIdx === undefined || typeof RAW_STUDENTS === 'undefined' || !RAW_STUDENTS[studentIdx]) return;
  const s = RAW_STUDENTS[studentIdx];
  const current = s.verified || 'KUTILMOQDA';
  const newStatus = (current === 'TASDIQLANDI') ? 'KUTILMOQDA' : 'TASDIQLANDI';

  // 1. DOM va ob'ektni darhol yangilash (0ms)
  window.applyVerificationToDOM(studentIdx, newStatus);

  // 2. localStorage keshga yozish — F5 yoki Ctrl+Shift+R bosilganda kartaning yashilligi mutlaqo o'chib qolmasligi uchun
  let localMap = {};
  try {
    localMap = JSON.parse(localStorage.getItem('student_portal_verified_map') || '{}');
  } catch(e) { localMap = {}; }

  const rowKey = String(s.row || rowIdx);
  localMap[rowKey] = newStatus;
  if (s.shnum) localMap['sh_' + String(s.shnum).trim()] = newStatus;
  if (s.pinfl) localMap['pinfl_' + String(s.pinfl).trim()] = newStatus;
  try {
    localStorage.setItem('student_portal_verified_map', JSON.stringify(localMap));
  } catch(e) {}

  // 3. Guruhlar va umumiy statistika raqamlarini dinamik yangilash
  if (typeof window.updateGroupsVerificationStats === 'function') {
    window.updateGroupsVerificationStats();
  }

  // 4. Serverga yuborish (verifications.json va Excel column 25 ga saqlanadi)
  const apiHost = (window.location.protocol === 'http:' || window.location.protocol === 'https:') ? '' : 'http://localhost:8080';
  const url = apiHost + '/api/verify_student?row=' + (rowIdx || s.row) +
    '&status=' + encodeURIComponent(newStatus) +
    '&shnum=' + encodeURIComponent(s.shnum || '') +
    '&pinfl=' + encodeURIComponent(s.pinfl || '') +
    '&ism=' + encodeURIComponent(s.ism || '');

  if (newStatus === 'TASDIQLANDI') {
    showToast(s.ism + " ma'lumotlari tasdiqlandi (Karta yashil rangga aylandi)!", 'success');
  } else {
    showToast(s.ism + " tasdig'i bekor qilindi (Kutilmoqda)", 'warning');
  }

  fetch(url)
    .then(function(r) { return r.json(); })
    .then(function(res) {
      if (res && !res.success) {
        showToast("Xatolik: " + (res.error || "Tasdiq serverda saqlanmadi"), 'danger');
        // Qaytarish (Rollback)
        window.applyVerificationToDOM(studentIdx, current);
        localMap[rowKey] = current;
        if (s.shnum) localMap['sh_' + String(s.shnum).trim()] = current;
        if (s.pinfl) localMap['pinfl_' + String(s.pinfl).trim()] = current;
        try { localStorage.setItem('student_portal_verified_map', JSON.stringify(localMap)); } catch(e) {}
        if (typeof window.updateGroupsVerificationStats === 'function') {
          window.updateGroupsVerificationStats();
        }
      }
    })
    .catch(function(err) {
      console.warn("Tasdiqlash serverga yuborishda vaqtinchalik ogohlantirish (oflayn/tarmoq):", err);
    });
};

/* =========================================================================
   TASDIQ HOLATLARINI TIKLASH (LOCALSTORAGE VA SERVERDAN SINXRONIZATSIYA)
   ========================================================================= */
window.syncVerificationsState = function() {
  if (typeof RAW_STUDENTS === 'undefined' || !Array.isArray(RAW_STUDENTS)) return;

  // 1-bosqich: localStorage keshidan darhol (0ms da) tiklash — F5 bosilganda ko'z ochib yumguncha
  let localMap = {};
  try {
    localMap = JSON.parse(localStorage.getItem('student_portal_verified_map') || '{}');
  } catch(e) { localMap = {}; }

  let changedAny = false;
  RAW_STUDENTS.forEach(function(s, idx) {
    const rowKey = String(s.row);
    const shKey = s.shnum ? ('sh_' + String(s.shnum).trim()) : null;
    const pinKey = s.pinfl ? ('pinfl_' + String(s.pinfl).trim()) : null;

    const cachedStatus = localMap[rowKey] || (shKey && localMap[shKey]) || (pinKey && localMap[pinKey]);
    if (cachedStatus && cachedStatus !== s.verified) {
      window.applyVerificationToDOM(idx, cachedStatus);
      changedAny = true;
    }
  });

  if (changedAny && typeof window.updateGroupsVerificationStats === 'function') {
    window.updateGroupsVerificationStats();
  }

  // 2-bosqich: Serverdan eng yangi verifikatsiyalarni yuklash va sinxronlash
  const apiHost = (window.location.protocol === 'http:' || window.location.protocol === 'https:') ? '' : 'http://localhost:8080';
  fetch(apiHost + '/api/get_verifications')
    .then(function(r) { return r.json(); })
    .then(function(data) {
      if (!data || !data.verifications) return;
      const vmap = data.verifications;

      // Server ma'lumotlarini localStorage ga yangilab qo'yish
      let updatedLocal = {};
      try {
        updatedLocal = JSON.parse(localStorage.getItem('student_portal_verified_map') || '{}');
      } catch(e) {}
      Object.assign(updatedLocal, vmap);
      try {
        localStorage.setItem('student_portal_verified_map', JSON.stringify(updatedLocal));
      } catch(e) {}

      // Talabalar holatini to'liq sinxronlashtirish
      let serverChanged = false;
      RAW_STUDENTS.forEach(function(s, idx) {
        const rowKey = String(s.row);
        const shKey = s.shnum ? ('sh_' + String(s.shnum).trim()) : null;
        const pinKey = s.pinfl ? ('pinfl_' + String(s.pinfl).trim()) : null;

        const serverStatus = vmap[rowKey] || (shKey && vmap[shKey]) || (pinKey && vmap[pinKey]);
        if (serverStatus && serverStatus !== s.verified) {
          window.applyVerificationToDOM(idx, serverStatus);
          serverChanged = true;
        }
      });

      if (serverChanged && typeof window.updateGroupsVerificationStats === 'function') {
        window.updateGroupsVerificationStats();
      }
    })
    .catch(function(err) {
      // Server mavjud bo'lmasa ham lokal keshdan ishlayveradi
    });
};


/* =========================================================================
   GURUHLAR BO'YICHA TASDIQLASH STATISTIKASINI DINAMIK YANGILASH (REAL-TIME)
   ========================================================================= */
window.updateGroupsVerificationStats = function() {
  if (typeof RAW_STUDENTS === 'undefined') return;

  const groups = ["26-01", "26-02", "26-03", "26-04", "26-05", "26-06", "26-07"];
  let overallVerified = 0;
  let unassignedTotal = 0;
  let unassignedVerified = 0;
  const total = RAW_STUDENTS.length;

  const groupCounts = {};
  const groupVerified = {};
  groups.forEach(function(g) {
    groupCounts[g] = 0;
    groupVerified[g] = 0;
  });

  RAW_STUDENTS.forEach(function(item) {
    const isVer = (item.verified === 'TASDIQLANDI');

    const g = (item.group || '').trim();
    if (groups.includes(g)) {
      groupCounts[g]++;
      if (isVer) { groupVerified[g]++; overallVerified++; }
    } else {
      /* N-Guruh yoki guruhsiz — rasmiy kontingentga kirmaydi */
      unassignedTotal++;
      if (isVer) unassignedVerified++;
    }
  });

  /* officialTotal = faqat 7 ta rasmiy guruh talabalar soni (N-guruhsiz) */
  const officialTotal = total - unassignedTotal;
  const vPctAll = officialTotal > 0 ? Math.round((overallVerified / officialTotal) * 100) : 0;

  // Barcha guruhlar kartasi (All Card) - officialTotal bilan
  const vCountAllEl = document.getElementById('grp-vcount-all');
  if (vCountAllEl) vCountAllEl.innerText = overallVerified;
  const totalAllEl = document.getElementById('grp-total-all');
  if (totalAllEl) totalAllEl.innerText = officialTotal;
  const percentAllEl = document.getElementById('grp-percent-all');
  if (percentAllEl) percentAllEl.innerText = vPctAll + '%';
  const barAllEl = document.getElementById('grp-bar-all');
  if (barAllEl) barAllEl.style.width = vPctAll + '%';

  // 7 ta guruh kartalari va kontingent qatorlari
  groups.forEach(function(g) {
    const gTotal = groupCounts[g];
    const gVer = groupVerified[g];
    const percent = gTotal > 0 ? Math.round((gVer / gTotal) * 100) : 0;

    const vCountEl = document.getElementById('grp-vcount-' + g);
    if (vCountEl) vCountEl.innerText = gVer;

    const totalEl = document.getElementById('grp-total-' + g);
    if (totalEl) totalEl.innerText = gTotal;

    const percentEl = document.getElementById('grp-percent-' + g);
    if (percentEl) percentEl.innerText = percent + '%';

    const barEl = document.getElementById('grp-bar-' + g);
    if (barEl) barEl.style.width = percent + '%';

    const cardEl = document.getElementById('grp-stat-card-' + g);
    if (cardEl) {
      if (gVer === gTotal && gTotal > 0) {
        cardEl.classList.add('grp-stat-completed');
      } else {
        cardEl.classList.remove('grp-stat-completed');
      }
    }

    // Kontingent jadvalidagi soni va tasdiqlash progressi
    const kCountEl = document.getElementById('kontingent-count-' + g);
    if (kCountEl) kCountEl.innerText = gTotal;

    const kVerEl = document.getElementById('kontingent-ver-' + g);
    if (kVerEl) kVerEl.innerText = gVer + '/' + gTotal;

    const kBarEl = document.getElementById('kontingent-bar-' + g);
    if (kBarEl) kBarEl.style.width = percent + '%';

    // O'ng tomondagi guruh ulushi progressi
    const distCountEl = document.getElementById('dist-count-' + g);
    if (distCountEl) distCountEl.innerText = gTotal;

    const distBarEl = document.getElementById('dist-bar-' + g);
    const pctShare = officialTotal > 0 ? (gTotal / officialTotal * 100).toFixed(1) : 0;
    if (distBarEl) distBarEl.style.width = pctShare + '%';
  });

  // N-Guruh qatori kontingent jadvalida DOIM YASHIRILGAN (rasmiy emas)
  const kUnassignedRow = document.getElementById('kontingent-row-unassigned');
  if (kUnassignedRow) kUnassignedRow.style.display = 'none';

  // Kontingent jami soni va tasdiqlash — faqat rasmiy (N-guruhsiz)
  const kJamiEl = document.getElementById('kontingent-count-total');
  if (kJamiEl) kJamiEl.innerText = officialTotal;
  const kJamiVerEl = document.getElementById('kontingent-ver-total');
  if (kJamiVerEl) kJamiVerEl.innerText = overallVerified + ' / ' + officialTotal;

  // Header va Widgetdagi KPI ko'rsatkichlari — rasmiy son
  const kHdrTot = document.getElementById('k-header-total');
  if (kHdrTot) kHdrTot.innerText = officialTotal;
  const kHdrVer = document.getElementById('k-header-verified');
  if (kHdrVer) kHdrVer.innerText = overallVerified;

  const sKpiTot = document.getElementById('s-kpi-total');
  if (sKpiTot) sKpiTot.innerText = officialTotal;
  const sKpiVer = document.getElementById('s-kpi-ver');
  if (sKpiVer) sKpiVer.innerText = overallVerified;

  // Farmatsiya stat kartasi qo'shimcha soni
  const farmatSubEl = document.querySelector('.stat-farmat .stat-sub');
  if (farmatSubEl) {
    farmatSubEl.innerHTML = `Alohida 26-01 guruhi (${groupCounts['26-01']} ta)`;
  }

  // Umumiy statistika
  const pCount = officialTotal - overallVerified;
  const statVal = document.getElementById('statVerifiedVal');
  if (statVal) statVal.innerText = overallVerified + ' / ' + officialTotal;
  const statPVal = document.getElementById('statPendingVal');
  if (statPVal) statPVal.innerText = pCount;
};

/* =========================================================================
   TUNGI REJIM (DARK / LIGHT THEME TOGGLE)
   ========================================================================= */

window.initTheme = function() {
  const saved = localStorage.getItem('app_theme');
  // Standart holatda Dark Mode (tungi rejim) faol bo'ladi
  if (saved === 'light') {
    document.body.classList.remove('dark-mode');
  } else {
    document.body.classList.add('dark-mode');
  }
  updateThemeButton();
};

window.toggleTheme = function() {
  const isDark = document.body.classList.toggle('dark-mode');
  localStorage.setItem('app_theme', isDark ? 'dark' : 'light');
  updateThemeButton();
  showToast(isDark ? "Tungi rejim yoqildi" : "Kunduzgi rejim yoqildi", "success");
};

function updateThemeButton() {
  const btn = document.getElementById('themeToggleBtn');
  if (!btn) return;
  if (document.body.classList.contains('dark-mode')) {
    btn.innerHTML = ICONS.moon + 'Tungi Rejim';
    btn.title = 'Kunduzgi rejimga o\'tish';
  } else {
    btn.innerHTML = ICONS.sun + 'Kunduzgi Rejim';
    btn.title = 'Tungi rejimga o\'tish';
  }
}

/* =========================================================================
   SKROLL TOZALASH (F5 YOKI CTRL+R DA PASTGA SIZIB KETMASLIGI UCHUN)
   ========================================================================= */
try {
  sessionStorage.removeItem('active_student_idx');
  sessionStorage.removeItem('active_student_row');
  sessionStorage.removeItem('report_scroll_y');
} catch(e) {}

/* =========================================================================
   GITHUB AVTO-SINXRONIZATSIYA VA LOADING KONTROLLERI
   ========================================================================= */
window.GitSyncManager = {
  pollTimer: null,
  hideOverlayTimer: null,
  currentStatus: 'synced',

  init: function() {
    this.checkStatus();
    // Har 10 soniyada fonda tekshirib turish
    setInterval(() => {
      if (this.currentStatus === 'synced') {
        this.checkStatus();
      }
    }, 10000);
  },

  notifyChange: function() {
    // Foydalanuvchi biror amal bajarganda darhol ekranda yuklanishni ko'rsatish
    this.updateUI('pending', "GitHub'ga yuklanmoqda...", "O'zgarishlar 2 soniyada GitHub repozitoriyasiga yuboriladi");
    this.startFastPolling();
  },

  startFastPolling: function() {
    if (this.pollTimer) clearInterval(this.pollTimer);
    let attempts = 0;
    this.pollTimer = setInterval(() => {
      attempts++;
      this.checkStatus((status) => {
        if (status === 'synced' || attempts > 30) {
          clearInterval(this.pollTimer);
          this.pollTimer = null;
        }
      });
    }, 1200);
  },

  checkStatus: function(callback) {
    const apiHost = (window.location.protocol === 'http:' || window.location.protocol === 'https:') ? '' : 'http://localhost:8080';
    fetch(apiHost + '/api/git_sync_status?t=' + Date.now())
      .then(res => {
        if (!res.ok) throw new Error('Status HTTP ' + res.status);
        return res.json();
      })
      .then(data => {
        const state = data.state || 'synced';
        const msg = data.message || 'Sinxronlangan';
        const lastSync = data.last_sync ? ` (${data.last_sync})` : '';
        this.currentStatus = state;

        if (state === 'syncing') {
          this.updateUI('syncing', "GitHub'ga yuklanmoqda...", "O'zgarishlar GitHub repozitoriyasiga yuborilmoqda...");
        } else if (state === 'pending') {
          this.updateUI('pending', "GitHub'ga tayyorlanmoqda...", "2-3 soniya ichida yuklash boshlanadi");
        } else if (state === 'error') {
          this.updateUI('error', "GitHub xatosi", data.detail || msg);
        } else {
          this.updateUI('synced', "GitHub: Sinxronlangan" + lastSync, "Barcha ma'lumotlar saqlandi");
        }

        if (typeof callback === 'function') callback(state);
      })
      .catch(err => {
        if (typeof callback === 'function') callback('synced');
      });
  },

  updateUI: function(state, title, subtitle) {
    const badge = document.getElementById('githubSyncBadge');
    const badgeText = document.getElementById('ghSyncText');
    const badgeSpinner = document.getElementById('ghSyncSpinner');

    const overlay = document.getElementById('gitSyncFloatingOverlay');
    const overlaySpinner = document.getElementById('gitOverlaySpinner');
    const overlayIcon = document.getElementById('gitOverlayIcon');
    const overlayTitle = document.getElementById('gitOverlayTitle');
    const overlaySub = document.getElementById('gitOverlaySubtitle');

    if (badge && badgeText) {
      badge.className = 'git-sync-chip status-' + state;
      badgeText.innerText = title;
      if (badgeSpinner) {
        badgeSpinner.style.display = (state === 'syncing' || state === 'pending') ? 'inline-block' : 'none';
      }
    }

    if (overlay && overlayTitle && overlaySub) {
      overlay.className = 'git-sync-floating-overlay ' + state;
      overlayTitle.innerText = title;
      overlaySub.innerText = subtitle;

      if (state === 'syncing' || state === 'pending') {
        if (this.hideOverlayTimer) clearTimeout(this.hideOverlayTimer);
        overlay.classList.add('active');
        if (overlaySpinner) overlaySpinner.style.display = 'block';
        if (overlayIcon) overlayIcon.innerText = '🔄';
      } else if (state === 'synced') {
        if (overlaySpinner) overlaySpinner.style.display = 'none';
        if (overlayIcon) overlayIcon.innerText = '✅';
        overlay.classList.add('active');
        if (this.hideOverlayTimer) clearTimeout(this.hideOverlayTimer);
        this.hideOverlayTimer = setTimeout(() => {
          overlay.classList.remove('active');
        }, 3500);
      } else if (state === 'error') {
        if (overlaySpinner) overlaySpinner.style.display = 'none';
        if (overlayIcon) overlayIcon.innerText = '⚠️';
        overlay.classList.add('active');
        if (this.hideOverlayTimer) clearTimeout(this.hideOverlayTimer);
        this.hideOverlayTimer = setTimeout(() => {
          overlay.classList.remove('active');
        }, 6000);
      }
    }
  }
};

// Global fetch hook: Har qanday o'zgartirish amalga oshirilganda avtomat GitSync bildirishnoma ko'rsatiladi
// Va agar sayt Vercel'da ishlayotgan bo'lsa, so'rovlarni to'g'ridan-to'g'ri GitHub'ga yo'naltiradi
(function() {
  function parseQueryParams(url) {
    const params = {};
    const qIdx = url.indexOf('?');
    if (qIdx >= 0) {
      const query = url.substring(qIdx + 1);
      query.split('&').forEach(part => {
        const kv = part.split('=');
        if (kv.length >= 2) {
          try {
            params[decodeURIComponent(kv[0])] = decodeURIComponent(kv.slice(1).join('='));
          } catch(e) {
            params[kv[0]] = kv.slice(1).join('=');
          }
        }
      });
    }
    return params;
  }

  const originalFetch = window.fetch;
  window.fetch = function(input, init) {
    const url = typeof input === 'string' ? input : (input && input.url ? input.url : '');
    const isRemoteHost = (window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1');

    if (url.includes('/api/update_student') ||
        url.includes('/api/verify_student') ||
        url.includes('/api/delete_student') ||
        url.includes('/api/add_new_student') ||
        url.includes('/api/batch_add_students') ||
        url.includes('/api/update_group')) {
      if (window.GitSyncManager) {
        window.GitSyncManager.notifyChange();
      }
    }

    if (isRemoteHost) {
      if (url.includes('/api/verify_student')) {
        const p = parseQueryParams(url);
        return originalFetch('/api/github_sync', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            type: 'verify_student',
            data: {
              row: parseInt(p.row || '0', 10),
              status: p.status || 'TASDIQLANDI',
              shnum: p.shnum || '',
              pinfl: p.pinfl || ''
            }
          })
        });
      }

      if (url.includes('/api/update_student')) {
        const p = parseQueryParams(url);
        const row = parseInt(p.row || '0', 10);
        delete p.row;
        return originalFetch('/api/github_sync', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            type: 'update_student',
            data: { row: row, fields: p }
          })
        });
      }

      if (url.includes('/api/delete_student')) {
        const p = parseQueryParams(url);
        return originalFetch('/api/github_sync', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            type: 'delete_student',
            data: { row: parseInt(p.row || '0', 10) }
          })
        });
      }

      if (url.includes('/api/update_group')) {
        const p = parseQueryParams(url);
        return originalFetch('/api/github_sync', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            type: 'update_group',
            data: {
              row: parseInt(p.row || '0', 10),
              group: p.group || ''
            }
          })
        });
      }

      if (url.includes('/api/add_new_student')) {
        let bodyData = parseQueryParams(url);
        try {
          if (init && init.body) {
            const parsed = typeof init.body === 'string' ? JSON.parse(init.body) : init.body;
            bodyData = Object.assign(bodyData, parsed);
          }
        } catch(e) {}
        return originalFetch('/api/github_sync', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            type: 'add_student',
            data: bodyData
          })
        });
      }

      if (url.includes('/api/git_sync_status')) {
        return Promise.resolve(new Response(JSON.stringify({
          state: 'synced',
          message: "GitHub bilan bog'langan",
          last_sync: new Date().toLocaleTimeString()
        }), { status: 200, headers: { 'Content-Type': 'application/json' } }));
      }
    }

    return originalFetch.apply(this, arguments);
  };
})();

/* =========================================================================
   PORTAL HOLATINI TIKLASH VA ISHGA TUSHIRISH (F5 BO'LGANDA)
   ========================================================================= */
function initPortalState() {
  if (typeof window.initTheme === 'function') window.initTheme();

  // 0. Yangi qo'shilgan talabalarni tekshirish va tiklash (F5 bo'lganda yo'qolmasligi uchun)
  if (typeof window.reconcilePendingStudents === 'function') {
    window.reconcilePendingStudents();
  }

  // 1. Asosiy rejim (Baza vs Guruhlar jurnali)
  try {
    const savedMainView = localStorage.getItem('student_portal_main_view');
    if (savedMainView === 'groups') {
      window.switchMainView('groups');
    }
  } catch(e) {}

  // 2. Karta vs Jadval ko'rinishi
  try {
    const savedMode = localStorage.getItem('student_portal_display_mode');
    if (savedMode === 'table') {
      window.switchDisplayMode('table');
    }
  } catch(e) {}

  // 3. Guruh va boshqa barcha filtrlarni tiklash (F5 da buzilmasligi uchun!)
  if (typeof window.restoreActiveFilters === 'function') {
    window.restoreActiveFilters();
  }

  // 3.5. Operator tasdiqlagan talabalarni tiklash va server bilan sinxronlash (F5 da saqlanishi uchun)
  if (typeof window.syncVerificationsState === 'function') {
    window.syncVerificationsState();
  }

  // 4. Guruhlar tasdiqlash monitoringi statistikasini yangilash
  if (typeof window.updateGroupsVerificationStats === 'function') {
    window.updateGroupsVerificationStats();
  }

  // 5. GitHub Avto-Sinxronizatsiya statusini ishga tushirish
  if (window.GitSyncManager && typeof window.GitSyncManager.init === 'function') {
    window.GitSyncManager.init();
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initPortalState);
} else {
  initPortalState();
}

