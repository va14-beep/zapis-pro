const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const low = require('lowdb');
const FileSync = require('lowdb/adapters/FileSync');

const app = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = 'zapis-pro-secret-key-change-me-in-production-2026';
const ADMIN_PASSWORD = 'admin123'; // Смени после первого входа!

// База данных
const dbPath = path.join(__dirname, 'db.json');
const adapter = new FileSync(dbPath);
const db = low(adapter);

// Инициализация БД
db.defaults({
  masters: [],
  bookings: [],
  settings: { siteName: 'ЗаписьPRO' }
}).write();

app.use(cors());
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, 'public')));

// ========== HELPERS ==========
function authMiddleware(req, res, next) {
  const token = req.headers.authorization?.replace('Bearer ', '');
  if (!token) return res.status(401).json({ error: 'Нет токена' });
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (e) {
    return res.status(401).json({ error: 'Неверный токен' });
  }
}

function adminMiddleware(req, res, next) {
  if (req.user.role !== 'admin') return res.status(403).json({ error: 'Только для админа' });
  next();
}

// ========== AUTH ==========
// Регистрация мастера
app.post('/api/register', async (req, res) => {
  const { name, email, password, phone } = req.body;
  if (!name || !email || !password) {
    return res.status(400).json({ error: 'Заполните имя, email и пароль' });
  }
  const exists = db.get('masters').find({ email: email.toLowerCase() }).value();
  if (exists) return res.status(400).json({ error: 'Email уже занят' });

  const hash = await bcrypt.hash(password, 10);
  const trialEnds = new Date();
  trialEnds.setDate(trialEnds.getDate() + 7); // 7 дней пробного периода

  const master = {
    id: uuidv4(),
    name,
    email: email.toLowerCase(),
    phone: phone || '',
    password: hash,
    slug: name.toLowerCase().replace(/[^a-zа-я0-9]/gi, '-').replace(/-+/g, '-').slice(0, 30) + '-' + Date.now().toString(36).slice(-4),
    createdAt: new Date().toISOString(),
    active: true,
    isPaid: false,
    trialEndsAt: trialEnds.toISOString()
  };
  db.get('masters').push(master).write();

  const token = jwt.sign({ id: master.id, role: 'master', name: master.name }, JWT_SECRET, { expiresIn: '30d' });
  res.json({
    token,
    master: { id: master.id, name: master.name, email: master.email, slug: master.slug }
  });
});

// Вход мастера
app.post('/api/login', async (req, res) => {
  const { email, password } = req.body;
  const master = db.get('masters').find({ email: (email || '').toLowerCase() }).value();
  if (!master) return res.status(401).json({ error: 'Неверный email или пароль' });

  const ok = await bcrypt.compare(password, master.password);
  if (!ok) return res.status(401).json({ error: 'Неверный email или пароль' });

  const token = jwt.sign({ id: master.id, role: 'master', name: master.name }, JWT_SECRET, { expiresIn: '30d' });
  res.json({
    token,
    master: { id: master.id, name: master.name, email: master.email, slug: master.slug }
  });
});

// Вход админа (владельца)
app.post('/api/admin/login', (req, res) => {
  const { password } = req.body;
  if (password !== ADMIN_PASSWORD) {
    return res.status(401).json({ error: 'Неверный пароль админа' });
  }
  const token = jwt.sign({ id: 'admin', role: 'admin', name: 'Владелец' }, JWT_SECRET, { expiresIn: '7d' });
  res.json({ token, role: 'admin' });
});

// ========== MASTER API ==========
app.get('/api/me', authMiddleware, (req, res) => {
  if (req.user.role === 'admin') {
    return res.json({ role: 'admin', name: 'Владелец' });
  }
  const master = db.get('masters').find({ id: req.user.id }).value();
  if (!master) return res.status(404).json({ error: 'Мастер не найден' });
  const now = new Date();
  let trialEndsAt = master.trialEndsAt || null;

  // Если у старого мастера нет trialEndsAt — даём 7 дней с текущего момента
  if (!trialEndsAt && !master.isPaid) {
    const trialEnds = new Date();
    trialEnds.setDate(trialEnds.getDate() + 7);
    trialEndsAt = trialEnds.toISOString();
    db.get('masters').find({ id: master.id }).assign({ trialEndsAt }).write();
  }

  const trialEnds = trialEndsAt ? new Date(trialEndsAt) : null;
  const isTrialActive = trialEnds && now < trialEnds;
  const hasAccess = !!master.isPaid || !!isTrialActive;

  res.json({
    id: master.id,
    name: master.name,
    email: master.email,
    phone: master.phone,
    slug: master.slug,
    role: 'master',
    isPaid: !!master.isPaid,
    trialEndsAt: trialEndsAt,
    isTrialActive: !!isTrialActive,
    hasAccess: hasAccess
  });
});

app.put('/api/me', authMiddleware, (req, res) => {
  if (req.user.role !== 'master') return res.status(403).json({ error: 'Только для мастеров' });
  const { name, phone } = req.body;
  db.get('masters').find({ id: req.user.id }).assign({
    name: name || undefined,
    phone: phone || undefined
  }).write();
  const master = db.get('masters').find({ id: req.user.id }).value();
  res.json({ id: master.id, name: master.name, email: master.email, phone: master.phone, slug: master.slug });
});

