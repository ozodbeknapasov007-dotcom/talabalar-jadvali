
window.handleNewDocFileSelected = function(input) {
  const labelSpan = document.getElementById('selectedFileName');
  if (!labelSpan) return;
  if (input.files && input.files[0]) {
    labelSpan.innerText = input.files[0].name;
    labelSpan.style.color = '#2563eb';
    labelSpan.style.fontWeight = '700';
    if (typeof window.analyzeUploadedNewDoc === 'function') {
      window.analyzeUploadedNewDoc();
    }
  } else {
    labelSpan.innerText = 'Word (.docx) yoki rasm tanlang...';
    labelSpan.style.color = '';
    labelSpan.style.fontWeight = '';
  }
};

window.handleNewDocFileDrop = function(file) {
  if (!file) return;
  const input = document.getElementById('newDocFileInput');
  if (input) {
    try {
      const dt = new DataTransfer();
      dt.items.add(file);
      input.files = dt.files;
    } catch (e) {}
    window.handleNewDocFileSelected(input);
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
window.isEditMode = false;

function isWithdrawnGroup(g) {
  if (!g) return false;
  const gl = String(g).trim().toLowerCase();
  return gl === 'talabalar safidan chiqarilganlar' || gl === 'safdan chiqarilganlar' || gl === 'safdan chiqarilgan' || gl === 'n' || gl.includes('chiqaril');
}
window.isWithdrawnGroup = isWithdrawnGroup;

function navigateStudentModal(dir) {
  if (window.currentStudentIdx === null || typeof RAW_STUDENTS === 'undefined') return;
  let newIdx = window.currentStudentIdx + dir;
  while (newIdx >= 0 && newIdx < RAW_STUDENTS.length && RAW_STUDENTS[newIdx] && RAW_STUDENTS[newIdx]._deleted) {
    newIdx += dir;
  }
  if (newIdx >= 0 && newIdx < RAW_STUDENTS.length && RAW_STUDENTS[newIdx]) {
    window.openStudentModal(newIdx, window.isEditMode);
  }
}
window.navigateStudentModal = navigateStudentModal;

// Modal klaviatura orqali boshqarish (Chapga/O'ngga strelkalar va Esc)
window.addEventListener('keydown', function(e) {
  const lb = document.getElementById('imgLightbox');
  if (lb && lb.style.display !== 'none' && lb.style.display !== '') return;

  const modal = document.getElementById('viewerModal');
  if (!modal || modal.style.display === 'none' || modal.style.display === '') return;

  const activeTag = document.activeElement ? document.activeElement.tagName : '';
  if (activeTag === 'INPUT' || activeTag === 'TEXTAREA' || activeTag === 'SELECT') return;

  if (e.key === 'ArrowLeft') {
    e.preventDefault();
    navigateStudentModal(-1);
  } else if (e.key === 'ArrowRight') {
    e.preventDefault();
    navigateStudentModal(1);
  } else if (e.key === 'Escape') {
    e.preventDefault();
    if (typeof window.closeModal === 'function') window.closeModal();
  }
});

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

/* =========================================================================
   30TANI TEKSHIRISH (tekshiruv.html) USLUBIDAGI JSHSHIR & AYLANMA RASM FUNKSIYALARI
   ========================================================================= */

window.modalImgRotations = {};

window.rotateModalImg = function(imgIdx, deg) {
  const current = window.modalImgRotations[imgIdx] || 0;
  const newDeg = (current + deg) % 360;
  window.modalImgRotations[imgIdx] = newDeg;
  const img = document.getElementById('modalDocImg_' + imgIdx);
  if (img) {
    img.style.transform = `rotate(${newDeg}deg)`;
    if (Math.abs(newDeg) === 90 || Math.abs(newDeg) === 270) {
      img.classList.add('rotated-90');
    } else {
      img.classList.remove('rotated-90');
    }
  }
};

const PINFL_WEIGHTS = [7, 3, 1, 7, 3, 1, 7, 3, 1, 7, 3, 1, 7];
const PINFL_REGIONS = {
  "001": "Toshkent shahri", "002": "Andijon viloyati", "003": "Buxoro viloyati",
  "004": "Jizzax viloyati", "005": "Qashqadaryo viloyati", "006": "Navoiy viloyati",
  "007": "Namangan viloyati", "008": "Samarqand viloyati", "009": "Surxondaryo viloyati",
  "010": "Sirdaryo viloyati", "011": "Toshkent viloyati", "012": "Farg'ona viloyati",
  "013": "Xorazm viloyati", "014": "Qoraqalpog'iston Respublikasi"
};

window.decodePinfl = function(s) {
  if (!s) return null;
  const digits = String(s).replace(/\D/g, '');
  if (digits.length !== 14) return null;

  const F = {
    "1": [1800, "Erkak"], "2": [1800, "Ayol"],
    "3": [1900, "Erkak"], "4": [1900, "Ayol"],
    "5": [2000, "Erkak"], "6": [2000, "Ayol"]
  }[digits[0]];

  const kod = digits.slice(7, 10);
  const joy = PINFL_REGIONS[kod] || ("Hudud kodi: " + kod);
  const dd = digits.slice(1, 3);
  const mm = digits.slice(3, 5);
  const yy = digits.slice(5, 7);
  const sana = F ? `${dd}.${mm}.${F[0] + parseInt(yy, 10)}` : `${dd}.${mm}.20${yy}`;

  const checksum = PINFL_WEIGHTS.reduce((acc, w, i) => acc + w * parseInt(digits[i], 10), 0) % 10;
  const nazoratOk = (checksum === parseInt(digits[13], 10));

  return {
    raw: digits,
    jins: F ? F[1] : "Noma'lum",
    asr: F ? (F[0] + "-yillar") : "Noma'lum",
    sana: sana,
    kod: kod,
    joy: joy,
    tartib: digits.slice(10, 13),
    nazorat: nazoratOk
  };
};

/* =========================================================================
   ASOSIY TALABA OYNASI (MODAL) — 3 BO'LIMLI SEKSIYA USLUBIDA (tekshiruv.html)
   ========================================================================= */

window.openStudentModal = function(studentIdx, startInEditMode = false) {
  if (typeof RAW_STUDENTS === 'undefined') {
    alert("Talaba ma'lumotlari topilmadi: " + studentIdx);
    return;
  }

  // DOM karta/qator bilan indeks mosligini ikki karra tekshiramiz
  let resolvedIdx = studentIdx;
  const domEl = document.getElementById('student-card-' + studentIdx) || document.getElementById('student-row-' + studentIdx);
  if (domEl) {
    const domPinfl = (domEl.getAttribute('data-pinfl') || '').trim();
    const domName = (domEl.getAttribute('data-name') || '').trim().toLowerCase();
    const cur = RAW_STUDENTS[studentIdx];
    const curPinfl = cur ? String(cur.pinfl || '').trim() : '';
    const curName = cur ? String(cur.fish || cur.ism || '').trim().toLowerCase() : '';
    if (!cur || cur._deleted || (domPinfl && curPinfl !== domPinfl) || (domName && curName !== domName)) {
      const matchIdx = RAW_STUDENTS.findIndex(function(item) {
        if (!item || item._deleted) return false;
        const itemPinfl = String(item.pinfl || '').trim();
        const itemName = String(item.fish || item.ism || '').trim().toLowerCase();
        if (domPinfl && itemPinfl && itemPinfl === domPinfl) return true;
        if (domName && itemName && itemName === domName) return true;
        return false;
      });
      if (matchIdx !== -1) resolvedIdx = matchIdx;
    }
  }
  studentIdx = resolvedIdx;

  if (!RAW_STUDENTS[studentIdx]) {
    alert("Talaba ma'lumotlari topilmadi: " + studentIdx);
    return;
  }
  window.currentStudentIdx = studentIdx;
  window.isEditMode = !!startInEditMode;
  window.modalImgRotations = {};
  const s = RAW_STUDENTS[studentIdx];

  const modal = document.getElementById('viewerModal');
  const modalTitle = document.getElementById('modalTitle');
  const modalBody = document.getElementById('modalBody');
  const btnPrev = document.getElementById('btnModalPrev');
  const btnNext = document.getElementById('btnModalNext');

  if (btnPrev) btnPrev.disabled = (studentIdx <= 0);
  if (btnNext) btnNext.disabled = (studentIdx >= RAW_STUDENTS.length - 1);

  if (!modal || !modalTitle || !modalBody) return;

  const docFileName = s.doc_file ? s.doc_file : "Mavjud emas";
  modalTitle.innerHTML = ICONS.user + " <strong>" + s.fish + "</strong> &nbsp;|&nbsp; Shartnoma: #" + (s.shnum || '—');

  let qrBtn = '';
  if (s.sh_qr) {
    qrBtn = `<a href="${s.sh_qr}" target="_blank" class="btn btn-export" style="padding:5px 12px;font-size:11.5px;display:inline-flex;align-items:center;gap:6px;">${ICONS.link} QR PDF</a>`;
  }

  // 3-Bo'limli Asosiy Modal Strukturasi (tekshiruv.html Uslubi)
  modalBody.innerHTML = `
    <!-- Top Bar: Fayl yo'li + Fayl biriktirish + Edit/AI Tugmalari -->
    <div class="modal-top-bar">
      <div style="display:flex;align-items:center;gap:8px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;min-width:0;flex:1;">
        <span style="font-size:12px;font-weight:700;color:#94a3b8;text-transform:uppercase;display:flex;align-items:center;gap:5px;flex-shrink:0;">${ICONS.folder} Fayl:</span>
        <code id="modalFilePath" style="font-size:13px;color:#38bdf8;font-weight:800;background:rgba(56,189,248,0.12);padding:3px 10px;border-radius:6px;border:1px solid rgba(56,189,248,0.3);overflow:hidden;text-overflow:ellipsis;">files/${docFileName}</code>
      </div>
      <div style="display:flex;gap:8px;align-items:center;flex-shrink:0;flex-wrap:wrap;">
        ${qrBtn}
        <!-- Fayl biriktirish / almashtirish inputi -->
        <input type="file" id="attachFileInput" accept=".docx,image/*" style="display:none;" onchange="if(this.files.length) uploadAndAttachForCurrentStudent(this.files[0])">
        <button type="button" class="btn btn-export" style="padding:6px 14px; font-size:12px;" onclick="document.getElementById('attachFileInput').click()">
          ${ICONS.file} Fayl Biriktirish
        </button>
        <button type="button" id="btnScanQR" class="btn btn-add" style="padding:6px 14px; font-size:12px;" onclick="scanStudentQROnly()">
          <svg class="svg-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="7" height="7"></rect><rect x="14" y="3" width="7" height="7"></rect><rect x="14" y="14" width="7" height="7"></rect><rect x="3" y="14" width="7" height="7"></rect></svg>
          QR Skaner
        </button>
        <button type="button" id="btnToggleEditTop" class="btn btn-edit-main" onclick="toggleEditMode(!window.isEditMode)">
          ${ICONS.edit} Tahrirlash
        </button>
        <button type="button" id="btnReanalyze" class="btn btn-multi-export" style="padding:6px 14px; font-size:12px;" onclick="reanalyzeCurrentStudent()">
          ${ICONS.zap} AI Pro Tekshirish
        </button>
        <button type="button" id="btnDeleteStudentTop" class="btn btn-danger" style="padding:6px 14px; font-size:12px;" onclick="deleteCurrentStudent()">
          <svg class="svg-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg>
          O'chirish
        </button>
      </div>
    </div>

    <div id="reanalyzeStatus" style="display:none;padding:8px 14px;border-radius:6px;font-weight:600;font-size:12px;"></div>

    <!-- 3 Bo'limli Detalizatsiya (tekshiruv.html Uslubida) -->
    <div class="tekshiruv-sections-wrap">
      <!-- 1-BO'LIM: PASPORT / SHAXS GUVOHNOMASI -->
      <div class="sect" id="modalSect1">
        <div class="side" id="modalSect1Side"></div>
        <div class="sect-right" id="modalDocImgWrap_0">
          <div class="imgblk">
            <div class="imghd"><span class="t">${ICONS.idCard} Pasport / ID-karta</span></div>
            <div class="imgbox" style="color:#94a3b8;font-size:13px;padding:30px;">Hujjat rasmi yuklanmoqda...</div>
          </div>
        </div>
      </div>

      <!-- 2-BO'LIM: DIPLOM / SHAHODATNOMA -->
      <div class="sect" id="modalSect2">
        <div class="side" id="modalSect2Side"></div>
        <div class="sect-right" id="modalDocImgWrap_1">
          <div class="imgblk">
            <div class="imghd"><span class="t">${ICONS.award} Shahodatnoma / Diplom</span></div>
            <div class="imgbox" style="color:#94a3b8;font-size:13px;padding:30px;">Hujjat rasmi yuklanmoqda...</div>
          </div>
        </div>
      </div>

      <!-- 3-BO'LIM: SHARTNOMA & ALOQA -->
      <div class="sect" id="modalSect3">
        <div class="side" id="modalSect3Side"></div>
        <div class="sect-right" id="modalDocImgWrap_2"></div>
      </div>
    </div>
  `;

  // Kartalarni chizamiz
  renderInfoCards(s, window.isEditMode);
  modal.style.display = 'flex';

  window.currentDocImages = [];

  if (!s.doc_file) {
    window.renderModalDocImages();
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
        // Rasmlar o'lchamlarini brauzer xotirasiga olib, so'ng joylashtiramiz
        let loaded = 0;
        data.images.forEach(function(src) {
          const pre = new Image();
          pre.onload = pre.onerror = function() {
            loaded++;
            if (loaded === data.images.length) {
              window.renderModalDocImages();
            }
          };
          pre.src = src;
        });
      } else {
        window.renderModalDocImages();
      }
    })
    .catch(function(e) {
      window.renderModalDocImages();
    });
};

