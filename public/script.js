// ──────────────────────────────────────────────────────────────
// SANKARA v2 — script.js
// ──────────────────────────────────────────────────────────────

let allBooks = []; // Variabel global buat nyimpen data & search

// ── TABS ──────────────────────────────────────────────────────
document.querySelectorAll('.tab-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    document.querySelectorAll('.panel').forEach(p => p.classList.remove('active'));
    btn.classList.add('active');
    document.getElementById(`panel-${btn.dataset.tab}`).classList.add('active');
  });
});

// ── DOM REFS ──────────────────────────────────────────────────
const bookList    = document.getElementById('book-list');
const statTotal   = document.getElementById('stat-total');
const statReading = document.getElementById('stat-reading');
const statDone    = document.getElementById('stat-done');
const searchInput = document.getElementById('search-book');

const modalBackdrop = document.getElementById('modal-backdrop');
const modalTitle    = document.getElementById('modal-title');
const modalError    = document.getElementById('modal-error');
const fTitle        = document.getElementById('f-title');
const fAuthor       = document.getElementById('f-author');
const fTotal        = document.getElementById('f-total');
const fRead         = document.getElementById('f-read');
const saveBookBtn   = document.getElementById('save-book-btn');

let editingId = null; // null = add mode, number = edit mode

// ── TOAST NOTIFICATION ────────────────────────────────────────
const toastContainer = document.createElement('div');
toastContainer.id = 'toast-container';
document.body.appendChild(toastContainer);

