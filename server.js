import express from "express";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

// ──────────────────────────────────────────────
// IN-MEMORY DATABASE
// ──────────────────────────────────────────────
let books = [];
let nextId = 1;

// ──────────────────────────────────────────────d
// MOCK AI OUTLINE TEMPLATES (8 Kategori)
// ──────────────────────────────────────────────
const OUTLINE_TEMPLATES = [
  {
    name: "Kelulusan / Kuliah / Sekolah",
    keywords: ["sarjana", "kuliah", "sekolah", "skripsi", "smk", "belajar", "wisuda", "kampus", "akademik", "mahasiswa", "ujian", "semester"],
    chapters: [
      { chapter: "Bab 1: Persiapan & Strategi Belajar Efektif", description: "Merancang roadmap akademik dari awal kuliah hingga skripsi, mengelola waktu antara tugas dan kehidupan sosial, serta memilih topik penelitian yang benar-benar Anda minati." },
      { chapter: "Bab 2: Suka Duka & Survival Mode", description: "Menghadapi dosen killer, deadline bertumpuk, pressure dari orang tua, hingga krisis identitas 'untuk apa gua kuliah?' — strategi mental untuk tetap waras dan produktif." },
      { chapter: "Bab 3: Perjuangan Wisuda & Masa Depan", description: "Sprint terakhir menyelesaikan skripsi, persiapan sidang, hingga merayakan kelulusan. Plus transisi ke dunia kerja atau melanjutkan studi tanpa kehilangan momentum." },
    ],
  },
  {
    name: "Fiksi / Novel / Cerita",
    keywords: ["cerita", "novel", "fiksi", "petualangan", "cinta", "hantu", "misteri", "fantasi", "karakter", "plot", "protagonis", "antagonis", "naratif"],
    chapters: [
      { chapter: "Bab 1: Pengenalan Karakter & Dunia", description: "Memperkenalkan protagonis dengan latar belakang yang menarik, membangun dunia cerita yang hidup, dan menanam konflik awal yang membuat pembaca penasaran sejak halaman pertama." },
      { chapter: "Bab 2: Konflik Utama & Titik Balik", description: "Eskalasi masalah yang memaksa karakter keluar dari zona nyaman, menghadapi musuh atau dilema internal yang mengancam segala yang mereka sayangi, hingga plot twist yang mengejutkan." },
      { chapter: "Bab 3: Resolusi & Ending yang Berkesan", description: "Klimaks yang menegangkan di mana karakter menghadapi tantangan terbesar mereka, resolusi konflik yang memuaskan namun tidak terlalu sempurna, dan pesan moral yang terselip alami tanpa menggurui." },
    ],
  },
  {
    name: "Bisnis / Kerja / Karir",
    keywords: ["bisnis", "kerja", "duit", "sukses", "saham", "jualan", "karir", "startup", "entrepreneur", "wirausaha", "uang", "investasi", "karyawan", "resign"],
    chapters: [
      { chapter: "Bab 1: Analisis Pasar & Validasi Ide", description: "Riset mendalam tentang kebutuhan pasar yang belum terpenuhi, identifikasi kompetitor, validasi asumsi bisnis melalui MVP, dan mencari product-market fit yang sesungguhnya." },
      { chapter: "Bab 2: Strategi Eksekusi & Operasional", description: "Membangun tim yang solid, menyusun SOP yang efisien, manajemen cash flow agar tidak boncos, serta strategi marketing yang tidak menguras budget namun tetap efektif." },
      { chapter: "Bab 3: Scaling, Finansial & Keberlanjutan", description: "Kapan waktu yang tepat untuk ekspansi, bagaimana mengelola pertumbuhan tanpa kehilangan kultur perusahaan, fundraising vs bootstrapping, dan membangun bisnis yang sustain jangka panjang." },
    ],
  },
  {
    name: "Teknologi / IT / Development",
    keywords: ["coding", "it", "siber", "jaringan", "ai", "aplikasi", "server", "centos", "teknologi", "programming", "code", "software", "developer", "website", "database", "linux"],
    chapters: [
      { chapter: "Bab 1: System Architecture & Design Patterns", description: "Merancang arsitektur aplikasi yang scalable dan maintainable, memilih tech stack yang tepat untuk kebutuhan spesifik, dan menerapkan design patterns yang terbukti efektif di production." },
      { chapter: "Bab 2: Implementasi Kode & Best Practices", description: "Hands-on development dari setup environment, clean code principles, version control workflow, testing strategy, hingga debugging teknik untuk masalah kompleks yang sering muncul di lapangan." },
      { chapter: "Bab 3: Keamanan, Deployment & Monitoring", description: "Hardening aplikasi dari serangan cyber, CI/CD pipeline untuk deployment otomatis ke server seperti CentOS, monitoring performa real-time, dan disaster recovery plan yang solid." },
    ],
  },
  {
    name: "Pengembangan Diri / Motivasi",
    keywords: ["motivasi", "stres", "pusing", "semangat", "hidup", "gagal", "self", "diri", "produktif", "habit", "kebiasaan", "mindset", "sukses", "growth"],
    chapters: [
      { chapter: "Bab 1: Mindset & Fondasi Mental", description: "Mengubah fixed mindset menjadi growth mindset, mengenali self-sabotage patterns yang menghalangi progres, dan membangun identitas baru yang align dengan tujuan hidup Anda." },
      { chapter: "Bab 2: Kebiasaan Kecil yang Mengubah Hidup", description: "Atomic habits: bagaimana perubahan 1% setiap hari menciptakan hasil luar biasa dalam setahun, merancang environment yang mendukung kebiasaan baik, dan menghilangkan friction untuk konsistensi." },
      { chapter: "Bab 3: Konsistensi, Resiliensi & Momentum", description: "Strategi bertahan di hari-hari sulit ketika motivasi menghilang, bangkit dari kegagalan tanpa self-pity, dan membangun momentum yang membuat progres terasa lebih mudah seiring waktu." },
    ],
  },
  {
    name: "Kesehatan / Fitness / Wellness",
    keywords: ["kesehatan", "sehat", "olahraga", "fitness", "diet", "workout", "gym", "yoga", "lari", "tubuh", "badan", "wellness", "nutrisi", "makan"],
    chapters: [
      { chapter: "Bab 1: Fondasi Kesehatan Holistik", description: "Memahami hubungan pikiran-tubuh dari perspektif neurosains, pengaruh sleep hygiene terhadap performa harian, dan bagaimana inflamasi kronis merusak tubuh di level seluler." },
      { chapter: "Bab 2: Protokol Nutrisi & Latihan", description: "Panduan berbasis bukti untuk pola makan yang sustainable (bukan diet ekstrem), program latihan yang disesuaikan dengan tujuan personal, dan recovery yang sering diabaikan namun krusial." },
      { chapter: "Bab 3: Konsistensi & Gaya Hidup Jangka Panjang", description: "Membangun rutinitas yang bertahan selamanya bukan hanya 30 hari, mengatasi plateau dan burnout, serta definisi sehat yang lebih dari sekadar angka di timbangan atau gym selfie." },
    ],
  },
  {
    name: "Perjalanan / Travel / Petualangan",
    keywords: ["travel", "jalan", "liburan", "backpacker", "wisata", "keliling", "adventure", "petualangan", "destinasi", "trip", "explore", "penjelajahan"],
    chapters: [
      { chapter: "Bab 1: Persiapan & Perencanaan Rute", description: "Riset destinasi yang jarang dikunjungi mass tourism, budgeting cerdas untuk backpacker maupun luxury traveler, packing essentials, dan tips mendapatkan visa tanpa ribet." },
      { chapter: "Bab 2: Pengalaman di Lapangan & Cerita Unik", description: "Dokumentasi perjalanan yang autentik, berinteraksi dengan lokal untuk pengalaman mendalam, mengatasi culture shock, hingga menghadapi situasi darurat di negara asing." },
      { chapter: "Bab 3: Refleksi & Transformasi Diri", description: "Bagaimana traveling mengubah perspektif hidup, pelajaran berharga dari setiap perjalanan, dan membawa pulang lebih dari sekedar foto—melainkan wisdom dan koneksi manusiawi." },
    ],
  },
  {
    name: "Seni / Kreatif / Desain",
    keywords: ["seni", "art", "desain", "design", "kreativitas", "kreatif", "lukis", "gambar", "musik", "video", "fotografi", "animasi", "illustrasi"],
    chapters: [
      { chapter: "Bab 1: Menemukan Suara Kreatif Anda", description: "Eksplorasi berbagai medium dan gaya untuk menemukan authentic creative voice, mengatasi imposter syndrome, dan memahami bahwa originalitas datang dari remix pengalaman unik Anda." },
      { chapter: "Bab 2: Proses Kreatif & Eksekusi Karya", description: "Dari brainstorming ide hingga eksekusi final, mengatasi creative block dengan teknik yang terbukti efektif, iterasi cepat tanpa terjebak perfeksionisme, dan berani gagal di tahap eksperimen." },
      { chapter: "Bab 3: Berbagi Karya & Membangun Audience", description: "Strategi memamerkan karya tanpa terlihat narsis, membangun portofolio yang menarik perhatian, networking di komunitas kreatif, dan mengubah passion menjadi sustainable career." },
    ],
  },
];