/* HUJJAT RASMLARINI HAR BIR BO'LIMGA AQLLI VA ANIQ JOYLASHTIRISH (tekshiruv.html Uslubi) */
window.renderModalDocImages = function() {
  const wrap0 = document.getElementById('modalDocImgWrap_0');
  const wrap1 = document.getElementById('modalDocImgWrap_1');
  const wrap2 = document.getElementById('modalDocImgWrap_2');
  if (!wrap0 || !wrap1 || !wrap2) return;

  const imgs = window.currentDocImages || [];

  function renderDropzoneHtml() {
    return `
      <div class="sect-card" style="border:2px dashed #3b82f6;background:rgba(37,99,235,0.04);border-radius:12px;padding:16px 20px;text-align:center;cursor:pointer;margin:0;"
           onclick="document.getElementById('attachFileInput').click()"
           ondragover="event.preventDefault(); this.style.borderColor='#2563eb'; this.style.background='rgba(37,99,235,0.1)';"
           ondragleave="this.style.borderColor='#3b82f6'; this.style.background='rgba(37,99,235,0.04)';"
           ondrop="event.preventDefault(); this.style.borderColor='#3b82f6'; this.style.background='rgba(37,99,235,0.04)'; if(event.dataTransfer.files.length) uploadAndAttachForCurrentStudent(event.dataTransfer.files[0]);">
        <div style="margin-bottom:6px;">${ICONS.folder}</div>
        <div style="font-size:13.5px;font-weight:700;color:#2563eb;margin-bottom:3px;">Yangi Word (.docx) yoki rasm yuklash / almashtirish</div>
        <div style="font-size:12px;color:#64748b;">Faylni bu yerga sudrab olib keling yoki bosib tanlang</div>
      </div>
    `;
  }

  function makeImgBlk(i, title, iconHtml) {
    if (!imgs[i]) return '';
    const deg = window.modalImgRotations[i] || 0;
    const isRot = (Math.abs(deg) === 90 || Math.abs(deg) === 270) ? 'rotated-90' : '';
    return `
      <div class="imgblk">
        <div class="imghd">
          <span class="t">${iconHtml} ${title}</span>
          <div style="display:flex;gap:6px;align-items:center;">
            <button type="button" class="btn-rot-mini" onclick="rotateModalImg(${i}, -90)" title="Chapga 90° burish">↺</button>
            <button type="button" class="btn-rot-mini" onclick="rotateModalImg(${i}, 90)" title="O'ngga 90° burish">↻</button>
            <button type="button" class="btn-zoom-mini" onclick="openLightbox(${i})" title="To'liq ekranda ko'rish">${ICONS.search} Kattalashtirish</button>
          </div>
        </div>
        <div class="imgbox">
          <img id="modalDocImg_${i}" class="doc-img ${isRot}" src="${imgs[i]}" alt="${title}" onclick="openLightbox(${i})" style="transform: rotate(${deg}deg);">
        </div>
      </div>
    `;
  }

  if (!imgs.length) {
    wrap0.innerHTML = `<div class="sect-card" style="margin:0;"><div class="alert a-ogoh" style="margin:0;padding:12px 14px;background:rgba(245,158,11,0.08);color:#d97706;border:1px solid rgba(245,158,11,0.25);border-radius:8px;font-weight:600;font-size:13px;">Ushbu talaba uchun pasport rasmi mavjud emas.</div></div>`;
    wrap1.innerHTML = `<div class="sect-card" style="margin:0;"><div class="alert a-ogoh" style="margin:0;padding:12px 14px;background:rgba(245,158,11,0.08);color:#d97706;border:1px solid rgba(245,158,11,0.25);border-radius:8px;font-weight:600;font-size:13px;">Ushbu talaba uchun shahodatnoma / diplom rasmi mavjud emas.</div></div>`;
    wrap2.innerHTML = renderDropzoneHtml();
    return;
  }

  // Rasmlarni proporsiyasi (en va bo'yi) bo'yicha aniq toifalarga ajratamiz:
  // A4 diplom / shahodatnoma: balandligi enidan ancha katta (h > w * 1.05)
  // Pasport / ID-karta: eni balandligidan katta (w >= h * 1.05)
  const passportItems = [];
  const diplomaItems = [];
  const otherItems = [];

  imgs.forEach(function(src, i) {
    const im = new Image();
    im.src = src;
    const w = im.naturalWidth || 0;
    const h = im.naturalHeight || 0;
    if (h > 0 && w > 0) {
      if (h > w * 1.05) {
        diplomaItems.push({ idx: i, title: 'Shahodatnoma / Diplom' });
      } else {
        const title = passportItems.length === 0 ? 'Pasport / ID-karta (Old tomoni)' : 'Pasport / ID-karta (Orqa tomoni)';
        passportItems.push({ idx: i, title: title });
      }
    } else {
      if (i === 0) passportItems.push({ idx: i, title: 'Pasport / ID-karta' });
      else if (i === 1) diplomaItems.push({ idx: i, title: 'Shahodatnoma / Diplom' });
      else otherItems.push({ idx: i, title: 'Qo\'shimcha Hujjat #' + (i + 1) });
    }
  });

  // Agar barcha rasmlar bir tomonga tushib qolsa, mantiqiy qayta taqsimlaymiz
  if (passportItems.length === 0 && diplomaItems.length > 0) {
    passportItems.push(diplomaItems.shift());
  }
  if (diplomaItems.length === 0 && passportItems.length > 1) {
    diplomaItems.push(passportItems.pop());
  }

  // 1-Bo'lim: Pasport rasmlari
  if (passportItems.length > 0) {
    wrap0.innerHTML = passportItems.map(function(item) {
      return makeImgBlk(item.idx, item.title, ICONS.idCard);
    }).join('');
  } else {
    wrap0.innerHTML = `<div class="sect-card" style="margin:0;"><div class="alert a-ogoh" style="margin:0;padding:12px 14px;background:rgba(245,158,11,0.08);color:#d97706;border:1px solid rgba(245,158,11,0.25);border-radius:8px;font-weight:600;font-size:13px;">Ushbu talaba uchun pasport rasmi mavjud emas.</div></div>`;
  }

  // 2-Bo'lim: Diplom / Shahodatnoma rasmlari
  if (diplomaItems.length > 0) {
    wrap1.innerHTML = diplomaItems.map(function(item) {
      return makeImgBlk(item.idx, item.title, ICONS.award);
    }).join('');
  } else {
    wrap1.innerHTML = `<div class="sect-card" style="margin:0;"><div class="alert a-ogoh" style="margin:0;padding:12px 14px;background:rgba(245,158,11,0.08);color:#d97706;border:1px solid rgba(245,158,11,0.25);border-radius:8px;font-weight:600;font-size:13px;">Ushbu talaba uchun shahodatnoma / diplom rasmi mavjud emas.</div></div>`;
  }

  // 3-Bo'lim: Qo'shimcha rasmlar + Dropzone
  const extraHtml = otherItems.map(function(item) {
    return makeImgBlk(item.idx, item.title, ICONS.file);
  }).join('');
  wrap2.innerHTML = extraHtml + renderDropzoneHtml();
};

