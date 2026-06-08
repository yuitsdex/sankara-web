// ──────────────────────────────────────────────────────────────
// SANKARA v2 — script.js
// Database: Supabase (client-side)
// AI Planner: Mock API via Express backend
// ──────────────────────────────────────────────────────────────

// ── SUPABASE INIT ─────────────────────────────────────────────
// Ganti nilai placeholder di bawah dengan kredensial proyek Supabase Anda
// yang bisa ditemukan di: Project Settings > API
const SUPABASE_URL = 'https://zqhiqiucvwhqfvtmtuvr.supabase.co';
const SUPABASE_ANON = 'sb_publishable_Il7MX5gimg8h5tJhypAuxQ_qirtMr--';

const { createClient } = supabase;
const sb = createClient(SUPABASE_URL, SUPABASE_ANON);

// ── AUTH STATE ────────────────────────────────────────────────
const authOverlay = document.getElementById('auth-overlay');
const authEmail = document.getElementById('auth-email');
const authPassword = document.getElementById('auth-password');
const authSubmitBtn = document.getElementById('auth-submit-btn');
const authError = document.getElementById('auth-error');
const authSuccessMsg = document.getElementById('auth-success-msg');
const authTabLogin = document.getElementById('auth-tab-login');
const authTabReg = document.getElementById('auth-tab-register');
const userBar = document.getElementById('user-bar');
const userEmailEl = document.getElementById('user-email');
const signoutBtn = document.getElementById('signout-btn');

let authMode = 'login'; // 'login' | 'register'

// ── AUTH TAB SWITCH ───────────────────────────────────────────
authTabLogin.addEventListener('click', () => {
  authMode = 'login';
  authTabLogin.classList.add('active');
  authTabReg.classList.remove('active');
  authSubmitBtn.textContent = 'Sign In';
  authError.classList.add('hidden');
  authSuccessMsg.classList.add('hidden');
});

authTabReg.addEventListener('click', () => {
  authMode = 'register';
  authTabReg.classList.add('active');
  authTabLogin.classList.remove('active');
  authSubmitBtn.textContent = 'Daftar';
  authError.classList.add('hidden');
  authSuccessMsg.classList.add('hidden');
});

// ── SIGN UP ───────────────────────────────────────────────────
async function signUp(email, password) {
  const { error } = await sb.auth.signUp({ email, password });
  if (error) throw error;
}

// ── SIGN IN ───────────────────────────────────────────────────
async function signInWithPassword(email, password) {
  const { error } = await sb.auth.signInWithPassword({ email, password });
  if (error) throw error;
}

// ── SIGN OUT ──────────────────────────────────────────────────
async function signOut() {
  await sb.auth.signOut();
}

// ── AUTH SUBMIT HANDLER ───────────────────────────────────────
authSubmitBtn.addEventListener('click', async () => {
  authError.classList.add('hidden');
  authSuccessMsg.classList.add('hidden');

  const email = authEmail.value.trim();
  const password = authPassword.value;

  if (!email || !password) {
    authError.textContent = 'Email dan password wajib diisi.';
    authError.classList.remove('hidden');
    return;
  }

  authSubmitBtn.disabled = true;
  authSubmitBtn.textContent = 'Memproses…';

  try {
    if (authMode === 'register') {
      await signUp(email, password);
      authSuccessMsg.textContent = 'Registrasi berhasil! Silakan cek email Anda untuk konfirmasi.';
      authSuccessMsg.classList.remove('hidden');
      authSubmitBtn.textContent = 'Daftar';
    } else {
      await signInWithPassword(email, password);
      // onAuthStateChange akan menangani UI update
    }
  } catch (err) {
    authError.textContent = err.message || 'Terjadi kesalahan. Coba lagi.';
    authError.classList.remove('hidden');
    authSubmitBtn.textContent = authMode === 'register' ? 'Daftar' : 'Sign In';
  } finally {
    authSubmitBtn.disabled = false;
  }
});

// Tekan Enter di password langsung submit
authPassword.addEventListener('keydown', e => {
  if (e.key === 'Enter') authSubmitBtn.click();
});