// ── DYNAMIC FALLBACK TEMPLATE ──
function getDynamicFallback(topic) {
  return {
    chapters: [
      { chapter: "Bab 1: Fondasi & Konteks", description: `Pengantar mendalam tentang "${topic}" — mengapa tema ini relevan saat ini, siapa yang paling diuntungkan dari memahaminya, dan kerangka berpikir yang perlu disiapkan sebelum masuk ke pembahasan inti.` },
      { chapter: "Bab 2: Eksplorasi & Analisis Mendalam", description: `Pembedahan komprehensif seputar "${topic}": teori yang mendasari, praktik nyata di lapangan, studi kasus menarik, serta sudut pandang alternatif yang jarang dibahas literatur mainstream.` },
      { chapter: "Bab 3: Aplikasi & Tindak Lanjut", description: `Mengintegrasikan semua insight tentang "${topic}" menjadi action plan konkret — langkah pertama yang bisa diambil hari ini, resources untuk mendalami lebih lanjut, dan visi jangka panjang untuk mastery.` },
    ],
  };
}

function pickTemplate(topic) {
  const lower = topic.toLowerCase();
  const match = OUTLINE_TEMPLATES.find((t) => t.keywords.some((k) => lower.includes(k)));
  return match || getDynamicFallback(topic);
}

