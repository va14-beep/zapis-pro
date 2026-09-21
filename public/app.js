const API = '';
let token = localStorage.getItem('zp_token') || '';
let user = null;
let currentView = 'home';

// ========== UTILS ==========
function toast(msg, isError = false) {
  const el = document.getElementById('toast');
  el.textContent = msg;
  el.className = `fixed bottom-6 left-1/2 -translate-x-1/2 px-5 py-3 rounded-xl text-sm shadow-lg z-50 ${isError ? 'bg-red-600' : 'bg-slate-900'} text-white`;
  el.classList.remove('hidden');
  setTimeout(() => el.classList.add('hidden'), 2800);
}

async function api(method, path, body) {
  const opts = {
    method,
    headers: { 'Content-Type': 'application/json' }
  };
  if (token) opts.headers['Authorization'] = 'Bearer ' + token;
  if (body) opts.body = JSON.stringify(body);
  const res = await fetch(API + path, opts);
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || 'Ошибка сервера');
  return data;
}

function escapeHtml(s) {
  if (!s) return '';
  return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

function formatDate(iso) {
  if (!iso) return '';
  const [y,m,d] = iso.split('-');
  return `${d}.${m}.${y}`;
}

function formatMoney(n) {
  return (n || 0).toLocaleString('ru-RU') + ' ₽';
}

// ========== ROUTER ==========
function navigate(view, params = {}) {
  currentView = view;
  let path = "/";
  if (view === "login") path = "/login";
  else if (view === "register") path = "/register";
  else if (view === "admin") path = "/admin";
  else if (view === "dashboard") path = "/dashboard";
  else if (view === "public" && params.slug) path = "/book/" + params.slug;
  window.history.pushState({}, "", path);
  render();
}

window.addEventListener('popstate', () => {
  const hash = location.hash.slice(1);
  if (hash.startsWith('book/')) {
    currentView = 'public';
    render({ slug: hash.split('/')[1] });
  } else if (hash === 'login') currentView = 'login';
  else if (hash === 'register') currentView = 'register';
  else if (hash === 'admin') currentView = 'admin';
  else if (hash === 'dashboard') currentView = 'dashboard';
  else currentView = 'home';
  render();
});

// ========== RENDER ==========
async function render(params = {}) {
  const app = document.getElementById('app');
  app.innerHTML = '<div class="flex items-center justify-center min-h-screen text-slate-400">Загрузка...</div>';

  try {
    if (token && !user) {
      try {
        user = await api('GET', '/api/me');
      } catch (e) {
        token = '';
        localStorage.removeItem('zp_token');
        user = null;
      }
    }

    const hash = location.hash.slice(1);
    if (hash.startsWith('book/')) {
      return renderPublic(hash.split('/')[1]);
    }

    if (currentView === 'login') return renderLogin();
    if (currentView === 'register') return renderRegister();
    if (currentView === 'admin' && user?.role === 'admin') return renderAdmin();
    if (currentView === 'dashboard' && user?.role === 'master') return renderDashboard();
    if (user?.role === 'admin') return renderAdmin();
    if (user?.role === 'master') return renderDashboard();
    return renderHome();
  } catch (e) {
    app.innerHTML = `<div class="p-8 text-center text-red-600">${escapeHtml(e.message)}</div>`;
  }
}

// ========== HOME ==========
function renderHome() {
  document.getElementById('app').innerHTML = `
    <div class="min-h-screen flex flex-col">
      <header class="bg-white border-b border-slate-200">
        <div class="max-w-5xl mx-auto px-4 py-4 flex items-center justify-between">
          <div class="flex items-center gap-2">
            <div class="w-9 h-9 bg-indigo-600 rounded-xl flex items-center justify-center text-white font-bold text-lg">З</div>
            <span class="font-bold text-xl tracking-tight">ЗаписьPRO</span>
          </div>
          <div class="flex gap-2">
            <button onclick="navigate('login')" class="px-4 py-2 text-sm font-medium text-slate-600 hover:text-indigo-600">Войти</button>
            <button onclick="navigate('register')" class="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700">Регистрация</button>
          </div>
        </div>
      </header>

      <main class="flex-1 flex items-center justify-center px-4 py-16">
        <div class="max-w-2xl text-center fade">
          <h1 class="text-4xl sm:text-5xl font-bold text-slate-900 leading-tight">
            Простая запись клиентов<br><span class="text-indigo-600">без хаоса</span>
          </h1>
          <p class="mt-5 text-lg text-slate-500 max-w-lg mx-auto">
            Для мастеров, репетиторов, психологов и всех, кто принимает клиентов. 
            Клиенты записываются сами. Ты видишь всё в одном месте.
          </p>
          <div class="mt-8 flex flex-col sm:flex-row gap-3 justify-center">
            <button onclick="navigate('register')" class="px-8 py-3.5 bg-indigo-600 text-white rounded-xl font-semibold text-lg hover:bg-indigo-700 shadow-lg shadow-indigo-200">
              Начать бесплатно
            </button>
            <button onclick="navigate('login')" class="px-8 py-3.5 bg-white border border-slate-200 text-slate-700 rounded-xl font-semibold text-lg hover:bg-slate-50">
              У меня уже есть аккаунт
            </button>
          </div>

          <div class="mt-16 grid grid-cols-1 sm:grid-cols-3 gap-6 text-left">
            <div class="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm">
              <div class="text-2xl mb-2">📅</div>
              <div class="font-semibold">Запись по ссылке</div>
              <div class="text-sm text-slate-500 mt-1">Клиент сам выбирает время — без переписок</div>
            </div>
            <div class="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm">
              <div class="text-2xl mb-2">💰</div>
              <div class="font-semibold">Учёт денег</div>
              <div class="text-sm text-slate-500 mt-1">Видишь, сколько заработал за день и месяц</div>
            </div>
            <div class="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm">
              <div class="text-2xl mb-2">⚡</div>
              <div class="font-semibold">Без сложностей</div>
              <div class="text-sm text-slate-500 mt-1">Никаких лишних кнопок и настроек</div>
            </div>
          </div>
        </div>
      </main>

      <footer class="py-6 text-center text-sm text-slate-400">
        ЗаписьPRO · 2026
      </footer>
    </div>
  `;
}

// ========== LOGIN / REGISTER ==========
function renderLogin() {
  document.getElementById('app').innerHTML = `
    <div class="min-h-screen flex items-center justify-center px-4">
      <div class="w-full max-w-md bg-white rounded-2xl shadow-sm border border-slate-100 p-8 fade">
        <div class="text-center mb-6">
          <div class="w-12 h-12 bg-indigo-600 rounded-xl flex items-center justify-center text-white font-bold text-xl mx-auto">З</div>
          <h1 class="text-2xl font-bold mt-3">Вход</h1>
        </div>
        <form id="login-form" class="space-y-4">
          <div>
            <label class="block text-sm font-medium text-slate-700 mb-1">Email</label>
            <input name="email" type="email" required class="w-full border border-slate-200 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-indigo-500" placeholder="you@email.com">
          </div>
          <div>
            <label class="block text-sm font-medium text-slate-700 mb-1">Пароль</label>
            <input name="password" type="password" required class="w-full border border-slate-200 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-indigo-500">
          </div>
          <button type="submit" class="w-full bg-indigo-600 text-white py-3 rounded-xl font-semibold hover:bg-indigo-700">Войти</button>
        </form>
        <div class="mt-5 text-center text-sm text-slate-500">
          Нет аккаунта? <button onclick="navigate('register')" class="text-indigo-600 font-medium">Зарегистрироваться</button>
        </div>
        <div class="mt-4 pt-4 border-t border-slate-100 text-center">
          <button onclick="showAdminLogin()" class="text-xs text-slate-400 hover:text-slate-600">Вход для владельца</button>
        </div>
      </div>
    </div>
  `;
  document.getElementById('login-form').onsubmit = async (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    try {
      const data = await api('POST', '/api/login', { email: fd.get('email'), password: fd.get('password') });
      token = data.token;
      localStorage.setItem('zp_token', token);
      user = data.master;
      user.role = 'master';
      toast('Добро пожаловать!');
      navigate('dashboard');
    } catch (err) {
      toast(err.message, true);
    }
  };
}

function showAdminLogin() {
  const pass = prompt('Пароль владельца:');
  if (!pass) return;
  api('POST', '/api/admin/login', { password: pass })
    .then(data => {
      token = data.token;
      localStorage.setItem('zp_token', token);
      user = { role: 'admin', name: 'Владелец' };
      toast('Вход выполнен');
      navigate('admin');
    })
    .catch(err => toast(err.message, true));
}

function renderRegister() {
  document.getElementById('app').innerHTML = `
    <div class="min-h-screen flex items-center justify-center px-4">
      <div class="w-full max-w-md bg-white rounded-2xl shadow-sm border border-slate-100 p-8 fade">
        <div class="text-center mb-6">
          <div class="w-12 h-12 bg-indigo-600 rounded-xl flex items-center justify-center text-white font-bold text-xl mx-auto">З</div>
          <h1 class="text-2xl font-bold mt-3">Регистрация</h1>
          <p class="text-sm text-slate-500 mt-1">Создай аккаунт за 30 секунд</p>
        </div>
        <form id="reg-form" class="space-y-4">
          <div>
            <label class="block text-sm font-medium text-slate-700 mb-1">Как вас зовут / название</label>
            <input name="name" required class="w-full border border-slate-200 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-indigo-500" placeholder="Анна, мастер маникюра">
          </div>
          <div>
            <label class="block text-sm font-medium text-slate-700 mb-1">Email</label>
            <input name="email" type="email" required class="w-full border border-slate-200 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-indigo-500">
          </div>
          <div>
            <label class="block text-sm font-medium text-slate-700 mb-1">Телефон (необязательно)</label>
            <input name="phone" type="tel" class="w-full border border-slate-200 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-indigo-500" placeholder="+7 999 123-45-67">
          </div>
          <div>
            <label class="block text-sm font-medium text-slate-700 mb-1">Пароль</label>
            <input name="password" type="password" required minlength="6" class="w-full border border-slate-200 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-indigo-500">
          </div>
          <button type="submit" class="w-full bg-indigo-600 text-white py-3 rounded-xl font-semibold hover:bg-indigo-700">Создать аккаунт</button>
        </form>
        <div class="mt-5 text-center text-sm text-slate-500">
          Уже есть аккаунт? <button onclick="navigate('login')" class="text-indigo-600 font-medium">Войти</button>
        </div>
      </div>
    </div>
  `;
  document.getElementById('reg-form').onsubmit = async (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    try {
      const data = await api('POST', '/api/register', {
        name: fd.get('name'),
        email: fd.get('email'),
        phone: fd.get('phone'),
        password: fd.get('password')
      });
      token = data.token;
      localStorage.setItem('zp_token', token);
      user = data.master;
      user.role = 'master';
      toast('Аккаунт создан!');
      navigate('dashboard');
    } catch (err) {
      toast(err.message, true);
    }
  };
}

// ========== DASHBOARD (мастер) ==========
async function renderDashboard() {
  const bookings = await api('GET', '/api/bookings');
  const today = new Date().toISOString().slice(0, 10);
  const todayCount = bookings.filter(b => b.date === today && b.status !== 'cancelled').length;
  const monthStart = today.slice(0, 8) + '01';
  const monthSum = bookings.filter(b => b.date >= monthStart && (b.status === 'paid' || b.status === 'done')).reduce((s, b) => s + (b.price || 0), 0);
  const clients = new Set(bookings.map(b => b.phone || b.name)).size;

  const publicLink = location.origin + '/#book/' + user.slug;

  document.getElementById('app').innerHTML = `
    <div class="min-h-screen">
      <header class="bg-white border-b border-slate-200 sticky top-0 z-40">
        <div class="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between">
          <div class="flex items-center gap-2">
            <div class="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center text-white font-bold">З</div>
            <span class="font-semibold">ЗаписьPRO</span>
          </div>
          <div class="flex items-center gap-3">
            <span class="text-sm text-slate-500 hidden sm:inline">${escapeHtml(user.name)}</span>
            <button onclick="logout()" class="text-sm text-slate-500 hover:text-red-600">Выйти</button>
          </div>
        </div>
      </header>

      <main class="max-w-5xl mx-auto px-4 py-6 space-y-6 fade">
        <!-- Stats -->
        <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div class="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm">
            <div class="text-sm text-slate-500">Сегодня</div>
            <div class="text-3xl font-bold mt-1">${todayCount}</div>
          </div>
          <div class="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm">
            <div class="text-sm text-slate-500">За месяц</div>
            <div class="text-3xl font-bold text-green-600 mt-1">${formatMoney(monthSum)}</div>
          </div>
          <div class="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm">
            <div class="text-sm text-slate-500">Клиентов</div>
            <div class="text-3xl font-bold text-indigo-600 mt-1">${clients}</div>
          </div>
        </div>

        <!-- Link -->
        <div class="bg-indigo-50 border border-indigo-100 rounded-2xl p-5">
          <div class="text-sm font-medium text-indigo-800 mb-2">Ваша ссылка для клиентов</div>
          <div class="flex gap-2">
            <input id="public-link" readonly value="${publicLink}" class="flex-1 bg-white border border-indigo-200 rounded-xl px-4 py-2.5 text-sm">
            <button onclick="copyLink()" class="px-5 py-2.5 bg-indigo-600 text-white rounded-xl text-sm font-medium hover:bg-indigo-700">Копировать</button>
          </div>
          <div class="text-xs text-indigo-600 mt-2">Отправьте эту ссылку клиентам — они смогут записаться сами</div>
        </div>

        <!-- Actions -->
        <div class="flex flex-wrap gap-3">
          <button onclick="showAddModal()" class="px-5 py-2.5 bg-indigo-600 text-white rounded-xl text-sm font-medium hover:bg-indigo-700">+ Добавить запись</button>
        </div>

        <!-- Bookings -->
        <div class="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
          <div class="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
            <h2 class="font-semibold text-lg">Записи</h2>
            <select id="filter" onchange="filterBookings()" class="text-sm border border-slate-200 rounded-lg px-3 py-1.5">
              <option value="all">Все</option>
              <option value="upcoming">Предстоящие</option>
              <option value="done">Выполненные</option>
              <option value="paid">Оплаченные</option>
            </select>
          </div>
          <div id="bookings-list" class="divide-y divide-slate-100">
            ${renderBookingsList(bookings)}
          </div>
        </div>
      </main>
    </div>

    <!-- Modal Add -->
    <div id="modal-add" class="hidden fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <div class="bg-white rounded-2xl w-full max-w-md p-6 shadow-xl">
        <h3 class="text-lg font-semibold mb-4">Новая запись</h3>
        <div class="space-y-3">
          <input id="add-name" placeholder="Имя клиента" class="w-full border border-slate-200 rounded-xl px-4 py-2.5">
          <input id="add-phone" placeholder="Телефон" class="w-full border border-slate-200 rounded-xl px-4 py-2.5">
          <input id="add-date" type="date" class="w-full border border-slate-200 rounded-xl px-4 py-2.5">
          <input id="add-time" type="time" class="w-full border border-slate-200 rounded-xl px-4 py-2.5">
          <input id="add-service" placeholder="Услуга" class="w-full border border-slate-200 rounded-xl px-4 py-2.5">
          <input id="add-price" type="number" placeholder="Цена (₽)" class="w-full border border-slate-200 rounded-xl px-4 py-2.5">
        </div>
        <div class="flex gap-3 mt-5">
          <button onclick="hideAddModal()" class="flex-1 py-2.5 rounded-xl bg-slate-100 font-medium">Отмена</button>
          <button onclick="addBooking()" class="flex-1 py-2.5 rounded-xl bg-indigo-600 text-white font-medium">Сохранить</button>
        </div>
      </div>
    </div>
  `;

  window._allBookings = bookings;
}

function renderBookingsList(list) {
  if (!list.length) return `<div class="p-10 text-center text-slate-400">Пока нет записей</div>`;
  return list.sort((a,b) => (a.date + a.time).localeCompare(b.date + b.time)).map(b => {
    const badge = {
      upcoming: 'bg-blue-100 text-blue-700',
      done: 'bg-amber-100 text-amber-700',
      paid: 'bg-green-100 text-green-700'
    }[b.status] || 'bg-slate-100 text-slate-600';
    const label = { upcoming: 'Ожидает', done: 'Выполнено', paid: 'Оплачено' }[b.status] || b.status;
    return `
      <div class="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-slate-50">
        <div>
          <div class="flex items-center gap-2 flex-wrap">
            <span class="font-medium">${escapeHtml(b.name)}</span>
            <span class="text-xs px-2 py-0.5 rounded-full ${badge}">${label}</span>
            ${b.fromClient ? '<span class="text-xs text-indigo-500">с сайта</span>' : ''}
          </div>
          <div class="text-sm text-slate-500 mt-0.5">
            ${formatDate(b.date)} в ${b.time} · ${escapeHtml(b.service)}
            ${b.phone ? ' · ' + escapeHtml(b.phone) : ''}
          </div>
          ${b.price ? `<div class="text-sm font-medium text-green-600 mt-1">${formatMoney(b.price)}</div>` : ''}
        </div>
        <div class="flex gap-2 flex-shrink-0">
          ${b.status === 'upcoming' ? `<button onclick="setStatus('${b.id}','done')" class="text-xs px-3 py-1.5 rounded-lg bg-amber-50 text-amber-700 hover:bg-amber-100">Выполнено</button>` : ''}
          ${b.status !== 'paid' ? `<button onclick="setStatus('${b.id}','paid')" class="text-xs px-3 py-1.5 rounded-lg bg-green-50 text-green-700 hover:bg-green-100">Оплачено</button>` : ''}
          <button onclick="deleteBooking('${b.id}')" class="text-xs px-3 py-1.5 rounded-lg bg-red-50 text-red-600 hover:bg-red-100">Удалить</button>
        </div>
      </div>
    `;
  }).join('');
}

function filterBookings() {
  const f = document.getElementById('filter').value;
  let list = window._allBookings || [];
  if (f !== 'all') list = list.filter(b => b.status === f);
  document.getElementById('bookings-list').innerHTML = renderBookingsList(list);
}

function showAddModal() {
  document.getElementById('modal-add').classList.remove('hidden');
  document.getElementById('add-date').value = new Date().toISOString().slice(0, 10);
}
function hideAddModal() {
  document.getElementById('modal-add').classList.add('hidden');
}

async function addBooking() {
  const body = {
    name: document.getElementById('add-name').value.trim(),
    phone: document.getElementById('add-phone').value.trim(),
    date: document.getElementById('add-date').value,
    time: document.getElementById('add-time').value,
    service: document.getElementById('add-service').value.trim(),
    price: document.getElementById('add-price').value
  };
  if (!body.name || !body.date || !body.time) return toast('Заполните имя, дату и время', true);
  try {
    await api('POST', '/api/bookings', body);
    toast('Запись добавлена');
    hideAddModal();
    renderDashboard();
  } catch (e) {
    toast(e.message, true);
  }
}

async function setStatus(id, status) {
  let price;
  if (status === 'paid') {
    const b = (window._allBookings || []).find(x => x.id === id);
    if (!b?.price) {
      const p = prompt('Сумма оплаты (₽):', '1500');
      if (p === null) return;
      price = parseInt(p) || 0;
    }
  }
  try {
    await api('PATCH', '/api/bookings/' + id, { status, price });
    toast(status === 'paid' ? 'Оплата зафиксирована' : 'Статус обновлён');
    renderDashboard();
  } catch (e) {
    toast(e.message, true);
  }
}

async function deleteBooking(id) {
  if (!confirm('Удалить запись?')) return;
  try {
    await api('DELETE', '/api/bookings/' + id);
    toast('Удалено');
    renderDashboard();
  } catch (e) {
    toast(e.message, true);
  }
}

function copyLink() {
  const input = document.getElementById('public-link');
  navigator.clipboard.writeText(input.value).then(() => toast('Ссылка скопирована'));
}

// ========== PUBLIC BOOKING ==========
async function renderPublic(slug) {
  try {
    const master = await api('GET', '/api/public/' + slug);
    document.getElementById('app').innerHTML = `
      <div class="min-h-screen flex items-center justify-center px-4 py-10">
        <div class="w-full max-w-md bg-white rounded-2xl shadow-sm border border-slate-100 p-6 fade">
          <div class="text-center mb-6">
            <div class="text-xl font-bold">${escapeHtml(master.name)}</div>
            <div class="text-sm text-slate-500 mt-1">Выберите удобное время</div>
          </div>
          <form id="public-form" class="space-y-4">
            <div>
              <label class="block text-sm font-medium mb-1">Ваше имя</label>
              <input name="name" required class="w-full border border-slate-200 rounded-xl px-4 py-2.5" placeholder="Как к вам обращаться">
            </div>
            <div>
              <label class="block text-sm font-medium mb-1">Телефон</label>
              <input name="phone" type="tel" required class="w-full border border-slate-200 rounded-xl px-4 py-2.5" placeholder="+7 999 123-45-67">
            </div>
            <div>
              <label class="block text-sm font-medium mb-1">Дата</label>
              <input name="date" type="date" required class="w-full border border-slate-200 rounded-xl px-4 py-2.5">
            </div>
            <div>
              <label class="block text-sm font-medium mb-1">Время</label>
              <select name="time" required class="w-full border border-slate-200 rounded-xl px-4 py-2.5">
                <option value="">Выберите время</option>
                ${Array.from({length: 24}, (_,i) => i).filter(h => h >= 9 && h <= 20).flatMap(h => [
                  `<option value="${String(h).padStart(2,'0')}:00">${String(h).padStart(2,'0')}:00</option>`,
                  h < 20 ? `<option value="${String(h).padStart(2,'0')}:30">${String(h).padStart(2,'0')}:30</option>` : ''
                ]).join('')}
              </select>
            </div>
            <div>
              <label class="block text-sm font-medium mb-1">Услуга (необязательно)</label>
              <input name="service" class="w-full border border-slate-200 rounded-xl px-4 py-2.5" placeholder="Маникюр, стрижка...">
            </div>
            <button type="submit" class="w-full bg-indigo-600 text-white py-3 rounded-xl font-semibold hover:bg-indigo-700">Записаться</button>
          </form>
        </div>
      </div>
    `;
    const form = document.getElementById('public-form');
    form.date.value = new Date().toISOString().slice(0, 10);
    form.date.min = new Date().toISOString().slice(0, 10);
    form.onsubmit = async (e) => {
      e.preventDefault();
      const fd = new FormData(form);
      try {
        await api('POST', '/api/public/' + slug + '/book', {
          name: fd.get('name'),
          phone: fd.get('phone'),
          date: fd.get('date'),
          time: fd.get('time'),
          service: fd.get('service')
        });
        toast('Вы успешно записались!');
        form.reset();
        form.date.value = new Date().toISOString().slice(0, 10);
      } catch (err) {
        toast(err.message, true);
      }
    };
  } catch (e) {
    document.getElementById('app').innerHTML = `<div class="p-10 text-center text-red-600">Мастер не найден</div>`;
  }
}

// ========== ADMIN ==========
async function renderAdmin() {
  const [stats, masters] = await Promise.all([
    api('GET', '/api/admin/stats'),
    api('GET', '/api/admin/masters')
  ]);

  document.getElementById('app').innerHTML = `
    <div class="min-h-screen">
      <header class="bg-slate-900 text-white sticky top-0 z-40">
        <div class="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between">
          <div class="flex items-center gap-2">
            <div class="w-8 h-8 bg-indigo-500 rounded-lg flex items-center justify-center font-bold">З</div>
            <span class="font-semibold">ЗаписьPRO · Админ</span>
          </div>
          <button onclick="logout()" class="text-sm text-slate-300 hover:text-white">Выйти</button>
        </div>
      </header>

      <main class="max-w-5xl mx-auto px-4 py-6 space-y-6 fade">
        <div class="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div class="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm">
            <div class="text-sm text-slate-500">Мастеров</div>
            <div class="text-3xl font-bold mt-1">${stats.masters}</div>
          </div>
          <div class="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm">
            <div class="text-sm text-slate-500">Всего записей</div>
            <div class="text-3xl font-bold mt-1">${stats.bookings}</div>
          </div>
          <div class="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm">
            <div class="text-sm text-slate-500">Оплачено</div>
            <div class="text-3xl font-bold mt-1">${stats.paidCount}</div>
          </div>
          <div class="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm">
            <div class="text-sm text-slate-500">Оборот</div>
            <div class="text-3xl font-bold text-green-600 mt-1">${formatMoney(stats.revenue)}</div>
          </div>
        </div>

        <div class="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
          <div class="px-5 py-4 border-b border-slate-100">
            <h2 class="font-semibold text-lg">Все мастера</h2>
          </div>
          <div class="divide-y divide-slate-100">
            ${masters.length === 0 ? '<div class="p-8 text-center text-slate-400">Пока нет мастеров</div>' :
              masters.map(m => `
                <div class="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <div class="font-medium">${escapeHtml(m.name)} ${m.active ? '' : '<span class="text-xs text-red-500">(отключён)</span>'}</div>
                    <div class="text-sm text-slate-500">${escapeHtml(m.email)} · ${m.bookingsCount} записей · slug: ${m.slug}</div>
                  </div>
                  <button onclick="toggleMaster('${m.id}', ${!m.active})" class="text-xs px-3 py-1.5 rounded-lg ${m.active ? 'bg-red-50 text-red-600' : 'bg-green-50 text-green-700'}">
                    ${m.active ? 'Отключить' : 'Включить'}
                  </button>
                </div>
              `).join('')}
          </div>
        </div>
      </main>
    </div>
  `;
}

async function toggleMaster(id, active) {
  try {
    await api('PATCH', '/api/admin/masters/' + id, { active });
    toast(active ? 'Включён' : 'Отключён');
    renderAdmin();
  } catch (e) {
    toast(e.message, true);
  }
}

function logout() {
  token = '';
  user = null;
  localStorage.removeItem('zp_token');
  navigate('home');
}

// ========== START ==========
render();