// ── SIGN OUT BUTTON ───────────────────────────────────────────
signoutBtn.addEventListener('click', async () => {
  await signOut();
});

// ── AUTH STATE LISTENER (reactive) ───────────────────────────
sb.auth.onAuthStateChange((_event, session) => {
  if (session) {
    // User sudah login — tampilkan app, sembunyikan overlay
    authOverlay.classList.remove('open');
    userBar.classList.add('show');
    userEmailEl.textContent = session.user.email;
    loadBooks();
  } else {
    // User belum login / sudah logout — tampilkan overlay
    authOverlay.classList.add('open');
    userBar.classList.remove('show');
    allBooks = [];
    renderBooks([]);
    renderStats([]);
  }
});

let allBooks = []; // cache global untuk search & edit

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
const bookList = document.getElementById('book-list');
const statTotal = document.getElementById('stat-total');
const statReading = document.getElementById('stat-reading');
const statDone = document.getElementById('stat-done');
const searchInput = document.getElementById('search-book');

const modalBackdrop = document.getElementById('modal-backdrop');
const modalTitle = document.getElementById('modal-title');
const modalError = document.getElementById('modal-error');
const fTitle = document.getElementById('f-title');
const fAuthor = document.getElementById('f-author');
const fTotal = document.getElementById('f-total');
const fRead = document.getElementById('f-read');
const saveBookBtn = document.getElementById('save-book-btn');

let editingId = null; // null = add mode, string UUID = edit mode

// ── TOAST NOTIFICATION ────────────────────────────────────────
const toastContainer = document.createElement('div');
toastContainer.id = 'toast-container';
document.body.appendChild(toastContainer);