// ──────────────────────────────────────────────
// HELPER: derive status
// ──────────────────────────────────────────────
function deriveStatus(read, total) {
  if (read === 0) return "Want to Read";
  if (read >= total) return "Finished";
  return "Reading";
}

// ──────────────────────────────────────────────
// ROUTES: LIBRARY CRUD
// ──────────────────────────────────────────────

// GET all books
app.get("/api/books", (req, res) => {
  res.json(books);
});

// POST add book
app.post("/api/books", (req, res) => {
  const { title, author, totalPages, pagesRead } = req.body;
  if (!title || !author || totalPages == null || pagesRead == null) {
    return res.status(400).json({ error: "Semua field wajib diisi." });
  }
  const total = parseInt(totalPages, 10);
  const read = parseInt(pagesRead, 10);
  if (isNaN(total) || isNaN(read) || total < 1 || read < 0 || read > total) {
    return res.status(400).json({ error: "Nilai halaman tidak valid." });
  }
  const book = {
    id: nextId++,
    title: title.trim(),
    author: author.trim(),
    totalPages: total,
    pagesRead: read,
    status: deriveStatus(read, total),
    progress: Math.round((read / total) * 100),
    addedAt: new Date().toISOString(),
  };
  books.push(book);
  res.status(201).json(book);
});

// PUT update book
app.put("/api/books/:id", (req, res) => {
  const id = parseInt(req.params.id, 10);
  const idx = books.findIndex((b) => b.id === id);
  if (idx === -1) return res.status(404).json({ error: "Buku tidak ditemukan." });

  const { title, author, totalPages, pagesRead } = req.body;
  const total = parseInt(totalPages, 10);
  const read = parseInt(pagesRead, 10);
  if (!title || !author || isNaN(total) || isNaN(read) || total < 1 || read < 0 || read > total) {
    return res.status(400).json({ error: "Data tidak valid." });
  }
  books[idx] = {
    ...books[idx],
    title: title.trim(),
    author: author.trim(),
    totalPages: total,
    pagesRead: read,
    status: deriveStatus(read, total),
    progress: Math.round((read / total) * 100),
  };
  res.json(books[idx]);
});

// DELETE book
app.delete("/api/books/:id", (req, res) => {
  const id = parseInt(req.params.id, 10);
  const before = books.length;
  books = books.filter((b) => b.id !== id);
  if (books.length === before) return res.status(404).json({ error: "Buku tidak ditemukan." });
  res.json({ success: true });
});

// ──────────────────────────────────────────────
// ROUTE: MOCK AI OUTLINE GENERATOR
// ──────────────────────────────────────────────
app.post("/api/outline", (req, res) => {
  const { topic } = req.body;
  if (!topic || typeof topic !== "string" || topic.trim().length === 0) {
    return res.status(400).json({ error: "Topik wajib diisi." });
  }

  // Artificial delay — makes the loading feel real
  setTimeout(() => {
    const template = pickTemplate(topic.trim());
    res.json({
      topic: topic.trim(),
      outline: template.chapters,
    });
  }, 1500);
});

// ──────────────────────────────────────────────
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Sankara v2 running → http://localhost:${PORT}`));

export default app;