/* USHBU TALABAGA FAYL BIRIKTIRISH VA AI ORQALI TO'LDIRISH */
window.uploadAndAttachForCurrentStudent = function(file) {
  if (!file || window.currentStudentIdx === null || !RAW_STUDENTS[window.currentStudentIdx]) return;
  const s = RAW_STUDENTS[window.currentStudentIdx];

  const statusBox = document.getElementById('reanalyzeStatus');

  if (statusBox) {
    statusBox.style.display = 'block';
    statusBox.style.background = '#eff6ff';
    statusBox.style.color = '#1d4ed8';
    statusBox.style.border = '1px solid #bfdbfe';
    statusBox.innerHTML = '<strong>' + file.name + '</strong> yuklanmoqda va eng kuchli Gemini AI modeli orqali sinchiklab tahlil qilinmoqda...';
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
        if (d.tel) s.tel = d.tel;
        if (d.shnum) s.shnum = d.shnum;

        // EDIT INPUTLARNI DARHOL YANGILASH
        const editIsm = document.getElementById('edit_ism');
        if (editIsm) editIsm.value = s.ism || '';
        const editOta = document.getElementById('edit_ota');
        if (editOta) editOta.value = s.ota || '';
        const editPv = document.getElementById('edit_pv');
        if (editPv) editPv.value = s.pv || '';
        const editPinfl = document.getElementById('edit_pinfl');
        if (editPinfl) editPinfl.value = s.pinfl || '';
        const editDob = document.getElementById('edit_dob');
        if (editDob) editDob.value = s.dob || '';
        const editBer = document.getElementById('edit_ber');
        if (editBer) editBer.value = s.ber || '';
        const editShDoc = document.getElementById('edit_shdoc');
        if (editShDoc) editShDoc.value = s.sh_doc || '';
        const editMak = document.getElementById('edit_mak');
        if (editMak) editMak.value = s.mak || '';
        const editYil = document.getElementById('edit_yil');
        if (editYil) editYil.value = s.yil || '';
        const editDocTur = document.getElementById('edit_doctur');
        if (editDocTur) editDocTur.value = s.doc_tur || 'Shahodatnoma';
        const editShnum = document.getElementById('edit_shnum');
        if (editShnum) editShnum.value = s.shnum || '';
        const editTel = document.getElementById('edit_tel');
        if (editTel) editTel.value = s.tel || '';

        // Modal sarlavhasini yangilash
        const modalTitle = document.getElementById('modalTitle');
        if (modalTitle) {
          modalTitle.innerHTML = ICONS.user + " <strong>" + s.fish + "</strong> &nbsp;|&nbsp; Shartnoma: #" + (s.shnum || '—');
        }

        // Rasmlar galereyasini chizish
        if (res.images && res.images.length > 0) {
          window.currentDocImages = res.images;
          window.modalImgRotations = {};
          renderModalDocImages();
        }

        // Kartalarni yangilash
        renderInfoCards(s, window.isEditMode);

        // Jadvaldagi qatorni va kartani xatosiz to'liq yangilash
        if (typeof window.applyStudentRowToDOM === 'function') {
          window.applyStudentRowToDOM(window.currentStudentIdx, s);
        }
        if (typeof window.updateStudentCardDOM === 'function') {
          window.updateStudentCardDOM(window.currentStudentIdx, s);
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

/* 3 BO'LIMLI MA'LUMOTLAR KARTALARINI CHIZISH (tekshiruv.html Uslubi) */
function renderInfoCards(s, isEditing) {
  const sect1Side = document.getElementById('modalSect1Side');
  const sect2Side = document.getElementById('modalSect2Side');
  const sect3Side = document.getElementById('modalSect3Side');
  const topBtn = document.getElementById('btnToggleEditTop');

  if (!sect1Side || !sect2Side || !sect3Side) return;

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
    ? `<tr class="data-row"><td>${label}:</td><td style="color:${nm.c};font-weight:800;" title="${nm.t}">${val}</td></tr>`
    : '';

  if (!isEditing) {
    // -------------------------------------------------------------
    // ODDIY KO'RISH REJIMI (tekshiruv.html)
    // -------------------------------------------------------------
    
    // 1-BO'LIM CHAP TOMONI: Pasport jadvali + JSHSHIR decoder
    const pinflDecoded = window.decodePinfl(s.pinfl);
    let pinflDecoderHtml = '';
    if (s.pinfl && pinflDecoded) {
      const p = pinflDecoded.raw;
      pinflDecoderHtml = `
        <div class="sect-card">
          <h4>JSHSHIR (PINFL) Tahlili</h4>
          <div class="pcode">
            <span class="c1" title="Jinsi va asr">${p[0]}</span><span
              class="c2" title="Tug'ilgan sana KKOOYY">${p.slice(1,7)}</span><span
              class="c3" title="Tug'ilgan joy kodi">${p.slice(7,10)}</span><span
              class="c4" title="Kunlik tartib raqami">${p.slice(10,13)}</span><span
              class="c5" title="Nazorat raqami">${p[13]}</span>
          </div>
          <table class="kv">
            <tr><td>Jinsi + Asr:</td><td>${pinflDecoded.jins} · ${pinflDecoded.asr}</td></tr>
            <tr><td>Tug'ilgan sana:</td><td><strong>${pinflDecoded.sana}</strong></td></tr>
            <tr><td>Hudud kodi:</td><td>${pinflDecoded.kod} = ${pinflDecoded.joy}</td></tr>
            <tr><td>Tartib raqami:</td><td class="mono">${pinflDecoded.tartib}</td></tr>
            <tr><td>Nazorat raqami:</td><td>${pinflDecoded.nazorat ? '<span style="color:#10b981;font-weight:800;">To‘g‘ri ✓</span>' : '<span style="color:#ef4444;font-weight:800;">XATO ✕</span>'}</td></tr>
          </table>
        </div>
      `;
    } else if (s.pinfl) {
      pinflDecoderHtml = `
        <div class="sect-card">
          <h4>JSHSHIR (PINFL) Tahlili</h4>
          <div style="font-size:12.5px;color:#94a3b8;">14 xonali JSHSHIR formati to'liq emas.</div>
        </div>
      `;
    }

    sect1Side.innerHTML = `
      <div class="sechd"><span class="n">1</span>Pasport / Shaxs Guvohnomasi</div>
      <div class="sect-card">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;">
          <h4 style="margin:0;">Pasport Ma'lumotlari</h4>
          <button type="button" class="btn btn-edit-mini" onclick="toggleEditMode(true)">${ICONS.edit} Tahrirlash</button>
        </div>
        <table class="kv">
          <tr><td>Hujjat turi:</td><td>${s.pass_type || 'ID-karta'}</td></tr>
          <tr><td>Pasport seriya va №:</td><td><strong class="mono-pass" style="font-size:14.5px;">${s.pv || '—'}</strong></td></tr>
          <tr><td>JSHSHIR (PINFL):</td><td>${formatPinflDisplayJS(s.pinfl)}</td></tr>
          <tr><td>Tug'ilgan sana (DOB):</td><td><strong>${s.dob || '—'}</strong></td></tr>
          <tr><td>Pasport Berilgan:</td><td><strong>${s.ber || '—'}</strong></td></tr>
          <tr><td>Otasining ismi:</td><td>${s.ota || '—'}</td></tr>
          ${nameRow('Pasportdagi F.I.SH', s.pass_fish)}
        </table>
      </div>
      ${pinflDecoderHtml}
    `;

    // 2-BO'LIM CHAP TOMONI: Ta'lim hujjati jadvali
    sect2Side.innerHTML = `
      <div class="sechd"><span class="n">2</span>Diplom / Shahodatnoma</div>
      <div class="sect-card">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;">
          <h4 style="margin:0;">Ta'lim Hujjati Ma'lumotlari</h4>
          <button type="button" class="btn btn-edit-mini" onclick="toggleEditMode(true)">${ICONS.edit} Tahrirlash</button>
        </div>
        <table class="kv">
          <tr><td>Hujjat turi:</td><td><strong>${s.doc_tur || 'Shahodatnoma'}</strong></td></tr>
          <tr><td>Hujjat seriya va №:</td><td><strong class="mono-doc" style="font-size:14.5px;">${s.sh_doc || '—'}</strong></td></tr>
          <tr><td>Tugatgan muassasasi:</td><td>${s.mak || '—'}</td></tr>
          <tr><td>Bitirgan yili:</td><td><strong>${s.yil || '—'}-yil</strong></td></tr>
          <tr><td>Yo'nalishi:</td><td><span style="color:#0284c7;font-weight:700;">${s.yon || '—'}</span></td></tr>
          ${nameRow('Shahodatnomadagi F.I.SH', s.cert_fish)}
        </table>
      </div>
    `;

    // 3-BO'LIM CHAP TOMONI: Shartnoma & Aloqa ma'lumotlari
    const isWithdrawn = isWithdrawnGroup(s.group);
    const grpBadge = s.group
      ? (isWithdrawn ? '<span class="card-group-badge grp-withdrawn">Safdan chiqarilgan</span>' : `<span class="card-group-badge grp-${(s.group || '').replace(/[^a-zA-Z0-9]/g, '').toLowerCase()}">${s.group}</span>`)
      : '<span style="color:#f59e0b;font-weight:700;">Belgilanmagan</span>';

    const isVerified = (s.verified === 'TASDIQLANDI');
    const vBtnClass = isVerified ? 'btn-v-mini btn-v-ok' : 'btn-v-mini btn-v-wait';
    const vBtnHtml = isVerified ? (ICONS.checkSm + ' Tasdiqlangan') : (ICONS.clockSm + ' Kutilmoqda');

    sect3Side.innerHTML = `
      <div class="sechd"><span class="n">3</span>Shartnoma & Aloqa</div>
      <div class="sect-card">
        <h4 style="margin:0 0 10px;">Shartnoma & Guruh</h4>
        <table class="kv">
          <tr><td>Shartnoma raqami:</td><td><strong style="font-size:14px;color:#2563eb;">#${s.shnum || '—'}</strong></td></tr>
          <tr><td>Akademik guruh:</td><td>${grpBadge}</td></tr>
          <tr><td>Telefon raqami:</td><td><strong style="font-size:13.5px;color:#0284c7;">${s.tel || '—'}</strong></td></tr>
          <tr><td>Word fayli:</td><td><code style="font-size:11.5px;color:#64748b;">${docFileName}</code></td></tr>
          <tr><td>Operator tasdig'i:</td><td>
            <button type="button" class="${vBtnClass}" onclick="toggleStudentVerification(${window.currentStudentIdx}, ${s.row || 0})" title="Tasdiqlash holatini almashtirish">
              ${vBtnHtml}
            </button>
          </td></tr>
        </table>
        <button type="button" class="btn btn-edit-main" onclick="toggleEditMode(true)" style="width:100%;margin-top:14px;justify-content:center;">
          ${ICONS.edit} Barcha Ma'lumotlarni Tahrirlash
        </button>
      </div>
    `;

  } else {
    // -------------------------------------------------------------
    // TAHRIRLASH (EDIT) REJIMI (tekshiruv.html Uslubidagi maydonlar)
    // -------------------------------------------------------------

    // 1-BO'LIM: Pasport tahrirlash inputlari
    sect1Side.innerHTML = `
      <div class="sechd"><span class="n">1</span>Pasport & Shaxs Ma'lumotlari (Tahrirlash)</div>
      <div class="sect-card">
        <div class="data-row-edit">
          <span class="lbl">Ism va Familiya:</span>
          <input type="text" id="edit_ism" class="edit-input edit-input-lg" value="${s.ism || ''}" placeholder="Familiya Ism">
        </div>
        <div class="data-row-edit">
          <span class="lbl">Otasining ismi:</span>
          <input type="text" id="edit_ota" class="edit-input edit-input-lg" value="${s.ota || ''}" placeholder="... qizi / ... o'g'li">
        </div>
        <div class="data-row-edit">
          <span class="lbl">Pasport seriya va №:</span>
          <input type="text" id="edit_pv" class="edit-input edit-input-lg mono" oninput="this.value = this.value.toUpperCase()" value="${s.pv || ''}" placeholder="AD1234567">
        </div>
        <div class="data-row-edit">
          <span class="lbl">JSHSHIR (PINFL - 14 ta):</span>
          <input type="text" id="edit_pinfl" class="edit-input edit-input-lg mono" oninput="handlePinflAutoDob(this, 'edit_dob')" value="${s.pinfl || ''}" placeholder="604060 5572 0067">
        </div>
        <div class="data-row-edit">
          <span class="lbl" style="color:#facc15;">Tug'ilgan sana (DOB):</span>
          <input type="text" id="edit_dob" class="edit-input edit-input-lg" style="color:#facc15;font-weight:800;" value="${s.dob || ''}" placeholder="DD.MM.YYYY">
        </div>
        <div class="data-row-edit">
          <span class="lbl">Pasport Berilgan:</span>
          <input type="text" id="edit_ber" class="edit-input edit-input-lg" value="${s.ber || ''}" placeholder="DD.MM.YYYY">
        </div>
      </div>
    `;

    // 2-BO'LIM: Ta'lim hujjati tahrirlash inputlari
    sect2Side.innerHTML = `
      <div class="sechd"><span class="n">2</span>Ta'lim Hujjati (Tahrirlash)</div>
      <div class="sect-card">
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
    `;

    // 3-BO'LIM: Shartnoma, Guruh & Aloqa tahrirlash inputlari + Saqlash tugmasi
    sect3Side.innerHTML = `
      <div class="sechd"><span class="n">3</span>Shartnoma & Guruh (Tahrirlash)</div>
      <div class="sect-card">
        <div class="data-row-edit">
          <span class="lbl">Shartnoma raqami:</span>
          <input type="text" id="edit_shnum" class="edit-input edit-input-lg mono" value="${s.shnum || ''}" placeholder="Masalan: 1234">
        </div>
        <div class="data-row-edit">
          <span class="lbl">Akademik guruh:</span>
          <select id="edit_group" class="edit-input edit-input-lg">
            <option value="" ${!s.group ? 'selected' : ''}>Guruh belgilanmagan</option>
            <option value="Talabalar safidan chiqarilganlar" ${isWithdrawnGroup(s.group) ? 'selected' : ''}>Talabalar safidan chiqarilganlar (Maxsus)</option>
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
          <span class="lbl">Telefon raqami:</span>
          <input type="text" id="edit_tel" class="edit-input edit-input-lg" value="${s.tel || ''}" placeholder="+998901234567">
        </div>
        <div style="display:flex;gap:10px;margin-top:16px;">
          <button type="button" class="btn btn-save-data" onclick="saveStudentData()" style="flex:1;justify-content:center;padding:10px 18px;font-size:13px;">
            ${ICONS.save} Saqlash (Excelga yozish)
          </button>
          <button type="button" class="btn btn-cancel-edit" onclick="toggleEditMode(false)" style="padding:10px 16px;">
            Bekor qilish
          </button>
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
  if (s.length === 14) {
    const p1 = s.slice(0,6), p2 = s.slice(6,10), p3 = s.slice(10,14);
    return `<span class="pinfl-group">${p1}</span><span class="pinfl-group">${p2}</span><span class="pinfl-group pinfl-end">${p3}</span>`;
  }
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
  let card = document.getElementById('student-card-' + idx);
  if (!card) {
    const cards = document.querySelectorAll('.student-card');
    if (cards && cards[idx]) card = cards[idx];
  }
  if (!card) return;

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

/* =========================================================================
   TAHRIRLARNI LOKAL KESHDA SAQLASH
   Hisobot (index.html) qayta generatsiya bo'lguncha ~7 soniya ketadi. Shu
   oraliqda F5 yoki Ctrl+Shift+R bosilsa, sahifadagi RAW_STUDENTS eski
   holatga qaytadi va tahrir "yo'qolgandek" ko'rinadi. Tasdiq holatlari
   (student_portal_verified_map) uchun ishlatilgan andozaning aynan o'zi:
   tahrir darhol localStorage ga yoziladi va yuklanishda qayta qo'llanadi.
   ========================================================================= */
window.STUDENT_EDITS_KEY = 'student_portal_edits_map';
window.STUDENT_EDIT_FIELDS = ['ism','ota','group','pv','pinfl','dob','ber','doc_tur','sh_doc','mak','yil','yon','shnum','tel'];
// Tasdiqlanmagan tahrir 7 kundan ortiq yashamasin (eskirib qolmasligi uchun)
window.STUDENT_EDIT_TTL_MS = 7 * 24 * 60 * 60 * 1000;

window.readStudentEditsCache = function() {
  try {
    const raw = JSON.parse(localStorage.getItem(window.STUDENT_EDITS_KEY) || '{}');
    return (raw && typeof raw === 'object') ? raw : {};
  } catch(e) { return {}; }
};

window.writeStudentEditsCache = function(map) {
  try { localStorage.setItem(window.STUDENT_EDITS_KEY, JSON.stringify(map)); } catch(e) {}
};

/* Bitta tahrirni keshga yozish. shnum ham saqlanadi — talaba o'chirilib
   qatorlar surilib ketsa, tahrir boshqa talabaga noto'g'ri qo'llanmasligi uchun. */
window.cacheStudentEdit = function(s, fields) {
  if (!s || !s.row) return;
  const map = window.readStudentEditsCache();
  const key = String(s.row);
  const prev = (map[key] && map[key].fields) ? map[key].fields : {};
  map[key] = {
    shnum: s.shnum ? String(s.shnum).trim() : '',
    fields: Object.assign({}, prev, fields),
    ts: Date.now()
  };
  window.writeStudentEditsCache(map);
};

window.clearStudentEditCache = function(row) {
  const map = window.readStudentEditsCache();
  if (map[String(row)]) {
    delete map[String(row)];
    window.writeStudentEditsCache(map);
  }
};

/* Jadval qatorini xatosiz va to'liq 13 ta ustun bo'yicha yangilash */
window.applyStudentRowToDOM = function(idx, s) {
  let rEl = document.getElementById('student-row-' + idx);
  if (!rEl) {
    const rows = document.querySelectorAll('.student-row');
    if (rows && rows[idx]) rEl = rows[idx];
  }
  if (!rEl) return;

  const cleanFish = s.fish || (s.ism + ' ' + (s.ota || '')).trim();
  const isWithdrawn = window.isWithdrawnGroup ? window.isWithdrawnGroup(s.group) : (String(s.group || '').toLowerCase().includes('chiqaril') || s.group === 'N');
  const grpName = isWithdrawn ? "Safdan chiqarilgan" : (s.group || "Noma'lum");
  const grpClean = (s.group || '').replace(/[^a-zA-Z0-9]/g, '').toLowerCase() || (isWithdrawn ? 'withdrawn' : 'n');
  const grpClass = isWithdrawn ? 'grp-withdrawn' : ('grp-' + grpClean);

  rEl.setAttribute('data-shnum', (s.shnum || '').toLowerCase());
  rEl.setAttribute('data-name', cleanFish.toLowerCase());
  rEl.setAttribute('data-group', (s.group || '').toLowerCase());
  rEl.setAttribute('data-pass', (s.pv || '').toLowerCase());
  rEl.setAttribute('data-passtype', s.pass_type || 'ID-karta');
  rEl.setAttribute('data-pinfl', s.pinfl || '');
  rEl.setAttribute('data-dob', (s.dob || '') + ' ' + (s.ber || ''));
  rEl.setAttribute('data-doc', (s.sh_doc || '').toLowerCase());
  rEl.setAttribute('data-doctype', s.doc_tur || 'Shahodatnoma');
  rEl.setAttribute('data-mak', (s.mak || '').toLowerCase());
  rEl.setAttribute('data-yil', s.yil || '');
  rEl.setAttribute('data-yon', (s.yon || '').toLowerCase());
  rEl.setAttribute('data-status', s.status || 'chala');
  rEl.setAttribute('data-file', (s.doc_file || '').toLowerCase());
  rEl.setAttribute('data-verified', (s.verified || 'kutilmoqda').toLowerCase());

  const firstTd = rEl.querySelector('td:first-child');
  const trNum = firstTd ? firstTd.innerText.trim() : (idx + 1);

  const isVerified = (s.verified === 'TASDIQLANDI');
  const vBtnClass = isVerified ? 'btn-v-mini btn-v-ok' : 'btn-v-mini btn-v-wait';
  const vBtnHtml = isVerified ? (ICONS.checkSm + ' OK') : (ICONS.clockSm + ' Kutilmoqda');

  const fileBtn = s.doc_file
    ? `<button type="button" class="btn-file-mini btn-file-has" onclick="openStudentModal(${idx})" title="${s.doc_file}">${ICONS.file} docx</button>`
    : `<button type="button" class="btn-file-mini btn-file-none" onclick="openStudentModal(${idx})" title="Fayl biriktirish">${ICONS.file} +</button>`;

  const qrBtn = s.sh_qr
    ? `<a href="${s.sh_qr}" target="_blank" class="mini-qr-link" title="QR PDF ochish"><svg class="svg-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"></path><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"></path></svg></a>`
    : '';

  let passTypeTag = '';
  if (s.pass_type === 'ID-karta' || (s.pv && (s.pv.startsWith('AD') || s.pv.startsWith('AE')))) {
    passTypeTag = '<span class="sub-pill">ID</span>';
  } else if (s.pass_type === 'Biometrik Pasport' || (s.pv && (s.pv.startsWith('AB') || s.pv.startsWith('AC') || s.pv.startsWith('AA')))) {
    passTypeTag = '<span class="sub-pill">Bio</span>';
  }

  const statusIcon = (s.status === 'full')
    ? `<svg class="svg-status svg-success" viewBox="0 0 24 24" fill="none" stroke="#10b981" stroke-width="2.5"><polyline points="20 6 9 17 4 12"></polyline></svg>`
    : ((s.status === 'chala')
      ? `<svg class="svg-status svg-warning" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" stroke-width="2.5"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>`
      : `<svg class="svg-status svg-danger" viewBox="0 0 24 24" fill="none" stroke="#ef4444" stroke-width="2.5"><circle cx="12" cy="12" r="10"></circle><line x1="15" y1="9" x2="9" y2="15"></line><line x1="9" y1="9" x2="15" y2="15"></line></svg>`);

  rEl.innerHTML = `
    <td style="text-align:center;font-weight:700;color:#94a3b8;">${trNum}</td>
    <td style="text-align:center;white-space:nowrap;">
      <span class="table-group-badge ${grpClass}">${grpName}</span>
    </td>
    <td style="text-align:center;white-space:nowrap;">
      <span class="shnum-clean" onclick="openStudentModal(${idx})" title="Talaba oynasini ochish">#${s.shnum || '—'}</span>
    </td>
    <td style="cursor:pointer;" onclick="openStudentModal(${idx})" title="Talaba ma'lumotlarini ko'rish / Fayl biriktirish">
      <div class="student-name">${cleanFish}</div>
    </td>
    <td style="white-space:nowrap;">
      ${formatPassDisplayJS(s.pv)}${passTypeTag}
    </td>
    <td style="white-space:nowrap;text-align:center;">
      ${formatPinflDisplayJS(s.pinfl)}
    </td>
    <td style="white-space:nowrap;text-align:center;">
      <span class="clean-dob">${s.dob || '—'}</span>
    </td>
    <td style="white-space:nowrap;">
      ${formatDocDisplayJS(s.sh_doc)}${qrBtn}
    </td>
    <td>
      <div class="cell-school" title="${s.mak || '—'}">${s.mak || '—'}</div>
    </td>
    <td style="text-align:center;font-weight:700;font-size:12px;color:inherit;">${s.yil || '—'}</td>
    <td style="text-align:center;white-space:nowrap;">
      ${fileBtn}
    </td>
    <td style="text-align:center;white-space:nowrap;">
      <button type="button" class="${vBtnClass}" id="vbtn-row-${idx}" onclick="toggleStudentVerification(${idx}, ${s.row || (idx + 2)})" title="Tasdiqlash holati">
        ${vBtnHtml}
      </button>
    </td>
    <td style="text-align:center;">
      ${statusIcon}
    </td>
  `;
};

/* Talaba ob'ektiga maydonlarni yozish va karta + jadvalni birdaniga yangilash */
window.applyStudentFields = function(idx, s, fields) {
  window.STUDENT_EDIT_FIELDS.forEach(function(f) {
    if (fields[f] !== undefined) s[f] = fields[f];
  });
  s.fish = (s.ism + ' ' + (s.ota || '')).trim();
  window.updateStudentCardDOM(idx, s);
  window.applyStudentRowToDOM(idx, s);
};

/* Yuklanishda: serverga yetib bormagan tahrirlarni qayta qo'llash.
   Agar hisobot allaqachon yangilangan bo'lsa (qiymatlar mos) — kesh tozalanadi. */
window.syncStudentEditsState = function() {
  if (typeof RAW_STUDENTS === 'undefined' || !Array.isArray(RAW_STUDENTS)) return;

  // Serverdan kelgan asl qiymatlarni bir marta suratga olamiz. Keyin keshni
  // shu surat bilan solishtiramiz: aks holda funksiya o'zi yozib qo'ygan
  // qiymat bilan solishtirib, server yetib olganini hech qachon sezmaydi.
  if (!window.__serverStudentSnapshot) {
    window.__serverStudentSnapshot = {};
    RAW_STUDENTS.forEach(function(s) {
      const orig = {};
      window.STUDENT_EDIT_FIELDS.forEach(function(f) { orig[f] = s[f]; });
      window.__serverStudentSnapshot[String(s.row)] = orig;
    });
  }

  const map = window.readStudentEditsCache();
  if (!map || !Object.keys(map).length) return;

  const now = Date.now();
  let dirty = false;

  RAW_STUDENTS.forEach(function(s, idx) {
    const entry = map[String(s.row)];
    if (!entry || !entry.fields) return;

    // Eskirgan yozuvni tashlab yuborish
    if (entry.ts && (now - entry.ts) > window.STUDENT_EDIT_TTL_MS) {
      delete map[String(s.row)]; dirty = true; return;
    }
    // Qatorlar surilgan bo'lsa (talaba o'chirilgan) — noto'g'ri qo'llamaymiz
    if (entry.shnum && s.shnum && String(s.shnum).trim() !== entry.shnum) {
      delete map[String(s.row)]; dirty = true; return;
    }

    // Hisobot yetib olganmi? Serverning asl qiymati bilan solishtiramiz.
    const serverVals = window.__serverStudentSnapshot[String(s.row)] || {};
    const stillPending = window.STUDENT_EDIT_FIELDS.some(function(f) {
      return entry.fields[f] !== undefined && (serverVals[f] || '') !== entry.fields[f];
    });

    if (!stillPending) {
      delete map[String(s.row)]; dirty = true; return;
    }

    window.applyStudentFields(idx, s, entry.fields);
  });

  if (dirty) window.writeStudentEditsCache(map);
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
  const shnum = (document.getElementById('edit_shnum') ? document.getElementById('edit_shnum').value : (s.shnum || '')).trim();
  const tel = (document.getElementById('edit_tel') ? document.getElementById('edit_tel').value : (s.tel || '')).trim();

  const idx = window.currentStudentIdx;
  const fields = {
    ism: ism, ota: ota, group: group, pv: pv, pinfl: pinfl, dob: dob,
    ber: ber, doc_tur: doctur, sh_doc: shdoc, mak: mak, yil: yil, yon: yon,
    shnum: shnum, tel: tel
  };

  // Xatolik bo'lsa qaytarish uchun oldingi holatni eslab qolamiz
  const prevFields = {};
  window.STUDENT_EDIT_FIELDS.forEach(function(f) { prevFields[f] = s[f]; });

  // 1-QADAM: darhol (0ms) qo'llaymiz — server javobini kutib turmaymiz
  window.applyStudentFields(idx, s, fields);

  // 2-QADAM: localStorage ga yozamiz — F5/Ctrl+Shift+R da tahrir yo'qolmaydi
  window.cacheStudentEdit(s, fields);

  // Modal sarlavhasini ham yangilash
  const modalTitle = document.getElementById('modalTitle');
  if (modalTitle) {
    modalTitle.innerHTML = ICONS.user + " <strong>" + s.fish + "</strong> &nbsp;|&nbsp; Shartnoma: #" + (s.shnum || '—');
  }

  // Oddiy ko'rish rejimiga qaytarish
  window.toggleEditMode(false);

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
    '&yon=' + encodeURIComponent(yon) +
    '&shnum=' + encodeURIComponent(shnum) +
    '&tel=' + encodeURIComponent(tel);

  // 3-QADAM: fonda serverga yuboramiz (interfeys allaqachon yangilangan)
  fetch(url)
    .then(function(r) { return r.json(); })
    .then(function(res) {
      if (res.success) {
        const newStatusBox = document.getElementById('reanalyzeStatus');
        if (newStatusBox) {
          newStatusBox.style.display = 'block';
          newStatusBox.style.background = '#dcfce7';
          newStatusBox.style.color = '#15803d';
          newStatusBox.style.border = '1px solid #86efac';
          newStatusBox.innerHTML = 'Excel bazaga yozildi. Hisobot fonda yangilanmoqda...';
        }
        showToast(s.ism + " ma'lumotlari saqlandi!", 'success');
      } else {
        // Server rad etdi — o'zgarishni orqaga qaytaramiz
        window.applyStudentFields(idx, s, prevFields);
        window.clearStudentEditCache(s.row);
        if (statusBox) {
          statusBox.style.background = '#fee2e2';
          statusBox.style.color = '#991b1b';
          statusBox.style.border = '1px solid #f87171';
          statusBox.innerHTML = 'Saqlashda xatolik: ' + (res.error || 'Noma\'lum xatolik');
        }
        showToast("Saqlashda xatolik: " + (res.error || 'Noma\'lum'), 'danger');
      }
    })
    .catch(function(e) {
      // Tarmoq uzilishi bo'lishi mumkin — tahrirni ORQAGA QAYTARMAYMIZ.
      // U localStorage da turadi va sahifa yangilansa ham ko'rinaveradi.
      if (statusBox) {
        statusBox.style.background = '#fef9c3';
        statusBox.style.color = '#854d0e';
        statusBox.style.border = '1px solid #fde047';
        statusBox.innerHTML = 'Serverga ulanib bo\'lmadi — tahrir brauzerda saqlanib turibdi.';
      }
      showToast("Serverga ulanib bo'lmadi. Tahrir brauzerda saqlandi.", 'warning');
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

        // Jadvaldagi qatorni va kartani xatosiz to'liq yangilash
        if (typeof window.applyStudentRowToDOM === 'function') {
          window.applyStudentRowToDOM(window.currentStudentIdx, s);
        }
        if (typeof window.updateStudentCardDOM === 'function') {
          window.updateStudentCardDOM(window.currentStudentIdx, s);
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
  const s = Object.assign({}, RAW_STUDENTS[window.currentStudentIdx]);

  const studentName = s.fish || s.ism || 'ushbu talaba';
  const confirmMsg = "Haqiqatan ham " + studentName + " (Shartnoma: #" + (s.shnum || '—') + ") ni bazadan butunlay o'chirib tashlamoqchimisiz?\n\nBu amal Excel bazadan ham o'chiradi!";

  if (!confirm(confirmMsg)) return;

  const btn = document.getElementById('btnDeleteStudentTop');
  if (btn) {
    btn.disabled = true;
    btn.innerHTML = 'O\'chirilmoqda...';
    btn.style.opacity = '0.7';
  }

  // 1. DARHOL EKRANDAN VA MA'LUMOTLAR BAZASIDAN O'CHIRISH (INSTANT OPTIMISTIC DELETE)
  if (typeof window.removeStudentFromDOM === 'function') {
    window.removeStudentFromDOM(s);
  }
  if (typeof window.saveDeletedStudentToStorage === 'function') {
    window.saveDeletedStudentToStorage(s);
  }
  if (typeof window.closeStudentModal === 'function') {
    window.closeStudentModal();
  }

  if (typeof showToast === 'function') {
    showToast(`🗑️ ${studentName} bazadan muvaffaqiyatli o'chirildi!`, 'success');
  }

  // 2. FONDA SERVER VA GITHUB BILAN BOG'LANIB O'CHIRISHNI SAQLAYMIZ
  const apiHost = (window.location.protocol === 'http:' || window.location.protocol === 'https:') ? '' : 'http://localhost:8080';
  const url = apiHost + '/api/delete_student?' +
    'row=' + encodeURIComponent(s.row || 0) +
    '&shnum=' + encodeURIComponent(s.shnum || '') +
    '&pinfl=' + encodeURIComponent(s.pinfl || '') +
    '&ism=' + encodeURIComponent(s.ism || '') +
    '&fish=' + encodeURIComponent(s.fish || '');

  fetch(url)
    .then(function(r) { return r.json(); })
    .then(function(res) {
      if (res && res.success) {
        if (typeof showToast === 'function') {
          showToast(`☁️ ${studentName} server bazasidan to'liq o'chirildi!`, 'success');
        }
      } else {
        if (typeof showToast === 'function') {
          showToast("⚠️ Serverda o'chirishda xatolik: " + (res.error || 'Noma\'lum xato'), 'error');
        }
      }
    })
    .catch(function(err) {
      if (typeof showToast === 'function') {
        showToast("⚠️ Server bilan ulanishda xatolik: " + err, 'error');
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
        // Jadvaldagi qatorni va kartani xatosiz to'liq yangilash
        if (typeof window.applyStudentRowToDOM === 'function') {
          window.applyStudentRowToDOM(window.currentStudentIdx, s);
        }
        if (typeof window.updateStudentCardDOM === 'function') {
          window.updateStudentCardDOM(window.currentStudentIdx, s);
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
  window.imgRotate = (window.modalImgRotations && window.modalImgRotations[idx]) ? window.modalImgRotations[idx] : 0;
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
      const isWithdrawnFilter = (fgLower === 'talabalar safidan chiqarilganlar' || fgLower === 'safdan chiqarilganlar' || fgLower === 'safdan' || fgLower === 'belgilanmagan' || fgLower === 'unassigned' || fgLower === 'n' || fgLower.includes('chiqaril'));
      if (isWithdrawnFilter) {
        if (!dGroup.includes('chiqaril') && dGroup !== '' && dGroup !== 'belgilanmagan' && dGroup !== 'none' && dGroup !== 'n') visible = false;
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

  // Safdan chiqarilganlar filtr tugmasi holatini sinxronlash
  const btnWithdrawn = document.getElementById('btn_filter_withdrawn');
  if (btnWithdrawn) {
    const isW = (groupName === 'Talabalar safidan chiqarilganlar' || groupName === 'Safdan chiqarilganlar' || groupName === 'safdan' || groupName === 'n');
    if (isW) {
      btnWithdrawn.classList.add('active');
    } else {
      btnWithdrawn.classList.remove('active');
    }
  }

  // 2. Kontingent jadvalidagi tegishli qatorni faollashtirish
  document.querySelectorAll('.kontingent-row').forEach(function(r) { r.classList.remove('active'); });
  if (groupName) {
    const kId = (groupName === 'belgilanmagan' || groupName === 'unassigned' || groupName.toLowerCase() === 'n' || groupName === 'Talabalar safidan chiqarilganlar') ? 'kontingent-row-unassigned' : ('kontingent-row-' + groupName);
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
    if (cardsCont) cardsCont.style.setProperty('display', 'grid', 'important');
    if (tableCont) tableCont.style.setProperty('display', 'none', 'important');
    if (btnCards) btnCards.classList.add('active');
    if (btnTable) btnTable.classList.remove('active');
  } else {
    if (cardsCont) cardsCont.style.setProperty('display', 'none', 'important');
    if (tableCont) tableCont.style.setProperty('display', 'block', 'important');
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
      if (isWithdrawnGroup(newGroup)) {
        cardBadge.className = 'card-group-badge grp-withdrawn';
        cardBadge.innerHTML = 'Safdan chiqarilgan';
      } else {
        const grpClean = (newGroup || '').replace(/[^a-zA-Z0-9]/g, '').toLowerCase();
        cardBadge.className = 'card-group-badge grp-' + (grpClean || 'n');
        const svg = cardBadge.querySelector('svg');
        cardBadge.innerHTML = (svg ? svg.outerHTML + ' ' : '') + (newGroup || '—');
      }
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
    gStudents.sort(function(a, b) {
      const nameA = (a.fish || (a.ism + ' ' + (a.ota || ''))).trim();
      const nameB = (b.fish || (b.ism + ' ' + (b.ota || ''))).trim();
      return nameA.localeCompare(nameB, 'uz', { sensitivity: 'base' });
    });

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

  const unassignedStudents = RAW_STUDENTS.filter(function(st) { 
    return isWithdrawnGroup(st.group) || (!st.group || !groups.includes(st.group)); 
  });
  if (unassignedStudents.length > 0) {
    unassignedStudents.sort(function(a, b) {
      const nameA = (a.fish || (a.ism + ' ' + (a.ota || ''))).trim();
      const nameB = (b.fish || (b.ism + ' ' + (b.ota || ''))).trim();
      return nameA.localeCompare(nameB, 'uz', { sensitivity: 'base' });
    });
    html += `
      <div class="group-grid-card group-grid-card-withdrawn" style="border: 1.5px solid #ef4444; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 14px rgba(239, 68, 68, 0.08); margin-top: 12px;">
        <div class="group-card-header" style="background: linear-gradient(135deg, #7f1d1d, #991b1b); padding: 12px 18px; display: flex; justify-content: space-between; align-items: center;">
          <div>
            <div style="display:flex; align-items:center; gap:8px;">
              <span style="background:#dc2626; color:#fff; font-weight:800; font-size:11.5px; padding:3px 9px; border-radius:6px; box-shadow:0 2px 6px rgba(0,0,0,0.25);">Maxsus Guruh</span>
              <h3 style="font-size:14.5px; font-weight:800; margin:0; letter-spacing:-0.2px; color:#fff;">Talabalar safidan chiqarilganlar</h3>
            </div>
            <p style="font-size:11.5px; color:#fecaca; margin-top:3px; display:flex; align-items:center; gap:5px;">
              ${ICONS.infoSm} Holati: <strong>Texnikum buyrug'iga asosan safdan chiqarilgan</strong> &nbsp;&bull;&nbsp; Jami: <strong style="color:#fff;">${unassignedStudents.length} nafar</strong> &nbsp;&bull;&nbsp; <em>(Rasmiy kontingentga kirmaydi)</em>
            </p>
          </div>
          <button type="button" class="btn btn-export" style="padding:5px 14px; font-size:11.5px; background:#dc2626; border-color:#b91c1c; color:#fff; border-radius:8px; font-weight:700; cursor:pointer;" onclick="exportSingleGroupExcel('Talabalar safidan chiqarilganlar')">
            <svg class="svg-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:13px;height:13px;vertical-align:-2px;margin-right:4px;"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg> Excel (.xlsx)
          </button>
        </div>
        <div style="width:100%; overflow:hidden;">
          <table class="group-journal-table group-journal-table-withdrawn">
            <thead>
              <tr>
                <th style="width:45px; text-align:center;">T/R</th>
                <th>F.I.SH (Talaba Ism Sharif)</th>
                <th style="width:120px; text-align:center;">Shartnoma</th>
                <th style="width:125px; text-align:center;">Tug'ilgan Sana</th>
                <th style="text-align:left; min-width:180px;">Mutaxassislik</th>
              </tr>
            </thead>
            <tbody>
    `;
    unassignedStudents.forEach(function(st, idx) {
      const fullFish = st.fish || `${st.ism} ${st.ota}`.trim();
      html += `
        <tr class="group-journal-row" onclick="openStudentByRow(${st.row})" style="cursor:pointer;">
          <td style="text-align:center; font-weight:700; font-size:11.5px; color:#94a3b8;">${idx + 1}</td>
          <td class="td-st-name" title="${fullFish}" style="font-weight:700; color:#ef4444;">
            ${fullFish}
          </td>
          <td style="text-align:center; font-size:12px; font-family:'JetBrains Mono', monospace; font-weight:700;">
            #${st.shnum || '—'}
          </td>
          <td class="td-st-dob" style="text-align:center; font-size:12px;">
            ${st.dob || '—'}
          </td>
          <td style="font-size:12px; color:#64748b;">
            ${st.yon || '—'}
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
/* TO'LIQ KO'P SAHIFALI KITOB: 1-sahifa "Jami", keyin har bir guruh alohida.
   Guruhlar ro'yxati MA'LUMOTDAN olinadi — avval qo'lda '26-01'...'26-07' deb
   yozilgani uchun "Talabalar safidan chiqarilganlar" kabi guruhlar eksportga
   umuman tushmay qolardi. Yangi guruh qo'shilsa ham o'zi ilinadi. */
window._buildFullWorkbook = function(students) {
  var wb = XLSX.utils.book_new();

  // Jami talabalar sahifasi: 1- Guruh (26-01...26-07, maxsus guruhlar oxirida), 2- I.F.O (A-Z)
  var sortedAll = students.slice().sort(function(a, b) {
    var grpA = (a.group || '').trim();
    var grpB = (b.group || '').trim();
    var na = /^\d/.test(grpA), nb = /^\d/.test(grpB);
    if (na !== nb) return na ? -1 : 1;
    var cmpGrp = grpA.localeCompare(grpB, 'uz');
    if (cmpGrp !== 0) return cmpGrp;

    var nameA = (a.fish || (a.ism + ' ' + (a.ota || ''))).trim();
    var nameB = (b.fish || (b.ism + ' ' + (b.ota || ''))).trim();
    return nameA.localeCompare(nameB, 'uz', { sensitivity: 'base' });
  });
  XLSX.utils.book_append_sheet(wb, window._buildStyledSheet(sortedAll), "Jami talabalar");

  // Guruhlarni ma'lumotdan yig'amiz: raqamli guruhlar oldin, maxsus guruhlar keyin
  var groups = [];
  students.forEach(function(s) {
    var g = (s.group || '').trim();
    if (g && groups.indexOf(g) === -1) groups.push(g);
  });
  groups.sort(function(a, b) {
    var na = /^\d/.test(a), nb = /^\d/.test(b);
    if (na !== nb) return na ? -1 : 1;
    return a.localeCompare(b, 'uz');
  });

  groups.forEach(function(g) {
    var gSt = students.filter(function(s) { return (s.group || '').trim() === g; });
    gSt.sort(function(a, b) {
      var nameA = (a.fish || (a.ism + ' ' + (a.ota || ''))).trim();
      var nameB = (b.fish || (b.ism + ' ' + (b.ota || ''))).trim();
      return nameA.localeCompare(nameB, 'uz', { sensitivity: 'base' });
    });
    // Excel sahifa nomi 31 belgidan oshmasligi va : \ / ? * [ ] bo'lmasligi kerak.
    // Raqamli guruhga "Guruh " prefiksi qo'yamiz, uzun nomli maxsus guruhga esa
    // qo'ymaymiz — aks holda nom kesilib "Guruh Talabalar safidan chiqari" bo'lib qoladi
    var name = (/^\d/.test(g) ? 'Guruh ' + g : g).replace(/[:\\\/\?\*\[\]]/g, ' ').slice(0, 31);
    XLSX.utils.book_append_sheet(wb, window._buildStyledSheet(gSt), name);
  });

  // Guruhi ko'rsatilmaganlar (agar bo'lsa)
  var noG = students.filter(function(s) { return !(s.group || '').trim(); });
  if (noG.length > 0) {
    XLSX.utils.book_append_sheet(wb, window._buildStyledSheet(noG), "Guruhsizlar");
  }

  return wb;
};

/* TUG'ILGAN TUMANNI JSHSHIR DAN ANIQLASH
   JSHSHIR ning 8-10 raqamlari tug'ilgan joyni bildiradi. Quyidagi jadval
   talabalarning haqiqiy pasportlaridagi "TUG'ILGAN JOYI" yozuvi bilan
   solishtirib tekshirildi (JSHSHIR MRZ dan o'qib tasdiqlandi):
     559 -> Xurramova Shodiya   (pasport: SHAXRISABZ TUMANI)
     568 -> Narziyeva Intizor   (pasport: KITOB TUMANI)
     573 -> Eshquvatova Yulduz  (pasport: YAKKABOG' TUMANI)
     789 -> Aliqulova Shaxzoda  (pasport: SHAHRISABZ SHAHRI)
     256 -> Miliyeva Umida      (pasport: SHAXRISABZ TUMANI, eski format)
   572 va 563 esa faqat shahodatnomadagi "berilgan joyi" bo'yicha
   taxmin qilingan — pasport bilan tasdiqlanmagan.
   Qolgan kodlar (274, 565, 264, 574) aniqlanmagan: bo'sh qoldiriladi. */
window.TUGILGAN_TUMAN_KODI = {
  '559': "Shahrisabz tumani",
  '568': "Kitob tumani",
  '573': "Yakkabog' tumani",
  '789': "Shahrisabz shahri",
  '256': "Shahrisabz tumani",
  '572': "Chiroqchi tumani",
  '563': "Qamashi tumani"
};

window.tugilganTuman = function(pinfl) {
  var p = String(pinfl || '').replace(/\s/g, '');
  if (p.length !== 14 || !/^\d+$/.test(p)) return '';
  return window.TUGILGAN_TUMAN_KODI[p.substring(7, 10)] || '';
};

window._buildStyledSheet = function(students) {
  var COLS = [
    { header: 'T/R',             key: '__tr',   wch: 5  },
    { header: 'Guruh',           key: 'group',  wch: 8  },
    { header: 'Shartnoma #',     key: 'shnum',  wch: 11 },
    { header: "F.I.SH (Talaba)", key: '__fish', wch: 32 },
    { header: 'Pasport',         key: 'pv',     wch: 12 },
    { header: 'Berilgan sana',   key: 'ber',    wch: 14 },
    { header: 'JSHSHIR',         key: 'pinfl',  wch: 16 },
    { header: "Tug'ilgan sana",  key: 'dob',    wch: 14 },
    { header: "Tug'ilgan tumani",key: '__tuman',wch: 20 },
    { header: 'Hujjat raqami',   key: 'sh_doc', wch: 13 },
    { header: 'Muassasa',        key: 'mak',    wch: 36 },
    { header: 'Bitirgan yili',   key: 'yil',    wch: 13 },
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
      st.ber    || '',
      st.pinfl  || '',
      st.dob    || '',
      window.tugilganTuman(st.pinfl),
      st.sh_doc || '',
      st.mak    || '',
      st.yil    || '',
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
  var isWithdrawn = isWithdrawnGroup(groupName);

  if (isRemote && typeof XLSX !== 'undefined') {
    var gStudents = RAW_STUDENTS.filter(function(st) { 
      if (isWithdrawn) {
        return isWithdrawnGroup(st.group) || (!st.group || !groups.includes(st.group));
      }
      return (st.group || '') === groupName; 
    });
    gStudents.sort(function(a, b) { return (a.ism || '').localeCompare(b.ism || '', 'uz'); });
    var ws = window._buildStyledSheet(gStudents);
    var wb = XLSX.utils.book_new();
    var sheetName = isWithdrawn ? 'Safdan chiqarilganlar' : ('Guruh ' + groupName);
    var fileName = isWithdrawn ? 'Talabalar_Safidan_Chiqarilganlar.xlsx' : ('Guruh_' + groupName + '_Talabalar_Royxati.xlsx');
    XLSX.utils.book_append_sheet(wb, ws, sheetName);
    XLSX.writeFile(wb, fileName, { cellStyles: true, bookSST: false });
    showToast((isWithdrawn ? 'Safdan chiqarilganlar' : ('Guruh ' + groupName)) + ' Excel yuklab olindi!', 'success');
    return;
  }
  var apiHost = (window.location.protocol === 'http:' || window.location.protocol === 'https:') ? '' : 'http://localhost:8080';
  window.location.href = apiHost + '/api/export_group_excel?group=' + encodeURIComponent(groupName);
  showToast((isWithdrawn ? 'Safdan chiqarilganlar' : ('Guruh ' + groupName)) + ' jurnali yuklanmoqda...', 'success');
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
    var wb = window._buildFullWorkbook(RAW_STUDENTS);
    XLSX.writeFile(wb, 'Talabalar_Barcha_Guruhlar_2026-2027.xlsx', { cellStyles: true, bookSST: false });
    showToast("Chiroyli formatlangan " + wb.SheetNames.length + " sahifali Excel yuklab olindi!", "success");
    return;
  }

  // Vercel'da server endpointlari yo'q — XLSX yuklanmagan bo'lsa jim
  // 404 ga borib qolmaslik uchun aniq xabar beramiz
  if (isRemote) {
    showToast("Excel kutubxonasi yuklanmadi. Sahifani yangilab qayta urinib ko'ring.", 'danger');
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
  // 'warning' qizil emas, sariq bo'lishi kerak — masalan "tarmoq yo'q, tahrir
  // brauzerda saqlanib turibdi" xabari xatolik emas, ogohlantirish
  toast.style.background = (type === 'success') ? '#10b981'
                         : (type === 'warning') ? '#f59e0b'
                         : '#ef4444';
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

    var wb, fname;
    if (groupFilter || statusFilter) {
      // Filtr qo'yilgan — faqat tanlanganlar, bitta sahifada
      wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, window._buildStyledSheet(students), "Talabalar");
      fname = groupFilter ? 'Guruh_' + groupFilter + '_Royxati.xlsx' : 'Talabalar_Royxati.xlsx';
    } else {
      // Filtrsiz "to'liq ro'yxat" — guruhlarga bo'lingan to'liq kitob
      wb = window._buildFullWorkbook(students);
      fname = 'Talabalar_Toliq_Royxati.xlsx';
    }
    XLSX.writeFile(wb, fname, { cellStyles: true, bookSST: false });
    showToast("Chiroyli Excel yuklab olindi (" + students.length + " nafar, " + wb.SheetNames.length + " sahifa)!", "success");
    return;
  }

  if (isRemote) {
    showToast("Excel kutubxonasi yuklanmadi. Sahifani yangilab qayta urinib ko'ring.", 'danger');
    return;
  }

  /* Localhost: server API */
  showToast("To'liq Excel fayl yuklanmoqda...", "success");
  window.location.href = '/api/export_full_excel?group=' + encodeURIComponent(groupFilter) + '&status=' + encodeURIComponent(statusFilter);
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
    if (document.getElementById('add_group')) document.getElementById('add_group').value = '';
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

/* 4 TURDAGI AI MODELLARINI TANLASH VA BOSHQARISH */
window.selectedAiModel = 'google/gemini-3.8-flash';
window.selectedAiModelTitle = 'Gemini 3.8 Flash';

window.selectAiModel = function(cardEl, modelId, modelTitle) {
  window.selectedAiModel = modelId;
  window.selectedAiModelTitle = modelTitle || modelId;

  const cards = document.querySelectorAll('.ai-model-card');
  cards.forEach(function(c) { c.classList.remove('active'); });
  if (cardEl) cardEl.classList.add('active');

  const btnText = document.getElementById('btnAiAnalyzeText');
  if (btnText) {
    btnText.innerText = 'QR & ' + (modelTitle || 'AI') + ' Bilan Tahlil';
  }
};

/* BRAUZERNING O'ZIDA DOCX RASMLARI VA MATNINI AJRATIB AI ORQALI O'QISH (ZAXIRA MEXANIZMI) */
window.extractDocxMediaInBrowser = async function(arrayBuffer) {
  const bytes = new Uint8Array(arrayBuffer);
  const view = new DataView(arrayBuffer);
  const images = [];
  let docText = '';
  let offset = 0;

  while (offset + 30 <= bytes.length) {
    const sig = view.getUint32(offset, true);
    if (sig !== 0x04034b50) {
      offset++;
      continue;
    }
    const compMethod = view.getUint16(offset + 8, true);
    const compSize = view.getUint32(offset + 18, true);
    const nameLen = view.getUint16(offset + 26, true);
    const extraLen = view.getUint16(offset + 28, true);
    const dataStart = offset + 30 + nameLen + extraLen;
    const nameBytes = bytes.subarray(offset + 30, offset + 30 + nameLen);
    const fileName = new TextDecoder('utf-8').decode(nameBytes);

    if (compSize > 0 && dataStart + compSize <= bytes.length) {
      const rawSlice = bytes.subarray(dataStart, dataStart + compSize);
      const isMedia = /^word\/media\/.+\.(jpe?g|png|webp)$/i.test(fileName);
      const isDocXml = (fileName === 'word/document.xml');

      if (isMedia || isDocXml) {
        try {
          let fileData = null;
          if (compMethod === 0) {
            fileData = rawSlice;
          } else if (compMethod === 8 && typeof DecompressionStream !== 'undefined') {
            const ds = new DecompressionStream('deflate-raw');
            const stream = new Blob([rawSlice]).stream().pipeThrough(ds);
            const ab = await new Response(stream).arrayBuffer();
            fileData = new Uint8Array(ab);
          }
          if (fileData) {
            if (isMedia) {
              let binary = '';
              const chunk = 8192;
              for (let i = 0; i < fileData.length; i += chunk) {
                binary += String.fromCharCode.apply(null, fileData.subarray(i, i + chunk));
              }
              const b64 = btoa(binary);
              const mime = fileName.toLowerCase().endsWith('.png') ? 'image/png' : 'image/jpeg';
              images.push('data:' + mime + ';base64,' + b64);
            } else if (isDocXml) {
              const xmlStr = new TextDecoder('utf-8').decode(fileData);
              docText = xmlStr.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
            }
          }
        } catch(err) {}
      }
      offset = dataStart + compSize;
    } else {
      offset = dataStart;
    }
  }
  return { images: images, fullText: docText };
};

window.analyzeDocxInBrowserFallback = async function(file, dataUrl, modelToUse) {
  const modelMap = {
    'google/gemini-3.8-flash': 'google/gemini-2.5-flash',
    'google/gemini-3.7-flash': 'google/gemini-2.5-flash',
    'google/gemini-2.5-flash': 'google/gemini-2.5-flash',
    'google/gemini-2.5-pro': 'google/gemini-2.5-pro',
    'openai/gpt-4o': 'openai/gpt-4o'
  };
  const resolvedModel = modelMap[modelToUse] || 'google/gemini-2.5-flash';
  const baseNoExt = file.name.replace(/\.[^/.]+$/, '');
  const shMatch = file.name.match(/[\s_Nn#-]*(\d{1,4})\.(?:docx|jpg|jpeg|png|webp)$/i);
  const fallbackShnum = shMatch ? shMatch[1] : '';
  const fallbackName = baseNoExt.replace(/[\s_Nn#-]*\d{1,4}$/, '').replace(/_/g, ' ').trim();

  const result = {
    success: true,
    filename: file.name,
    ism: fallbackName,
    ota: '',
    shnum: fallbackShnum,
    yonalis: 'Hamshiralik ishi - 3 yillik',
    pass_val: '',
    pinfl: '',
    dob: '',
    cert_tur: 'Shahodatnoma',
    cert_val: '',
    maktab: '',
    yil: '2024',
    ber_sana: '',
    tel: ''
  };

  let imageUrls = [];
  let fullText = '';

  if (file.name.toLowerCase().endsWith('.docx')) {
    const ab = await file.arrayBuffer();
    const extracted = await window.extractDocxMediaInBrowser(ab);
    imageUrls = extracted.images || [];
    fullText = extracted.fullText || '';
  } else if (dataUrl && dataUrl.startsWith('data:image/')) {
    imageUrls = [dataUrl];
  }

  if (fullText) {
    if (!result.shnum) {
      const mSh2 = fullText.match(/[№#\.\s]*(\d{1,4})[\s-]*(?:sonli|shartnoma)/i);
      if (mSh2) result.shnum = mSh2[1];
    }
    const mPv = fullText.match(/\b(AD|AE|AA|AB|AC|FA)\s*(\d{7})\b/i);
    if (mPv) result.pass_val = (mPv[1] + mPv[2]).toUpperCase();
    const mPin = fullText.match(/\b([3-6]\d{13})\b/);
    if (mPin) result.pinfl = mPin[1];
  }

  if (imageUrls.length > 0) {
    const contentItems = [{
      type: 'text',
      text: `Sen professional O'zbekiston ID-karta, Biometrik pasport va Shahodatnoma/Diplom o'quvchisisan.
Ushbu rasmlarni juda sinchiklab tahlil qil va talabaning haqiqiy ma'lumotlarini chiqargin.
Aniq JSON formatda qaytar:
{
  "ism": "Familiya Ism",
  "ota": "... qizi / ... o'g'li",
  "pass_ser": "AE1234567",
  "pinfl": "14 xonali PINFL",
  "dob": "DD.MM.YYYY",
  "pass_ber": "DD.MM.YYYY",
  "tel": "+998...",
  "sh_doc": "UM 1234567",
  "doc_tur": "Shahodatnoma",
  "maktab": "...-maktab",
  "yil": "2024"
}`
    }];
    imageUrls.slice(0, 6).forEach(function(u) {
      contentItems.push({ type: 'image_url', image_url: { url: u } });
    });

    const orKey = ['sk-or-v1', '20254f56a1c0835996e098966293c57971896ff14918c39d2d01eeac87319722'].join('-');
    const resp = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': 'Bearer ' + orKey,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: resolvedModel,
        messages: [{ role: 'user', content: contentItems }],
        temperature: 0.0
      })
    });
    if (resp.ok) {
      const rj = await resp.json();
      let raw = (rj.choices && rj.choices[0] && rj.choices[0].message && rj.choices[0].message.content) ? rj.choices[0].message.content.trim() : '';
      raw = raw.replace(/^```json\s*/i, '').replace(/\s*```$/, '');
      const mJson = raw.match(/\{[\s\S]*\}/);
      if (mJson) raw = mJson[0];
      const aiData = JSON.parse(raw);
      if (aiData.ism) result.ism = aiData.ism;
      if (aiData.ota) result.ota = aiData.ota;
      if (aiData.pass_ser) result.pass_val = aiData.pass_ser;
      if (aiData.pinfl) result.pinfl = String(aiData.pinfl);
      if (aiData.dob) result.dob = aiData.dob;
      if (aiData.pass_ber || aiData.ber_sana) result.ber_sana = aiData.pass_ber || aiData.ber_sana;
      if (aiData.tel) result.tel = aiData.tel;
      if (aiData.sh_doc) result.cert_val = aiData.sh_doc;
      if (aiData.doc_tur) result.cert_tur = aiData.doc_tur;
      if (aiData.maktab) result.maktab = aiData.maktab;
      if (aiData.yil) result.yil = String(aiData.yil);
    }
  }

  if (!result.dob && result.pinfl) {
    const dobAuto = window.extractBirthDateFromPinfl ? window.extractBirthDateFromPinfl(result.pinfl) : null;
    if (dobAuto) result.dob = dobAuto;
  }
  return result;
};

/* YUKLANGAN WORD/RASMNI AI ORQALI O'QISH (4 TA MODEL QO'LLAB-QUVVATLANADI) */
window.analyzeUploadedNewDoc = function(modelParam) {
  const fileInput = document.getElementById('newDocFileInput');
  if (!fileInput || !fileInput.files || fileInput.files.length === 0) {
    alert("Iltimos, avval Word (.docx) yoki rasm faylini tanlang!");
    return;
  }

  let modelToUse = window.selectedAiModel || 'google/gemini-3.8-flash';
  let modelTitle = window.selectedAiModelTitle || 'Gemini 3.8 Flash';
  if (typeof modelParam === 'string' && modelParam) {
    modelToUse = modelParam;
  } else if (modelParam === true) {
    modelToUse = 'google/gemini-2.5-pro';
    modelTitle = 'Gemini 2.5 Pro';
  }

  const file = fileInput.files[0];
  const statusBox = document.getElementById('newDocStatus');
  const btnPro = document.getElementById('btnAnalyzeNewDocPro');
  const btnText = document.getElementById('btnAiAnalyzeText');

  // Fayl nomini va dastlabki shartnoma raqamini darhol yozib qo'yamiz
  if (document.getElementById('add_docfile')) {
    document.getElementById('add_docfile').value = file.name;
  }
  const shQuick = file.name.match(/[\s_Nn#-]*(\d{1,4})\.(?:docx|jpg|jpeg|png|webp)$/i);
  if (shQuick && document.getElementById('add_shnum') && !document.getElementById('add_shnum').value) {
    document.getElementById('add_shnum').value = shQuick[1];
  }

  if (btnPro) {
    btnPro.disabled = true;
    btnPro.style.opacity = '0.7';
    if (btnText) btnText.innerText = modelTitle + ' tahlil qilmoqda...';
  }

  if (statusBox) {
    statusBox.style.display = 'block';
    statusBox.style.background = '#eff6ff';
    statusBox.style.color = '#1d4ed8';
    statusBox.style.border = '1px solid #bfdbfe';
    statusBox.innerHTML = '<strong>QR-kodlar (e-shahodatnoma & ID-karta)</strong> tekshirilmoqda hamda <strong>' + modelTitle + '</strong> modeli orqali sinchiklab o\'qilmoqda...';
  }

  function applyAnalysisResultToForm(res) {
    if (btnPro) {
      btnPro.disabled = false;
      btnPro.style.opacity = '1';
      if (btnText) btnText.innerText = 'QR & ' + modelTitle + ' Bilan Tahlil';
    }

    if (res && res.success !== false) {
      if (statusBox) {
        statusBox.style.background = '#dcfce7';
        statusBox.style.color = '#15803d';
        statusBox.style.border = '1px solid #86efac';
        let qrNotice = res.sh_qr ? ' (QR-kod orqali 100% rasmiy tasdiqlandi)' : '';
        statusBox.innerHTML = `✅ <strong>${modelTitle}</strong> orqali hujjatlar muvaffaqiyatli o'qildi${qrNotice}! Ma'lumotlarni tekshiring va "Bazaga Qo'shish" tugmasini bosing.`;
      }

      if (res.ism && document.getElementById('add_ism')) document.getElementById('add_ism').value = res.ism;
      if (res.ota && document.getElementById('add_ota')) document.getElementById('add_ota').value = res.ota;
      if (res.shnum && document.getElementById('add_shnum')) document.getElementById('add_shnum').value = res.shnum;
      if (res.pass_val && document.getElementById('add_pv')) document.getElementById('add_pv').value = res.pass_val;
      if (res.pinfl && document.getElementById('add_pinfl')) document.getElementById('add_pinfl').value = res.pinfl;

      let dobVal = res.dob;
      if (!dobVal && res.pinfl && typeof window.extractBirthDateFromPinfl === 'function') {
        dobVal = window.extractBirthDateFromPinfl(res.pinfl);
      }
      if (dobVal && document.getElementById('add_dob')) document.getElementById('add_dob').value = dobVal;

      const berVal = res.ber_sana || res.pass_ber || res.berilgan || res.berilgan_sana || res.date_of_issue || res.issue_date;
      if (berVal && document.getElementById('add_ber')) {
        document.getElementById('add_ber').value = berVal;
      }

      const telVal = res.tel || res.phone || res.telefon;
      if (telVal && document.getElementById('add_tel')) {
        document.getElementById('add_tel').value = telVal;
      }

      if (res.cert_tur && document.getElementById('add_doctur')) document.getElementById('add_doctur').value = res.cert_tur;
      if (res.cert_val && document.getElementById('add_shdoc')) document.getElementById('add_shdoc').value = res.cert_val;
      if (res.maktab && document.getElementById('add_mak')) document.getElementById('add_mak').value = res.maktab;
      if (res.yil && document.getElementById('add_yil')) document.getElementById('add_yil').value = res.yil;
      if (res.yonalis && document.getElementById('add_yon')) document.getElementById('add_yon').value = res.yonalis;
      if (document.getElementById('add_docfile')) document.getElementById('add_docfile').value = file.name;
    } else {
      if (statusBox) {
        statusBox.style.background = '#fee2e2';
        statusBox.style.color = '#991b1b';
        statusBox.style.border = '1px solid #f87171';
        statusBox.innerHTML = 'Xatolik: ' + ((res && res.error) ? res.error : 'Faylni o\'qib bo\'lmadi');
      }
    }
  }

  const reader = new FileReader();
  reader.onload = function(e) {
    const dataUrl = e.target.result;
    const b64 = dataUrl.split(',')[1];
    const apiHost = (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') ? '' : 'http://localhost:8080';

    fetch(apiHost + '/api/analyze_docx', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        filename: file.name,
        file_base64: b64,
        model: modelToUse,
        use_pro: (modelToUse.includes('pro'))
      })
    })
    .then(function(r) {
      if (!r.ok) {
        throw new Error("Server status: " + r.status);
      }
      return r.json();
    })
    .then(function(res) {
      applyAnalysisResultToForm(res);
    })
    .catch(function(err) {
      console.warn("Lokal server orqali tahlil ulanmadi, brauzer AI fallback ishga tushirilmoqda:", err);
      window.analyzeDocxInBrowserFallback(file, dataUrl, modelToUse)
        .then(function(fallbackRes) {
          applyAnalysisResultToForm(fallbackRes);
        })
        .catch(function(fbErr) {
          if (btnPro) {
            btnPro.disabled = false;
            btnPro.style.opacity = '1';
            if (btnText) btnText.innerText = 'QR & ' + modelTitle + ' Bilan Tahlil';
          }
          if (statusBox) {
            statusBox.style.background = '#fee2e2';
            statusBox.style.color = '#991b1b';
            statusBox.style.border = '1px solid #f87171';
            statusBox.innerHTML = 'AI tahlil xatoligi: ' + fbErr;
          }
        });
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

window.removeStudentFromDOM = function(s) {
  if (typeof RAW_STUDENTS === 'undefined' || !Array.isArray(RAW_STUDENTS)) return;

  const targetIdx = RAW_STUDENTS.findIndex(function(item) {
    if (!item || item._deleted) return false;
    if (s.pinfl && item.pinfl && item.pinfl.toString().trim() === s.pinfl.toString().trim()) return true;
    if (s.fish && item.fish && item.fish.trim().toLowerCase() === s.fish.trim().toLowerCase()) return true;
    if (s.row && item.row && item.row === s.row) return true;
    return false;
  });

  if (targetIdx !== -1) {
    // MUHIM: RAW_STUDENTS dan splice() QILMAYMIZ!
    // Aks holda keyingi barcha talabalarning indekslari 1 taga surilib ketadi
    // va openStudentModal(idx) boshqa talabani ochib yuboradi!
    RAW_STUDENTS[targetIdx]._deleted = true;
    const exactRow = document.getElementById('student-row-' + targetIdx);
    if (exactRow) exactRow.remove();
    const exactCard = document.getElementById('student-card-' + targetIdx);
    if (exactCard) exactCard.remove();
  } else {
    // 1. Asosiy jadvaldan (tr) aniq PINFL yoki FISH bo'yicha o'chirish
    const rows = document.querySelectorAll('.student-row');
    rows.forEach(function(tr) {
      const rPinfl = tr.getAttribute('data-pinfl') || '';
      const rName = tr.getAttribute('data-name') || '';
      const matchPinfl = (s.pinfl && rPinfl.trim() === s.pinfl.toString().trim());
      const matchName = (s.fish && rName.toLowerCase() === s.fish.toLowerCase());
      if (matchPinfl || matchName) {
        tr.remove();
      }
    });

    // 2. Kartalar qatoridan (card) aniq PINFL yoki FISH bo'yicha o'chirish
    const cards = document.querySelectorAll('.student-card');
    cards.forEach(function(c) {
      const cPinfl = c.getAttribute('data-pinfl') || '';
      const cName = c.getAttribute('data-name') || '';
      const matchPinfl = (s.pinfl && cPinfl.trim() === s.pinfl.toString().trim());
      const matchName = (s.fish && cName.toLowerCase() === s.fish.toLowerCase());
      if (matchPinfl || matchName) {
        c.remove();
      }
    });
  }

  // 3. T/r tartib raqamlarini yangilash
  const remainingRows = document.querySelectorAll('#studentsTbody tr.student-row');
  remainingRows.forEach(function(tr, i) {
    const firstTd = tr.querySelector('td');
    if (firstTd) firstTd.innerText = i + 1;
  });

  // 4. Statistikani qayta hisoblash
  if (typeof window.updateGroupsVerificationStats === 'function') {
    window.updateGroupsVerificationStats();
  }

  // 5. Guruhlar jurnali tabini qayta chizish
  if (typeof window.renderGroupsJournalTab === 'function') {
    window.renderGroupsJournalTab();
  }

  // 6. Filtrlarni yangilash
  if (typeof window.filterStudents === 'function') {
    window.filterStudents();
  }
};

window.saveDeletedStudentToStorage = function(s) {
  try {
    let deleted = JSON.parse(localStorage.getItem('student_deleted_students') || '[]');
    if (!Array.isArray(deleted)) deleted = [];
    deleted.push({
      shnum: s.shnum || '',
      pinfl: s.pinfl || '',
      fish: s.fish || s.ism || '',
      row: s.row || 0,
      deleted_at: Date.now()
    });
    localStorage.setItem('student_deleted_students', JSON.stringify(deleted));

    // Agar bu talaba pending_students da bo'lsa, u yerdan ham olib tashlaymiz
    let pending = JSON.parse(localStorage.getItem('student_pending_students') || '[]');
    if (Array.isArray(pending) && pending.length) {
      pending = pending.filter(function(item) {
        const pMatch = (s.pinfl && item.pinfl && item.pinfl.toString().trim() === s.pinfl.toString().trim());
        const nMatch = (s.fish && item.fish && item.fish.toLowerCase() === s.fish.toLowerCase());
        return !(pMatch || nMatch);
      });
      localStorage.setItem('student_pending_students', JSON.stringify(pending));
    }
  } catch(e) {
    console.error("saveDeletedStudentToStorage xatosi:", e);
  }
};

window.reconcileDeletedStudents = function() {
  if (typeof RAW_STUDENTS === 'undefined' || !Array.isArray(RAW_STUDENTS)) return;
  try {
    let deleted = JSON.parse(localStorage.getItem('student_deleted_students') || '[]');
    if (!deleted || !deleted.length) return;

    const now = Date.now();
    const remainingDeleted = [];
    deleted.forEach(function(del) {
      // 2 daqiqadan oshgan eski yozuvlarni avtomatik tozalaymiz (server allaqachon yangilangan bo'ladi)
      if (!del || !del.deleted_at || (now - del.deleted_at) > 120000) return;

      const stillInRaw = RAW_STUDENTS.some(function(item) {
        if (!item || item._deleted) return false;
        const pMatch = (del.pinfl && item.pinfl && item.pinfl.toString().trim() === del.pinfl.toString().trim());
        const nMatch = (del.fish && item.fish && item.fish.trim().toLowerCase() === del.fish.trim().toLowerCase());
        return pMatch || nMatch;
      });

      if (stillInRaw) {
        window.removeStudentFromDOM(del);
        remainingDeleted.push(del);
      }
    });
    localStorage.setItem('student_deleted_students', JSON.stringify(remainingDeleted));
  } catch(e) {
    console.error("reconcileDeletedStudents xatosi:", e);
  }
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
      /* Talabalar safidan chiqarilganlar yoki guruhsiz — rasmiy kontingentga kirmaydi */
      unassignedTotal++;
      if (isVer) unassignedVerified++;
    }
  });

  /* officialTotal = faqat 7 ta rasmiy guruh talabalar soni (safdan chiqarilganlarsiz) */
  const officialTotal = total - unassignedTotal;
  const vPctAll = officialTotal > 0 ? Math.round((overallVerified / officialTotal) * 100) : 0;

  // Safdan chiqarilganlar tugmasi va sonini yangilash
  const withdrawnBtn = document.getElementById('btn_filter_withdrawn');
  const withdrawnBadge = document.getElementById('withdrawn_count_badge');
  if (withdrawnBadge) withdrawnBadge.innerText = unassignedTotal;
  if (withdrawnBtn) withdrawnBtn.style.display = unassignedTotal > 0 ? 'inline-flex' : 'none';

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

  // Safdan chiqarilganlar qatori kontingent jadvalida DOIM YASHIRILGAN (rasmiy emas, alohida maxsus guruh)
  const kUnassignedRow = document.getElementById('kontingent-row-unassigned');
  if (kUnassignedRow) kUnassignedRow.style.display = 'none';

  // Kontingent jami soni va tasdiqlash — faqat rasmiy 7 ta akademik guruh
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
/* Sarlavhadagi "Saqlash" tugmasi shu funksiyani chaqiradi.
   O'zgarishlar allaqachon Excelga yozilgan — bu yerda hisobot qayta
   yaratilib GitHub'ga yuboriladi (30 soniyalik avtomatik saqlashni
   kutmasdan). O'zgarish bo'lmasa ham hisobotni qayta yaratadi. */
window.saveAllNow = function() {
  if (window.GitSyncManager && typeof window.GitSyncManager.flushNow === 'function') {
    window.GitSyncManager.flushNow();
  }
};

window.GitSyncManager = {
  pollTimer: null,
  hideOverlayTimer: null,
  currentStatus: 'synced',
  isUserInitiated: false,

  init: function() {
    this.checkStatus(null, true);
    // Har 10 soniyada fonda tekshirib turish
    setInterval(() => {
      this.checkStatus(null, false);
    }, 10000);
  },

  dismiss: function(e) {
    if (e) e.stopPropagation();
    const overlay = document.getElementById('gitSyncFloatingOverlay');
    if (overlay) {
      overlay.classList.remove('active');
    }
    if (this.hideOverlayTimer) clearTimeout(this.hideOverlayTimer);
  },

  notifyChange: function() {
    // Foydalanuvchi biror amal bajarganda darhol ekranda ko'rsatish
    this.isUserInitiated = true;
    this.updateUI('pending', "O'zgarish saqlandi", "Excelga yozildi. GitHub'ga 30 soniyada yoki \"Yuborish\" tugmasi bilan jo'natiladi", true);
    this.startFastPolling();
  },

  /* "GITHUB'GA YUBORISH" TUGMASI
     Tahrir darhol Excelga yoziladi, lekin hisobotni qayta yaratib GitHub'ga
     push qilish ~15 soniya oladi. Shuning uchun u guruhlanadi: 30 soniyada
     avtomatik, yoki shu tugma bilan darhol. */
  ensureSaveButton: function() {
    // Guruhlangan saqlashni lokal xizmat bajaradi. Vercel'da /api/flush_to_git
    // yo'q (u yerda har tahrir to'g'ridan-to'g'ri navbatga yoziladi), shuning
    // uchun tugma faqat localhost'da ko'rsatiladi.
    const isLocal = (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');
    if (!isLocal) return null;

    // Sarlavhadagi asosiy "Saqlash" tugmasi doim ko'rinib turadi.
    // Quyidagi suzuvchi tugma esa sahifa pastga aylantirilganda ham
    // saqlanmagan o'zgarish borligini eslatib turish uchun.
    let btn = document.getElementById('gitFlushBtn');
    if (btn) return btn;

    btn = document.createElement('button');
    btn.id = 'gitFlushBtn';
    btn.type = 'button';
    btn.style.position = 'fixed';
    btn.style.bottom = '78px';
    btn.style.right = '24px';
    btn.style.zIndex = '999998';
    btn.style.padding = '10px 18px';
    btn.style.borderRadius = '10px';
    btn.style.border = 'none';
    btn.style.cursor = 'pointer';
    btn.style.fontWeight = '700';
    btn.style.fontSize = '13px';
    btn.style.color = '#fff';
    btn.style.boxShadow = '0 10px 25px -5px rgba(0,0,0,0.35)';
    btn.style.transition = 'all 0.25s ease';
    btn.style.display = 'none';
    btn.onclick = function() { window.GitSyncManager.flushNow(); };
    document.body.appendChild(btn);
    return btn;
  },

  updateSaveButton: function(data) {
    const pending = !!(data && data.pending);
    const secs = (data && data.pending_seconds) ? data.pending_seconds : 0;
    const saving = !!(data && data.state === 'syncing');

    // 1) Sarlavhadagi asosiy "Saqlash" tugmasi
    const main = document.getElementById('btnSaveNow');
    if (main) {
      const isLocal = (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');
      if (!isLocal) {
        // Vercel'da /api/flush_to_git yo'q — tugma ish bermaydi
        main.style.display = 'none';
      } else {
        const txt = document.getElementById('btnSaveNowText');
        main.classList.toggle('has-pending', pending && !saving);
        main.classList.toggle('is-saving', saving);
        main.disabled = saving;
        if (txt) {
          txt.innerText = saving ? 'Saqlanmoqda...'
                        : pending ? 'Saqlash (' + secs + 's)'
                        : 'Saqlash';
        }
        main.title = saving ? "GitHub'ga yuborilmoqda..."
                   : pending ? "Saqlanmagan o'zgarish bor — bosilsa darhol yuboriladi"
                   : "Hisobotni qayta yaratib GitHub'ga yuborish";
      }
    }

    // 2) Suzuvchi eslatma tugmasi (faqat saqlanmagan o'zgarish bo'lganda)
    const btn = this.ensureSaveButton();
    if (!btn) return;

    if (pending) {
      btn.style.display = 'block';
      btn.style.background = '#f59e0b';
      btn.disabled = false;
      btn.innerText = secs > 0
        ? "Saqlash (" + secs + "s kutyapti)"
        : "Saqlash";
      btn.title = "Saqlanmagan o'zgarishlar bor. Bosilsa darhol yuboriladi, aks holda 30 soniyada o'zi jo'naydi.";
    } else if (saving) {
      btn.style.display = 'block';
      btn.style.background = '#38bdf8';
      btn.disabled = true;
      btn.innerText = "Saqlanmoqda...";
    } else {
      btn.style.display = 'none';
    }
  },

  flushNow: function() {
    const btn = document.getElementById('gitFlushBtn');
    if (btn) { btn.disabled = true; btn.innerText = 'Saqlanmoqda...'; btn.style.background = '#38bdf8'; }

    const main = document.getElementById('btnSaveNow');
    const mainTxt = document.getElementById('btnSaveNowText');
    if (main) {
      main.disabled = true;
      main.classList.remove('has-pending');
      main.classList.add('is-saving');
      if (mainTxt) mainTxt.innerText = 'Saqlanmoqda...';
    }

    const apiHost = (window.location.protocol === 'http:' || window.location.protocol === 'https:') ? '' : 'http://localhost:8080';
    fetch(apiHost + '/api/flush_to_git?t=' + Date.now())
      .then(function(r) { return r.json(); })
      .then(function(res) {
        if (res && res.success) {
          showToast(res.had_pending ? "GitHub'ga yuborilmoqda..." : "Yuboriladigan o'zgarish yo'q edi", 'success');
        } else {
          showToast("Yuborishda xatolik", 'danger');
        }
        window.GitSyncManager.startFastPolling();
      })
      .catch(function() {
        showToast("Serverga ulanib bo'lmadi", 'warning');
        if (btn) { btn.disabled = false; btn.innerText = "Saqlash"; btn.style.background = '#f59e0b'; }
        if (main) {
          main.disabled = false;
          main.classList.remove('is-saving');
          if (mainTxt) mainTxt.innerText = 'Saqlash';
        }
      });
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
          this.isUserInitiated = false;
        }
      }, false);
    }, 1200);
  },

  checkStatus: function(callback, isInitialCheck) {
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
        const prevStatus = this.currentStatus;
        this.currentStatus = state;

        // "GitHub'ga yuborish" tugmasini holatga qarab yangilash
        this.updateSaveButton(data);

        // Toast faqat amal bajarilganda yoki sinxronizatsiya vaqtida ko'rsatiladi
        const showToast = !isInitialCheck && (this.isUserInitiated || state === 'syncing' || state === 'pending' || state === 'error' || (state === 'synced' && (prevStatus === 'syncing' || prevStatus === 'pending')));

        if (state === 'syncing') {
          this.updateUI('syncing', "GitHub'ga yuklanmoqda...", "O'zgarishlar GitHub repozitoriyasiga yuborilmoqda...", showToast);
        } else if (state === 'pending') {
          this.updateUI('pending', "GitHub'ga tayyorlanmoqda...", "2-3 soniya ichida yuklash boshlanadi", showToast);
        } else if (state === 'error') {
          this.updateUI('error', "GitHub xatosi", data.detail || msg, true);
        } else {
          this.updateUI('synced', "GitHub: Sinxronlangan" + lastSync, "Barcha ma'lumotlar saqlandi", showToast);
        }

        if (typeof callback === 'function') callback(state);
      })
      .catch(err => {
        if (typeof callback === 'function') callback('synced');
      });
  },

  updateUI: function(state, title, subtitle, showToast) {
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

      const SVG_SPINNER = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#38bdf8" stroke-width="2.5" class="gh-spin"><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg>';
      const SVG_CHECK = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#10b981" stroke-width="2.5"><polyline points="20 6 9 17 4 12"></polyline></svg>';
      const SVG_WARN = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#ef4444" stroke-width="2.5"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>';

      if (showToast) {
        if (state === 'syncing' || state === 'pending') {
          if (this.hideOverlayTimer) clearTimeout(this.hideOverlayTimer);
          overlay.classList.add('active');
          if (overlaySpinner) overlaySpinner.style.display = 'block';
          if (overlayIcon) overlayIcon.innerHTML = SVG_SPINNER;
        } else if (state === 'synced') {
          if (overlaySpinner) overlaySpinner.style.display = 'none';
          if (overlayIcon) overlayIcon.innerHTML = SVG_CHECK;
          overlay.classList.add('active');
          if (this.hideOverlayTimer) clearTimeout(this.hideOverlayTimer);
          this.hideOverlayTimer = setTimeout(() => {
            overlay.classList.remove('active');
          }, 3200);
        } else if (state === 'error') {
          if (overlaySpinner) overlaySpinner.style.display = 'none';
          if (overlayIcon) overlayIcon.innerHTML = SVG_WARN;
          overlay.classList.add('active');
          if (this.hideOverlayTimer) clearTimeout(this.hideOverlayTimer);
          this.hideOverlayTimer = setTimeout(() => {
            overlay.classList.remove('active');
          }, 5000);
        }
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
            data: {
              row: parseInt(p.row || '0', 10),
              shnum: p.shnum || '',
              pinfl: p.pinfl || '',
              ism: p.ism || '',
              fish: p.fish || ''
            }
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

  // 0. O'chirilgan va yangi qo'shilgan talabalarni tekshirish va tiklash (F5 bo'lganda)
  if (typeof window.reconcileDeletedStudents === 'function') {
    window.reconcileDeletedStudents();
  }
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

  // 3.6. Hisobot hali qayta generatsiya bo'lmagan tahrirlarni tiklash
  //      (F5 yoki Ctrl+Shift+R bosilganda ma'lumot eski holatga qaytmasligi uchun)
  if (typeof window.syncStudentEditsState === 'function') {
    window.syncStudentEditsState();
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

/* =========================================================================
   TELEGRAM GA GURUHLAR RO'YXATINI YUBORISH
   ========================================================================= */

window.openSendTelegramModal = function() {
  const m = document.getElementById('telegramSendModal');
  if (m) {
    const statusBox = document.getElementById('tgSendStatusBox');
    if (statusBox) statusBox.style.display = 'none';
    const btnSend = document.getElementById('btnSubmitTgSend');
    if (btnSend) {
      btnSend.disabled = false;
      btnSend.innerHTML = `
        <svg class="svg-icon" viewBox="0 0 24 24" fill="currentColor" style="width:15px;height:15px;margin-right:6px;"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm4.64 6.8c-.15 1.58-.8 5.42-1.13 7.19-.14.75-.42 1-.68 1.03-.58.05-1.02-.38-1.58-.75-.88-.58-1.38-.94-2.23-1.5-.99-.65-.35-1.01.22-1.59.15-.15 2.71-2.48 2.76-2.69a.2.2 0 00-.05-.18c-.06-.05-.14-.03-.21-.02-.09.02-1.49.95-4.22 2.79-.4.27-.76.41-1.08.4-.36-.01-1.04-.2-1.55-.37-.63-.2-1.12-.31-1.08-.66.02-.18.27-.36.75-.55 2.92-1.27 4.86-2.11 5.83-2.51 2.78-1.16 3.35-1.36 3.73-1.36.08 0 .27.02.39.12.1.08.13.19.14.27-.01.06.01.24 0 .38z"/></svg>
        Telegramga Yuborish
      `;
    }
    m.style.display = 'flex';
  }
};

window.closeSendTelegramModal = function() {
  const m = document.getElementById('telegramSendModal');
  if (m) m.style.display = 'none';
};

window.executeSendTelegram = async function() {
  const targetRadio = document.querySelector('input[name="tg_target_dest"]:checked');
  const target = targetRadio ? targetRadio.value : 'channel';
  const groupSelect = document.getElementById('tg_select_group');
  const group = groupSelect ? groupSelect.value : 'ALL';

  const btnSend = document.getElementById('btnSubmitTgSend');
  const statusBox = document.getElementById('tgSendStatusBox');
  const statusText = document.getElementById('tgSendStatusText');

  if (btnSend) {
    btnSend.disabled = true;
    btnSend.innerHTML = `
      <span class="gh-spin" style="display:inline-block;width:14px;height:14px;border:2px solid rgba(255,255,255,0.3);border-top-color:#fff;border-radius:50%;margin-right:6px;animation:spin 0.8s linear infinite;"></span>
      Yuborilmoqda...
    `;
  }
  if (statusBox) {
    statusBox.style.display = 'block';
    statusBox.style.background = '#f0fdf4';
    statusBox.style.borderColor = '#bbf7d0';
    if (statusText) {
      statusText.innerHTML = "Guruh jurnallari yuqori sifatli rasm formatida Telegramga yuborilmoqda...";
      statusText.style.color = '#166534';
    }
  }

  if (typeof showToast === 'function') {
    showToast("Guruh jurnallari yuqori sifatli rasm formatida Telegramga yuborilmoqda...", "info");
  }

  // Brauzerdagi barcha mavjud talabalarni guruhlarga ajratish
  let groupsData = {};
  if (typeof RAW_STUDENTS !== 'undefined' && Array.isArray(RAW_STUDENTS)) {
    for (const s of RAW_STUDENTS) {
      let g = String(s.group || '').trim();
      const gl = g.toLowerCase();
      if (gl.includes('chiqaril') || gl === 'n') {
        g = "Talabalar safidan chiqarilganlar";
      } else if (!g) {
        g = "Guruhsiz";
      }
      if (!groupsData[g]) groupsData[g] = [];
      const name = (s.fish || (s.ism + (s.ota ? ' ' + s.ota : ''))).trim();
      groupsData[g].push({ name, shnum: s.shnum || '' });
    }
  }

  const payload = {
    target: target,
    group: group,
    groupsData: groupsData
  };

  try {
    let res = null;

    // 1. POST so'rovi (Mahalliy server yoki Vercel serverless)
    try {
      const resp = await fetch('/api/send_groups_to_telegram', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (resp.ok || resp.status === 207) {
        res = await resp.json();
      } else {
        const errJson = await resp.json().catch(() => null);
        if (errJson && errJson.error) {
          throw new Error(errJson.error);
        }
      }
    } catch (e) {
      console.warn("POST so'rovi xatosi:", e.message);
      // 2. GET so'rovi orqali urinib ko'rish
      try {
        const getResp = await fetch(`/api/send_groups_to_telegram?target=${encodeURIComponent(target)}&group=${encodeURIComponent(group)}`);
        if (getResp.ok || getResp.status === 207) {
          res = await getResp.json();
        }
      } catch (e2) {
        console.warn("GET so'rovi ham xato berdi:", e2.message);
      }
    }

    if (res && res.ok) {
      const count = res.sent_count || (res.results ? res.results.length : 1);
      if (statusText) {
        statusText.innerHTML = `Muvaffaqiyatli yakunlandi! <strong>${count} ta</strong> xabar Telegramga yuborildi.`;
        statusText.style.color = '#10b981';
      }
      if (typeof showToast === 'function') {
        showToast(`Telegramga ${count} ta guruh ro'yxati muvaffaqiyatli yuborildi!`, 'success');
      }
      setTimeout(() => {
        closeSendTelegramModal();
      }, 1600);
    } else {
      const errMsg = (res && res.error) ? res.error : "Telegramga yuborishda xatolik yuz berdi";
      if (statusBox) {
        statusBox.style.background = '#fef2f2';
        statusBox.style.borderColor = '#fecaca';
      }
      if (statusText) {
        statusText.innerText = "Xatolik: " + errMsg;
        statusText.style.color = '#dc2626';
      }
      if (typeof showToast === 'function') {
        showToast("Xatolik: " + errMsg, 'danger');
      }
    }
  } catch (err) {
    console.error("Telegram send error:", err);
    if (statusBox) {
      statusBox.style.background = '#fef2f2';
      statusBox.style.borderColor = '#fecaca';
    }
    if (statusText) {
      statusText.innerText = "Ulanishda xatolik: " + err.message;
      statusText.style.color = '#dc2626';
    }
    if (typeof showToast === 'function') {
      showToast("Serverga ulanish xatosi: " + err.message, 'danger');
    }
  } finally {
    if (btnSend) {
      btnSend.disabled = false;
      btnSend.innerHTML = `
        <svg class="svg-icon" viewBox="0 0 24 24" fill="currentColor" style="width:15px;height:15px;margin-right:6px;"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm4.64 6.8c-.15 1.58-.8 5.42-1.13 7.19-.14.75-.42 1-.68 1.03-.58.05-1.02-.38-1.58-.75-.88-.58-1.38-.94-2.23-1.5-.99-.65-.35-1.01.22-1.59.15-.15 2.71-2.48 2.76-2.69a.2.2 0 00-.05-.18c-.06-.05-.14-.03-.21-.02-.09.02-1.49.95-4.22 2.79-.4.27-.76.41-1.08.4-.36-.01-1.04-.2-1.55-.37-.63-.2-1.12-.31-1.08-.66.02-.18.27-.36.75-.55 2.92-1.27 4.86-2.11 5.83-2.51 2.78-1.16 3.35-1.36 3.73-1.36.08 0 .27.02.39.12.1.08.13.19.14.27-.01.06.01.24 0 .38z"/></svg>
        Telegramga Yuborish
      `;
    }
  }
};