// Записи мастера
app.get('/api/bookings', authMiddleware, (req, res) => {
  if (req.user.role === 'admin') {
    const all = db.get('bookings').value();
    return res.json(all);
  }
  const list = db.get('bookings').filter({ masterId: req.user.id }).value();
  res.json(list);
});

app.post('/api/bookings', authMiddleware, (req, res) => {
  if (req.user.role !== 'master') return res.status(403).json({ error: 'Только для мастеров' });
  const { name, phone, date, time, service, price } = req.body;
  if (!name || !date || !time) return res.status(400).json({ error: 'Имя, дата и время обязательны' });

  const booking = {
    id: uuidv4(),
    masterId: req.user.id,
    name,
    phone: phone || '',
    date,
    time,
    service: service || 'Услуга',
    price: parseInt(price) || 0,
    status: 'upcoming',
    fromClient: false,
    createdAt: new Date().toISOString()
  };
  db.get('bookings').push(booking).write();
  res.json(booking);
});

app.patch('/api/bookings/:id', authMiddleware, (req, res) => {
  const booking = db.get('bookings').find({ id: req.params.id }).value();
  if (!booking) return res.status(404).json({ error: 'Запись не найдена' });
  if (req.user.role === 'master' && booking.masterId !== req.user.id) {
    return res.status(403).json({ error: 'Нет доступа' });
  }

  const updates = {};
  if (req.body.status) updates.status = req.body.status;
  if (req.body.price !== undefined) updates.price = parseInt(req.body.price) || 0;
  if (req.body.service) updates.service = req.body.service;

  db.get('bookings').find({ id: req.params.id }).assign(updates).write();
  res.json(db.get('bookings').find({ id: req.params.id }).value());
});

app.delete('/api/bookings/:id', authMiddleware, (req, res) => {
  const booking = db.get('bookings').find({ id: req.params.id }).value();
  if (!booking) return res.status(404).json({ error: 'Запись не найдена' });
  if (req.user.role === 'master' && booking.masterId !== req.user.id) {
    return res.status(403).json({ error: 'Нет доступа' });
  }
  db.get('bookings').remove({ id: req.params.id }).write();
  res.json({ ok: true });
});

// ========== PUBLIC API (клиенты) ==========
app.get('/api/public/:slug', (req, res) => {
  const master = db.get('masters').find({ slug: req.params.slug }).value();
  if (!master || !master.active) return res.status(404).json({ error: 'Мастер не найден' });
  res.json({ name: master.name, slug: master.slug });
});

app.post('/api/public/:slug/book', (req, res) => {
  const master = db.get('masters').find({ slug: req.params.slug }).value();
  if (!master || !master.active) return res.status(404).json({ error: 'Мастер не найден' });

  const { name, phone, date, time, service } = req.body;
  if (!name || !phone || !date || !time) {
    return res.status(400).json({ error: 'Заполните имя, телефон, дату и время' });
  }

  const booking = {
    id: uuidv4(),
    masterId: master.id,
    name,
    phone,
    date,
    time,
    service: service || 'Услуга',
    price: 0,
    status: 'upcoming',
    fromClient: true,
    createdAt: new Date().toISOString()
  };
  db.get('bookings').push(booking).write();
  res.json({ ok: true, message: 'Вы успешно записались!' });
});

// ========== ADMIN API ==========
app.get('/api/admin/masters', authMiddleware, adminMiddleware, (req, res) => {
  const masters = db.get('masters').map(m => {
    const now = new Date();
    const trialEnds = m.trialEndsAt ? new Date(m.trialEndsAt) : null;
    const isTrialActive = trialEnds && now < trialEnds;
    return {
      id: m.id,
      name: m.name,
      email: m.email,
      phone: m.phone,
      slug: m.slug,
      createdAt: m.createdAt,
      active: m.active,
      isPaid: !!m.isPaid,
      trialEndsAt: m.trialEndsAt || null,
      isTrialActive: !!isTrialActive,
      hasAccess: !!(m.isPaid || isTrialActive),
      bookingsCount: db.get('bookings').filter({ masterId: m.id }).size().value()
    };
  }).value();
  res.json(masters);
});

app.get('/api/admin/stats', authMiddleware, adminMiddleware, (req, res) => {
  const masters = db.get('masters').value().length;
  const bookings = db.get('bookings').value().length;
  const paid = db.get('bookings').filter({ status: 'paid' }).value();
  const revenue = paid.reduce((s, b) => s + (b.price || 0), 0);
  res.json({ masters, bookings, revenue, paidCount: paid.length });
});

app.patch('/api/admin/masters/:id', authMiddleware, adminMiddleware, (req, res) => {
  const { active, isPaid } = req.body;
  const updates = {};
  if (typeof active !== 'undefined') updates.active = !!active;
  if (typeof isPaid !== 'undefined') updates.isPaid = !!isPaid;
  db.get('masters').find({ id: req.params.id }).assign(updates).write();
  res.json({ ok: true });
});

// SPA fallback
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`ЗаписьPRO запущен на http://localhost:${PORT}`);
  console.log(`Админ-пароль: ${ADMIN_PASSWORD}`);
});