function showToast(message) {
  const toast = document.createElement('div');
  toast.className = 'toast';
  toast.textContent = message;
  toastContainer.appendChild(toast);
  
  // Kasih delay dikit biar animasi CSS jalan
  setTimeout(() => toast.classList.add('show'), 10);
  
  // Hilangin setelah 3 detik
  setTimeout(() => {
    toast.classList.remove('show');
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}

// ── SEARCH BAR LOGIC ──────────────────────────────────────────
searchInput.addEventListener('input', (e) => {
  const keyword = e.target.value.toLowerCase();
  const filteredBooks = allBooks.filter(b => 
    b.title.toLowerCase().includes(keyword) || 
    b.author.toLowerCase().includes(keyword)
  );
  renderBooks(filteredBooks); // Cuma ngerender hasil filter
});

// ── MODAL HELPERS ─────────────────────────────────────────────
function openModal(book = null) {
  modalError.classList.add('hidden');
  if (book) {
    editingId = book.id;
    modalTitle.textContent = 'Edit Buku';
    fTitle.value  = book.title;
    fAuthor.value = book.author;
    fTotal.value  = book.totalPages;
    fRead.value   = book.pagesRead;
  } else {
    editingId = null;
    modalTitle.textContent = 'Tambah Buku';
    fTitle.value = fAuthor.value = fTotal.value = fRead.value = '';
  }
  modalBackdrop.classList.add('open');
  fTitle.focus();
}

function closeModal() {
  modalBackdrop.classList.remove('open');
}

document.getElementById('open-add-modal').addEventListener('click', () => openModal());
document.getElementById('close-modal').addEventListener('click', closeModal);
modalBackdrop.addEventListener('click', e => { if (e.target === modalBackdrop) closeModal(); });

// ── SAVE (CREATE / UPDATE) ────────────────────────────────────
saveBookBtn.addEventListener('click', async () => {
  modalError.classList.add('hidden');
  const payload = {
    title:      fTitle.value.trim(),
    author:     fAuthor.value.trim(),
    totalPages: fTotal.value,
    pagesRead:  fRead.value,
  };
  if (!payload.title || !payload.author || !payload.totalPages || payload.pagesRead === '') {
    return showModalError('Semua field wajib diisi.');
  }
  if (parseInt(payload.pagesRead) > parseInt(payload.totalPages)) {
    return showModalError('Halaman dibaca tidak boleh melebihi total halaman.');
  }

  try {
    const url    = editingId ? `/api/books/${editingId}` : '/api/books';
    const method = editingId ? 'PUT' : 'POST';
    const res    = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
    const data   = await res.json();
    
    if (!res.ok) return showModalError(data.error || 'Terjadi kesalahan.');
    
    closeModal();
    showToast(editingId ? 'Buku berhasil diupdate! 🚀' : 'Buku baru berhasil ditambah! 📚');
    loadBooks();
    searchInput.value = ''; // Reset search bar
  } catch {
    showModalError('Gagal terhubung ke server.');
  }
});

function showModalError(msg) {
  modalError.textContent = msg;
  modalError.classList.remove('hidden');
}

// ── LOAD & RENDER BOOKS ───────────────────────────────────────
async function loadBooks() {
  try {
    const res   = await fetch('/api/books');
    allBooks    = await res.json(); // Simpan di global variabel biar gampang search & edit
    
    // Kalau ada filter pencarian, pake datanya
    const keyword = searchInput.value.toLowerCase();
    if (keyword) {
      const filtered = allBooks.filter(b => b.title.toLowerCase().includes(keyword) || b.author.toLowerCase().includes(keyword));
      renderBooks(filtered);
    } else {
      renderBooks(allBooks);
    }
    
    renderStats(allBooks);
  } catch {
    bookList.innerHTML = `<p class="text-sm text-center" style="color:var(--danger)">Gagal memuat data. Pastikan server berjalan.</p>`;
  }
}

function renderStats(books) {
  statTotal.textContent   = books.length;
  statReading.textContent = books.filter(b => b.status === 'Reading').length;
  statDone.textContent    = books.filter(b => b.status === 'Finished').length;
}

function badgeClass(status) {
  if (status === 'Finished') return 'badge-done';
  if (status === 'Reading')  return 'badge-reading';
  return 'badge-want';
}

function fillClass(status) {
  if (status === 'Finished') return 'fill-done';
  if (status === 'Reading')  return 'fill-reading';
  return 'fill-want';
}

function renderBooks(books) {
  if (!books.length) {
    bookList.innerHTML = `
      <div class="empty-state">
        <div class="text-4xl mb-3">📖</div>
        <p class="text-sm" style="color:var(--text)">Data tidak ditemukan.</p>
        <p class="text-xs mt-1" style="color:var(--muted)">Mungkin pakai kata kunci lain?</p>
      </div>`;
    return;
  }

  bookList.innerHTML = books.map((b, i) => `
    <div class="book-card mb-3 fade-up" style="animation-delay:${i * 40}ms">
      <div class="flex items-start justify-between gap-4">
        <div class="flex-1 min-w-0">
          <div class="flex items-center gap-2 flex-wrap mb-0.5">
            <h3 class="font-display text-base font-semibold leading-snug" style="color:var(--text)">${escapeHTML(b.title)}</h3>
            <span class="badge ${badgeClass(b.status)}">${b.status}</span>
          </div>
          <p class="text-xs mb-3" style="color:var(--muted)">${escapeHTML(b.author)}</p>

          <div class="progress-track mb-1.5">
            <div class="progress-fill ${fillClass(b.status)}" style="width:${b.progress}%"></div>
          </div>
          <div class="flex justify-between">
            <span class="text-xs" style="color:var(--muted)">${b.pagesRead} / ${b.totalPages} halaman</span>
            <span class="text-xs font-semibold" style="color:var(--accent)">${b.progress}%</span>
          </div>
        </div>
        <div class="flex gap-1 shrink-0 mt-0.5">
          <button class="btn-ghost" onclick="editBook(${b.id})">Edit</button>
          <button class="btn-danger" onclick="deleteBook(${b.id})">Hapus</button>
        </div>
      </div>
    </div>
  `).join('');
}

// ── EDIT & DELETE ─────────────────────────────────────────────
// (SUDAH DIPERBAIKI: Ambil data dari cache array langsung, engga usah fetch API ulang)
function editBook(id) {
  const book = allBooks.find(b => b.id === id);
  if (book) openModal(book);
}

async function deleteBook(id) {
  if (!confirm('Hapus buku ini dari library?')) return;
  await fetch(`/api/books/${id}`, { method: 'DELETE' });
  showToast('Buku berhasil dihapus! 🗑️');
  loadBooks();
}

// expose to inline onclick
window.editBook   = editBook;
window.deleteBook = deleteBook;

// ── AI OUTLINE GENERATOR ──────────────────────────────────────
const genBtn         = document.getElementById('gen-outline-btn');
const outlineTopic   = document.getElementById('outline-topic');
const outlineLoading = document.getElementById('outline-loading');
const outlineError   = document.getElementById('outline-error');
const outlineResult  = document.getElementById('outline-result');
const outlineChapters = document.getElementById('outline-chapters');
const outlineTopicLabel = document.getElementById('outline-topic-label');

genBtn.addEventListener('click', generateOutline);
outlineTopic.addEventListener('keydown', e => { if (e.key === 'Enter') generateOutline(); });

async function generateOutline() {
  const topic = outlineTopic.value.trim();
  if (!topic) {
    outlineError.textContent = 'Masukkan topik terlebih dahulu.';
    outlineError.classList.remove('hidden');
    return;
  }
  outlineError.classList.add('hidden');
  outlineResult.classList.add('hidden');
  outlineLoading.classList.remove('hidden');
  genBtn.disabled = true;

  try {
    const res  = await fetch('/api/outline', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ topic }) });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Server error.');

    outlineTopicLabel.textContent = data.topic;
    outlineChapters.innerHTML = data.outline.map(c => `
      <div class="outline-chapter">
        <p class="font-ui font-semibold text-sm mb-1" style="color:var(--accent)">${escapeHTML(c.chapter)}</p>
        <p class="font-display italic text-sm leading-relaxed" style="color:var(--text);opacity:0.75">${escapeHTML(c.description)}</p>
      </div>
    `).join('');

    outlineResult.classList.remove('hidden');
    showToast('Outline AI berhasil di-generate! ✨');

    // stagger reveal
    requestAnimationFrame(() => {
      document.querySelectorAll('.outline-chapter').forEach((el, i) => {
        setTimeout(() => el.classList.add('visible'), i * 180);
      });
    });

  } catch (err) {
    outlineError.textContent = err.message;
    outlineError.classList.remove('hidden');
  } finally {
    outlineLoading.classList.add('hidden');
    genBtn.disabled = false;
  }
}

// ── UTILS ─────────────────────────────────────────────────────
function escapeHTML(str) {
  const d = document.createElement('div');
  d.textContent = String(str);
  return d.innerHTML;
}

// ── INIT ──────────────────────────────────────────────────────
loadBooks();