function showToast(message) {
  const toast = document.createElement('div');
  toast.className = 'toast';
  toast.textContent = message;
  toastContainer.appendChild(toast);
  setTimeout(() => toast.classList.add('show'), 10);
  setTimeout(() => {
    toast.classList.remove('show');
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}

// ── SEARCH BAR ────────────────────────────────────────────────
searchInput.addEventListener('input', (e) => {
  const keyword = e.target.value.toLowerCase();
  const filtered = allBooks.filter(b =>
    b.title.toLowerCase().includes(keyword) ||
    b.author.toLowerCase().includes(keyword)
  );
  renderBooks(filtered);
});

// ── MODAL HELPERS ─────────────────────────────────────────────
function openModal(book = null) {
  modalError.classList.add('hidden');
  if (book) {
    editingId = book.id;
    modalTitle.textContent = 'Edit Buku';
    fTitle.value = book.title;
    fAuthor.value = book.author;
    fTotal.value = book.total_pages;
    fRead.value = book.pages_read;
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

// ── SAVE (CREATE / UPDATE) via Supabase ───────────────────────
saveBookBtn.addEventListener('click', async () => {
  modalError.classList.add('hidden');

  const title = fTitle.value.trim();
  const author = fAuthor.value.trim();
  const totalPages = parseInt(fTotal.value, 10);
  const pagesRead = parseInt(fRead.value, 10);

  if (!title || !author || !fTotal.value || fRead.value === '') {
    return showModalError('Semua field wajib diisi.');
  }
  if (isNaN(totalPages) || isNaN(pagesRead) || totalPages < 1 || pagesRead < 0) {
    return showModalError('Nilai halaman tidak valid.');
  }
  if (pagesRead > totalPages) {
    return showModalError('Halaman dibaca tidak boleh melebihi total halaman.');
  }

  // Hitung status & progress di sisi client (logika yang sama dengan server lama)
  const status = pagesRead === 0 ? 'Want to Read' : pagesRead >= totalPages ? 'Finished' : 'Reading';
  const progress = Math.round((pagesRead / totalPages) * 100);

  saveBookBtn.disabled = true;

  try {
    if (editingId) {
      // ── UPDATE ──
      const { error } = await sb
        .from('books')
        .update({ title, author, total_pages: totalPages, pages_read: pagesRead, status, progress })
        .eq('id', editingId);

      if (error) throw error;
      showToast('Buku berhasil diupdate! 🚀');
    } else {
      // ── INSERT — sertakan user_id dari sesi aktif ──
      const { data: { session } } = await sb.auth.getSession();
      const { error } = await sb
        .from('books')
        .insert({ title, author, total_pages: totalPages, pages_read: pagesRead, status, progress, user_id: session.user.id });

      if (error) throw error;
      showToast('Buku baru berhasil ditambah! 📚');
    }

    closeModal();
    searchInput.value = '';
    await loadBooks();
  } catch (err) {
    showModalError(err.message || 'Terjadi kesalahan saat menyimpan.');
  } finally {
    saveBookBtn.disabled = false;
  }
});

function showModalError(msg) {
  modalError.textContent = msg;
  modalError.classList.remove('hidden');
}

// ── LOAD BOOKS dari Supabase ──────────────────────────────────
async function loadBooks() {
  try {
    const { data, error } = await sb
      .from('books')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;

    allBooks = data || [];

    const keyword = searchInput.value.toLowerCase();
    if (keyword) {
      const filtered = allBooks.filter(b =>
        b.title.toLowerCase().includes(keyword) ||
        b.author.toLowerCase().includes(keyword)
      );
      renderBooks(filtered);
    } else {
      renderBooks(allBooks);
    }

    renderStats(allBooks);
  } catch (err) {
    bookList.innerHTML = `<p class="text-sm text-center" style="color:var(--danger)">Gagal memuat data: ${escapeHTML(err.message)}</p>`;
  }
}

// ── RENDER STATS ──────────────────────────────────────────────
function renderStats(books) {
  statTotal.textContent = books.length;
  statReading.textContent = books.filter(b => b.status === 'Reading').length;
  statDone.textContent = books.filter(b => b.status === 'Finished').length;
}

// ── BADGE / FILL HELPERS ──────────────────────────────────────
function badgeClass(status) {
  if (status === 'Finished') return 'badge-done';
  if (status === 'Reading') return 'badge-reading';
  return 'badge-want';
}

function fillClass(status) {
  if (status === 'Finished') return 'fill-done';
  if (status === 'Reading') return 'fill-reading';
  return 'fill-want';
}

// ── RENDER BOOKS ──────────────────────────────────────────────
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
            <span class="text-xs" style="color:var(--muted)">${b.pages_read} / ${b.total_pages} halaman</span>
            <span class="text-xs font-semibold" style="color:var(--accent)">${b.progress}%</span>
          </div>
        </div>
        <div class="flex gap-1 shrink-0 mt-0.5">
          <button class="btn-ghost" onclick="editBook('${b.id}')">Edit</button>
          <button class="btn-danger" onclick="deleteBook('${b.id}')">Hapus</button>
        </div>
      </div>
    </div>
  `).join('');
}

// ── EDIT & DELETE ─────────────────────────────────────────────
function editBook(id) {
  const book = allBooks.find(b => b.id === id);
  if (book) openModal(book);
}

// DELETE buku via Supabase
async function deleteBook(id) {
  if (!confirm('Hapus buku ini dari library?')) return;

  const { error } = await sb
    .from('books')
    .delete()
    .eq('id', id);

  if (error) {
    showToast('Gagal menghapus buku: ' + error.message);
    return;
  }

  showToast('Buku berhasil dihapus! 🗑️');
  await loadBooks();
}

// Expose ke inline onclick
window.editBook = editBook;
window.deleteBook = deleteBook;

// ── AI OUTLINE GENERATOR ──────────────────────────────────────
const genBtn = document.getElementById('gen-outline-btn');
const outlineTopic = document.getElementById('outline-topic');
const outlineLoading = document.getElementById('outline-loading');
const outlineError = document.getElementById('outline-error');
const outlineResult = document.getElementById('outline-result');
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
    const res = await fetch('/api/outline', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ topic }) });
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

// ── INIT — cek sesi yang sudah ada saat halaman dimuat ────────
(async () => {
  const { data: { session } } = await sb.auth.getSession();
  if (!session) {
    // Belum login, tampilkan overlay
    authOverlay.classList.add('open');
  }
  // onAuthStateChange akan otomatis menangani sisanya
})();
