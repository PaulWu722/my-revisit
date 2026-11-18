// 我的回訪 — data, UI and glue. The island scene lives in scene.js.

const KEY = 'myRevisit.v1';
const LEVELS = [
  { name: '冷淡', color: 'var(--lv0)' },
  { name: '禮貌', color: 'var(--lv1)' },
  { name: '有興趣', color: 'var(--lv2)' },
  { name: '想讀經', color: 'var(--lv3)' },
  { name: '固定讀經', color: 'var(--lv4)' },
];
const SCHOOLS = ['中興大學', '亞洲大學', '朝陽科技大學'];
const SPRITES = 8; // sprites/1 … sprites/8 (ChatGPT-drawn pose sets)
const BOOKS = '創世記 出埃及記 利未記 民數記 申命記 約書亞記 士師記 路得記 撒母耳記上 撒母耳記下 列王紀上 列王紀下 歷代志上 歷代志下 以斯拉記 尼希米記 以斯帖記 約伯記 詩篇 箴言 傳道書 雅歌 以賽亞書 耶利米書 耶利米哀歌 以西結書 但以理書 何西阿書 約珥書 阿摩司書 俄巴底亞書 約拿書 彌迦書 那鴻書 哈巴谷書 西番雅書 哈該書 撒迦利亞書 瑪拉基書 馬太福音 馬可福音 路加福音 約翰福音 使徒行傳 羅馬書 哥林多前書 哥林多後書 加拉太書 以弗所書 腓立比書 歌羅西書 帖撒羅尼迦前書 帖撒羅尼迦後書 提摩太前書 提摩太後書 提多書 腓利門書 希伯來書 雅各書 彼得前書 彼得後書 約翰一書 約翰二書 約翰三書 猶大書 啟示錄'.split(' ');

// ---------- dates (all local time) ----------
const pad = n => String(n).padStart(2, '0');
const ymd = d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const parseYmd = s => { const [y, m, d] = s.split('-').map(Number); return new Date(y, m - 1, d); };
const today = () => ymd(new Date());
const addDays = (s, n) => { const d = parseYmd(s); d.setDate(d.getDate() + n); return ymd(d); };
const mondayOf = s => { const d = parseYmd(s); d.setDate(d.getDate() - ((d.getDay() + 6) % 7)); return ymd(d); };
const daysBetween = (a, b) => Math.round((parseYmd(b) - parseYmd(a)) / 86400000);
const WEEK = ['日', '一', '二', '三', '四', '五', '六'];
const fmtDate = s => { const d = parseYmd(s); return `${d.getMonth() + 1}/${d.getDate()}（${WEEK[d.getDay()]}）`; };

// ---------- state ----------
let people = load();
let filters = { q: '', school: '', dept: '', lv: '' };
let openId = null;
let editingId = null;
let scene = null;
let lastWeek = mondayOf(today());
let lastDay = today();

const daysSince = p => (p.lastContact ? daysBetween(p.lastContact, today()) : null);
const isContacted = p => p.contactedWeek === mondayOf(today()); // auto "reset" every Monday 00:00
const spriteOf = p => p.sprite || ([...p.id].reduce((a, c) => a + c.charCodeAt(0), 0) % SPRITES) + 1;
const uid = () => Math.random().toString(36).slice(2, 10);

function seed() {
  const t = today(), wk = mondayOf(t);
  const daysAgo = n => addDays(t, -n);
  const inDays = (n, hm) => `${addDays(t, n)}T${hm}`;
  return [
    { id: 'demo1', name: '林宥安', school: '亞洲大學', dept: '資訊工程學系', grade: '大二', howMet: '迎新活動聊天，交換 IG', openness: 3, photo: 'avatars/1.png', sprite: 1, lineId: '', igId: 'yoan.lin',
      lastContact: daysAgo(35), contactedWeek: null,
      interactions: [{ date: daysAgo(35), summary: '校園碰面，一起吃午餐', topics: ['近況', '分享近況'] }, { date: daysAgo(42), summary: '初次認識：迎新活動聊天', topics: ['自我介紹'] }],
      appt: { at: inDays(3, '12:30'), place: '校內美食街', passage: '約翰福音 3:16' }, prayer: '期末專題順利，壓力能調適\n對信仰的好奇與敞開持續成長', reading: { book: '約翰福音', chapter: 3 } },
    { id: 'demo2', name: '陳雅筑', school: '朝陽科技大學', dept: '應用英語系', grade: '大一', howMet: '宿舍室友介紹', openness: 2, photo: 'avatars/2.png', sprite: 2, lineId: '', igId: 'yachu_chen',
      lastContact: daysAgo(16), contactedWeek: null,
      interactions: [{ date: daysAgo(16), summary: 'IG 私訊聊天', topics: ['課業壓力', '家人'] }],
      appt: null, prayer: '剛上大學，適應新環境', reading: null },
    { id: 'demo3', name: '張惟恩', school: '中興大學', dept: '心理學系', grade: '大三', howMet: '球隊認識', openness: 0, photo: 'avatars/3.png', sprite: 3, lineId: '', igId: '',
      lastContact: daysAgo(9), contactedWeek: null,
      interactions: [{ date: daysAgo(9), summary: '打完球一起吃宵夜', topics: ['運動', '未來規劃'] }],
      appt: null, prayer: '準備研究所考試', reading: null },
    { id: 'demo4', name: '黃心語', school: '朝陽科技大學', dept: '社會工作系', grade: '大二', howMet: '小組聚會同學帶來', openness: 4, photo: 'avatars/4.png', sprite: 4, lineId: '', igId: 'xinyu.h',
      lastContact: daysAgo(1), contactedWeek: wk,
      interactions: [{ date: daysAgo(1), summary: '一起讀經：羅馬書 8 章', topics: ['讀經', '禱告'] }, { date: daysAgo(8), summary: '小組聚會後聊天', topics: ['生活分享'] }],
      appt: { at: inDays(5, '19:00'), place: '學生中心', passage: '羅馬書 8:28' }, prayer: '家人身體健康', reading: { book: '羅馬書', chapter: 8 } },
    { id: 'demo5', name: '許承翰', school: '亞洲大學', dept: '數位媒體設計學系', grade: '大一', howMet: '社團博覽會', openness: 1, photo: 'avatars/5.png', sprite: 5, lineId: '', igId: '',
      lastContact: daysAgo(2), contactedWeek: wk,
      interactions: [{ date: daysAgo(2), summary: 'LINE 聊天，約下週吃飯', topics: ['社團', '作品集'] }],
      appt: null, prayer: '', reading: null },
  ];
}

function load() {
  try {
    const d = JSON.parse(localStorage.getItem(KEY));
    // older saves: give the sample people their matching character
    if (Array.isArray(d?.people)) return d.people.map(p => (!p.sprite && /^demo[1-5]$/.test(p.id) ? { ...p, sprite: Number(p.id.slice(4)) } : p));
  } catch {}
  return seed();
}
const save = () => localStorage.setItem(KEY, JSON.stringify({ version: 1, people }));
const byId = id => people.find(p => p.id === id);

// ---------- helpers ----------
const $ = s => document.querySelector(s);
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
function avatar(p, cls = 'av') {
  return p.photo ? `<img class="${cls}" src="${esc(p.photo)}" alt="">` : `<div class="${cls}">${esc((p.name || '?')[0])}</div>`;
}
function dayBadge(p) {
  const d = daysSince(p);
  if (d === null) return `<span class="days d-gone">從未聯繫</span>`;
  const cls = d > 30 ? 'd-gone' : d > 14 ? 'd-bad' : d > 7 ? 'd-warn' : 'd-ok';
  return `<span class="days ${cls}">${d} 天</span>`;
}
const icon = (n, cls = 'ic') => `<img class="${cls}" src="icons/${n}.webp" alt="">`;
const gem = lv => `<img src="icons/lv${lv}.webp" alt="${LEVELS[lv].name}">`;
const lvPill = lv => `<span class="gems">${gem(lv)}</span> ${LEVELS[lv].name}`;
const wide = () => matchMedia('(min-width:1181px)').matches; // detail lives in the side panel on wide screens
function toast(msg) { const t = $('#toast'); t.textContent = msg; t.classList.add('show'); clearTimeout(toast.h); toast.h = setTimeout(() => t.classList.remove('show'), 2200); }

function visible() {
  const q = filters.q.trim().toLowerCase();
  return people.filter(p =>
    (!q || `${p.name} ${p.school} ${p.dept}`.toLowerCase().includes(q)) &&
    (!filters.school || p.school === filters.school) &&
    (!filters.dept || p.dept === filters.dept) &&
    (filters.lv === '' || p.openness === Number(filters.lv)));
}
const byDays = (a, b) => (daysSince(b) ?? 1e9) - (daysSince(a) ?? 1e9);

// ---------- render ----------
function render() {
  const list = visible();
  scene?.setPeople(list.map(p => ({ id: p.id, name: p.name, school: p.school, dept: p.dept, openness: p.openness, contacted: isContacted(p), daysSince: daysSince(p), sprite: spriteOf(p) })));
  if (scene) {
    $('#sceneFallback').hidden = list.length > 0;
    $('#sceneFallback').textContent = '沒有符合篩選的人';
  }

  // quick-contact list: not contacted this week, longest first
  const urgent = list.filter(p => !isContacted(p)).sort(byDays);
  if (!openId && wide()) openId = (urgent[0] || list[0] || people[0])?.id ?? null;
  $('#urgent').innerHTML = urgent.length ? urgent.map(p => {
    const d = daysSince(p), late = d === null || d > 30;
    return `<div class="urgent-item ${p.id === openId ? 'sel' : ''}" data-open="${esc(p.id)}">${avatar(p)}
      <div class="who"><b>${esc(p.name)}</b><small>${esc(p.school)}・${esc(p.dept)}</small></div>
      <div class="st ${late ? 'late' : ''}">${dayBadge(p)}<br>${late ? '已逾期' : '未聯繫'}</div></div>`;
  }).join('') : `<div class="empty">🎉 這週大家都聯繫過了！</div>`;

  // bottom cards (whole list, not filtered)
  const done = people.filter(isContacted);
  $('#statWeek').textContent = done.length;
  $('#weekAvs').innerHTML = done.slice(0, 5).map(p => `<span title="${esc(p.name)}" data-open="${esc(p.id)}">${avatar(p)}</span>`).join('');
  $('#statTotal').textContent = `（共 ${people.length} 人）`;
  $('#statDist').innerHTML = distHTML();

  // filter selects exist twice (scene popover + list toolbar); keep them in sync
  const depts = [...new Set(people.map(p => p.dept).filter(Boolean))].sort();
  setOptions('.f-school', [['', '全部學校'], ...SCHOOLS.map(s => [s, s])], filters.school);
  setOptions('.f-dept', [['', '全部科系'], ...depts.map(d => [d, d])], filters.dept);
  setOptions('.f-lv', [['', '全部敞開程度'], ...LEVELS.map((l, i) => [String(i), l.name])], filters.lv);
  $('#filterBtn').classList.toggle('active', !!(filters.school || filters.dept || filters.lv !== ''));
  $('#deptList').innerHTML = depts.map(d => `<option value="${esc(d)}">`).join('');

  renderList(list);
  renderStats();
  renderDetail();
}
function setOptions(sel, opts, val) {
  document.querySelectorAll(sel).forEach(el => {
    el.innerHTML = opts.map(([v, t]) => `<option value="${esc(v)}">${esc(t)}</option>`).join('');
    el.value = val;
  });
}
function distHTML() {
  const total = people.length || 1;
  return LEVELS.map((l, i) => {
    const n = people.filter(p => p.openness === i).length;
    return `<div class="col"><div class="hd">${gem(i)}${l.name}</div><div class="n">${n} 人（${Math.round((n / total) * 100)}%）</div>
      <div class="bar"><i style="width:${(n / total) * 100}%;background:${l.color}"></i></div></div>`;
  }).join('');
}

function renderList(list) {
  const sort = $('#sortBy').value;
  const sorted = [...list].sort(sort === 'name' ? (a, b) => a.name.localeCompare(b.name, 'zh-Hant') : sort === 'lv' ? (a, b) => b.openness - a.openness : byDays);
  $('#listCount').textContent = `${sorted.length} / ${people.length} 人`;
  $('#peopleGrid').innerHTML = sorted.map(p => `<div class="pcard ${p.id === openId ? 'sel' : ''}" data-open="${esc(p.id)}">${avatar(p)}
    <div class="info"><b>${esc(p.name)}</b> <small>${esc(p.school)}・${esc(p.dept || '—')}${p.grade ? '・' + esc(p.grade) : ''}</small>
      <div class="row">${lvPill(p.openness)} ${dayBadge(p)} <span class="isle ${isContacted(p) ? 'done' : ''}">${isContacted(p) ? '本週已聯繫' : '待聯繫'}</span></div></div></div>`).join('')
    || '<div class="empty">沒有符合的人</div>';
}

function renderStats() {
  const n = people.length, d = people.map(daysSince);
  const over = k => d.filter(x => x === null || x > k).length;
  const tiles = [[`${people.filter(isContacted).length}<small style="font-size:18px;color:var(--muted)"> / ${n}</small>`, '本週已聯繫'],
    [over(7), '超過 7 天沒聯繫'], [over(14), '超過 14 天沒聯繫'], [over(30), '超過 30 天沒聯繫']];
  const schools = [...new Set([...SCHOOLS, ...people.map(p => p.school)])].filter(s => people.some(p => p.school === s));
  const recent = people.flatMap(p => (p.interactions || []).map(l => ({ ...l, p }))).sort((a, b) => b.date.localeCompare(a.date)).slice(0, 8);
  $('#statsView').innerHTML = `
    <div class="stat-tiles">${tiles.map(([v, l]) => `<div class="tile"><div class="v">${v}</div><div class="l">${l}</div></div>`).join('')}</div>
    <div class="card"><h3>${icon('lv4')}敞開程度分佈（共 ${n} 人）</h3><div class="dist">${distHTML()}</div></div>
    <div class="stats-grid">
      <div class="card"><h3>${icon('school')}各校概況</h3><table class="t"><tr><th>學校</th><th>人數</th><th>本週已聯繫</th><th>想讀經以上</th></tr>
        ${schools.map(s => { const g = people.filter(p => p.school === s); return `<tr><td>${esc(s)}</td><td>${g.length}</td><td>${g.filter(isContacted).length}</td><td>${g.filter(p => p.openness >= 3).length}</td></tr>`; }).join('')}</table></div>
      <div class="card"><h3>${icon('calendar')}最近互動</h3><ul class="recent" style="margin:0;padding-left:18px">
        ${recent.map(r => `<li><b data-open="${esc(r.p.id)}" style="cursor:pointer">${esc(r.p.name)}</b>　${fmtDate(r.date)}　${esc(r.summary)}</li>`).join('') || '<li class="empty">還沒有紀錄</li>'}</ul></div>
    </div>`;
}

function countdown(at) {
  const ms = new Date(at) - new Date();
  if (ms < 0) return '已過';
  const d = Math.floor(ms / 86400000), h = Math.floor(ms / 3600000) % 24, m = Math.floor(ms / 60000) % 60;
  return d ? `還有<b>${d}</b>天 <small>${h} 小時</small>` : `還有<b>${h}</b>小時 <small>${m} 分</small>`;
}

function detailHTML(p, inDialog) {
  const c = isContacted(p);
  const logs = [...(p.interactions || [])].sort((a, b) => b.date.localeCompare(a.date));
  const prayer = (p.prayer || '').split('\n').filter(Boolean);
  const a = p.appt;
  return `
    <div class="d-head">${avatar(p)}
      <div><h2>${esc(p.name)}</h2>
        <div class="kv">${icon('cap')}<span class="k">學校：</span>${esc(p.school)}</div>
        <div class="kv">${icon('school')}<span class="k">科系：</span>${esc(p.dept || '—')}</div>
        <div class="kv">${icon('bible')}<span class="k">年級：</span>${esc(p.grade || '—')}</div>
        <div class="kv">${gem(p.openness).replace('<img', '<img class="ic"')}<span class="k">敞開程度：</span>${LEVELS[p.openness].name}</div>
        <div class="kv"><span class="k">上次聯繫：</span>${p.lastContact ? fmtDate(p.lastContact) : '—'} ${dayBadge(p)}</div>
      </div>
      <div class="d-tools"><button class="btn small" data-edit="${esc(p.id)}">✏️ 編輯</button>${inDialog ? '<button class="x" data-close>✕</button>' : ''}</div>
    </div>
    ${p.howMet ? `<div class="kv" style="margin-top:10px"><span class="k">怎麼認識的：</span>${esc(p.howMet)}</div>` : ''}
    <button class="btn ${c ? '' : 'primary'} contact-toggle" data-toggle="${esc(p.id)}">${c ? '✅ 本週已聯繫（點一下取消）' : '🏝️ 標記為本週已聯繫'}</button>

    <div class="sec"><h4>${icon('calendar')}近期互動紀錄 <button class="btn small primary" data-log="${esc(p.id)}">＋ 新增互動紀錄</button></h4>
      ${logs.length ? `<ul class="timeline">${logs.map((l, i) => `<li><span class="date">${fmtDate(l.date)}</span>${esc(l.summary)}
        <button class="x-log" data-dellog="${i}" title="刪除">✕</button>
        <div>${(l.topics || []).map(t => `<span class="tag">${esc(t)}</span>`).join('')}</div></li>`).join('')}</ul>` : '<div class="empty">還沒有紀錄</div>'}
    </div>

    <div class="boxes">
      <div class="box"><h5>${icon('calendar')}下次約見</h5>${a?.at ? `<div class="countdown" data-cd="${esc(a.at)}">${countdown(a.at)}</div>
        <div style="text-align:center">${fmtDate(a.at.slice(0, 10))} ${esc(a.at.slice(11, 16))}</div>${a.place ? `<div>${icon('pin')} ${esc(a.place)}</div>` : ''}${a.passage ? `<div>${icon('bible')} ${esc(a.passage)}</div>` : ''}`
        : '<span class="empty">尚未約定</span>'}</div>
      <div class="box"><h5>${icon('pray')}代禱事項</h5>${prayer.length ? `<ul>${prayer.map(x => `<li>${esc(x)}</li>`).join('')}</ul>` : '<span class="empty">還沒有</span>'}</div>
    </div>
    <div class="box" style="margin-top:10px"><h5>${icon('bible')}讀經進度</h5>${p.reading?.book ? `<b style="font-size:17px">${esc(p.reading.book)}</b> 第 ${esc(p.reading.chapter || '?')} 章` : '<span class="empty">還沒開始</span>'}</div>

    <div class="chat-btns">
      <a class="line ${p.lineId ? '' : 'off'}" href="https://line.me/ti/p/${encodeURIComponent(p.lineId || '')}" target="_blank" rel="noopener">${icon('chat', '')}用 LINE 聊天</a>
      <a class="ig ${p.igId ? '' : 'off'}" href="https://ig.me/m/${encodeURIComponent(p.igId || '')}" target="_blank" rel="noopener">${icon('camera', '')}用 IG 聊天</a>
    </div>
    ${!p.lineId || !p.igId ? '<p class="hint" style="text-align:center">按「編輯」填入 LINE ID / IG 帳號後按鈕就能用</p>' : ''}`;
}

function renderDetail() {
  const p = byId(openId);
  $('#detailPanel').innerHTML = p ? detailHTML(p, false) : '';
  if ($('#detailDlg').open) {
    if (!p) { $('#detailDlg').close(); return; }
    $('#detail').innerHTML = `<div class="dlg-body">${detailHTML(p, true)}</div>`;
  }
}

function openDetail(id) {
  openId = id;
  if (!wide() && !$('#detailDlg').open) $('#detailDlg').showModal();
  render();
}

// ---------- actions ----------
function toggleContacted(id) {
  const p = byId(id);
  if (isContacted(p)) { p.contactedWeek = null; toast(`${p.name} 回到待聯繫島`); }
  else { p.contactedWeek = mondayOf(today()); p.lastContact = today(); toast(`${p.name} 跳到本週已聯繫島 🏝️`); }
  save(); render();
}

function openEdit(id) {
  editingId = id;
  const p = id ? byId(id) : { school: SCHOOLS[0], openness: 0 };
  const f = $('#editForm');
  f.reset();
  $('#editTitle').textContent = id ? '編輯名單' : '新增名單';
  $('#deleteBtn').hidden = !id;
  setOptions('#editForm [name=openness]', LEVELS.map((l, i) => [String(i), `${i + 1}. ${l.name}`]), String(p.openness ?? 0));
  const v = { name: p.name, grade: p.grade, school: p.school, dept: p.dept, howMet: p.howMet, lineId: p.lineId, igId: p.igId, prayer: p.prayer,
    readBook: p.reading?.book, sprite: String(p.id ? spriteOf(p) : 1 + Math.floor(Math.random() * SPRITES)), readChapter: p.reading?.chapter, apptAt: p.appt?.at, apptPlace: p.appt?.place, apptPassage: p.appt?.passage };
  for (const [k, val] of Object.entries(v)) if (val != null) f.elements[k].value = val;
  f.dataset.photo = p.photo || '';
  showPhoto(); showSprite();
  $('#editDlg').showModal();
}
function showSprite() { $('#spritePreview').src = `sprites/${$('#editForm').elements.sprite.value}/stand.webp`; }
function showPhoto() {
  const src = $('#editForm').dataset.photo;
  $('#photoPreview').outerHTML = src ? `<img class="av" id="photoPreview" src="${esc(src)}" alt="">` : `<div class="av" id="photoPreview">📷</div>`;
}

$('#editForm').addEventListener('submit', () => {
  const f = $('#editForm').elements, val = k => f[k].value.trim();
  const data = {
    name: val('name'), grade: val('grade'), school: val('school'), dept: val('dept'), howMet: val('howMet'),
    openness: Number(val('openness')), lineId: val('lineId').replace(/^@/, ''), igId: val('igId').replace(/^@/, ''), prayer: f.prayer.value.trim(),
    reading: val('readBook') ? { book: val('readBook'), chapter: Number(val('readChapter')) || null } : null,
    appt: val('apptAt') ? { at: val('apptAt'), place: val('apptPlace'), passage: val('apptPassage') } : null,
    photo: $('#editForm').dataset.photo,
    sprite: Number(val('sprite')),
  };
  if (editingId) Object.assign(byId(editingId), data);
  else people.push({ id: uid(), lastContact: null, contactedWeek: null, interactions: [], ...data });
  save(); render(); toast('已儲存');
});

$('#deleteBtn').addEventListener('click', () => {
  const p = byId(editingId);
  if (!confirm(`確定要刪除「${p.name}」？這個動作無法復原（除非你有匯出備份）。`)) return;
  people = people.filter(x => x.id !== editingId);
  $('#editDlg').close();
  if (openId === editingId) { openId = null; if ($('#detailDlg').open) $('#detailDlg').close(); }
  save(); render(); toast('已刪除');
});

$('#editForm').elements.sprite.addEventListener('change', showSprite);
$('#photoBtn').addEventListener('click', () => $('#photoFile').click());
$('#photoClear').addEventListener('click', () => { $('#editForm').dataset.photo = ''; showPhoto(); });
$('#photoFile').addEventListener('change', async e => {
  const file = e.target.files[0]; e.target.value = '';
  if (!file) return;
  // shrink to 256px so localStorage (≈5MB) doesn't fill up
  const img = await createImageBitmap(file);
  const s = Math.min(img.width, img.height), c = document.createElement('canvas');
  c.width = c.height = 256;
  c.getContext('2d').drawImage(img, (img.width - s) / 2, (img.height - s) / 2, s, s, 0, 0, 256, 256);
  $('#editForm').dataset.photo = c.toDataURL('image/jpeg', 0.85);
  showPhoto();
});

$('#logForm').addEventListener('submit', () => {
  const f = $('#logForm').elements, p = byId(openId);
  const date = f.date.value;
  p.interactions = [...(p.interactions || []), { date, summary: f.summary.value.trim(), topics: f.topics.value.split(/[,，、]/).map(s => s.trim()).filter(Boolean) }];
  if (!p.lastContact || date > p.lastContact) p.lastContact = date;
  if (mondayOf(date) === mondayOf(today())) p.contactedWeek = mondayOf(today());
  save(); render(); toast('已新增互動紀錄');
});

// ---------- events ----------
document.addEventListener('click', e => {
  const t = e.target.closest('[data-open],[data-close],[data-edit],[data-toggle],[data-log],[data-dellog],[data-clearfilter]');
  if (!e.target.closest('#menu')) $('#menu').classList.remove('open');
  if (!t) return;
  const d = t.dataset;
  if ('clearfilter' in d) { filters = { ...filters, school: '', dept: '', lv: '' }; render(); }
  else if (d.open) openDetail(d.open);
  else if ('close' in d) t.closest('dialog').close();
  else if (d.edit) openEdit(d.edit);
  else if (d.toggle) toggleContacted(d.toggle);
  else if (d.log) { $('#logForm').reset(); $('#logForm').elements.date.value = today(); $('#logDlg').showModal(); }
  else if (d.dellog) {
    const p = byId(openId), logs = [...p.interactions].sort((a, b) => b.date.localeCompare(a.date));
    if (!confirm('刪除這筆互動紀錄？')) return;
    p.interactions = p.interactions.filter(x => x !== logs[Number(d.dellog)]);
    save(); render();
  }
});
$('#addBtn').addEventListener('click', () => openEdit(null));
$('#q').addEventListener('input', e => { filters.q = e.target.value; render(); });
document.addEventListener('change', e => {
  const k = ['school', 'dept', 'lv'].find(k => e.target.classList.contains('f-' + k));
  if (k) { filters[k] = e.target.value; render(); }
});
$('#sortBy').addEventListener('change', render);
$('#filterBtn').addEventListener('click', () => $('#filterPop').classList.toggle('open'));
document.querySelectorAll('.tabs button').forEach(b => b.addEventListener('click', () => {
  document.querySelectorAll('.tabs button').forEach(x => x.classList.toggle('on', x === b));
  $('.main').dataset.tab = b.dataset.tab;
}));
addEventListener('resize', () => { if (wide() && $('#detailDlg').open) $('#detailDlg').close(); render(); });
$('#menuBtn').addEventListener('click', () => $('#menu').classList.toggle('open'));

$('#exportBtn').addEventListener('click', () => {
  const blob = new Blob([JSON.stringify({ app: '我的回訪', version: 1, exportedAt: new Date().toISOString(), people }, null, 2)], { type: 'application/json' });
  const a = Object.assign(document.createElement('a'), { href: URL.createObjectURL(blob), download: `我的回訪備份-${today()}.json` });
  a.click(); URL.revokeObjectURL(a.href);
});
$('#importBtn').addEventListener('click', () => $('#importFile').click());
$('#importFile').addEventListener('change', async e => {
  const file = e.target.files[0]; e.target.value = '';
  if (!file) return;
  try {
    const d = JSON.parse(await file.text());
    const list = Array.isArray(d) ? d : d.people;
    if (!Array.isArray(list) || !list.every(p => p && typeof p.name === 'string' && typeof p.id === 'string')) throw new Error();
    if (!confirm(`匯入 ${list.length} 人，會取代目前的 ${people.length} 人，確定？`)) return;
    people = list.map(p => ({ interactions: [], openness: 0, ...p, openness: Math.min(4, Math.max(0, Number(p.openness) || 0)) }));
    save(); render(); toast('匯入完成');
  } catch { alert('檔案格式不對，請選擇「我的回訪」匯出的 JSON 檔。'); }
});
$('#resetDemoBtn').addEventListener('click', () => {
  if (!confirm('用 5 位範例名單取代目前全部資料？建議先匯出備份。')) return;
  people = seed(); save(); render();
});

// time-of-day preview button
const MODES = [['auto', '🕐 自動'], ['morning', '🌅 早上'], ['day', '☀️ 白天'], ['dusk', '🌇 黃昏'], ['night', '🌙 晚上']];
const PHASE = { morning: '早上', day: '白天', dusk: '黃昏', night: '晚上' };
let modeIdx = 0;
function timeLabel() { $('#timeBtn').textContent = modeIdx ? MODES[modeIdx][1] : `🕐 自動（${PHASE[scene?.getTimePhase?.()] || '…'}）`; }
$('#timeBtn').addEventListener('click', () => { modeIdx = (modeIdx + 1) % MODES.length; scene?.setTimeMode(MODES[modeIdx][0]); timeLabel(); });

// tick: countdowns, Monday reset, day change
setInterval(() => {
  const t = today();
  if (t !== lastDay) { lastDay = t; if (mondayOf(t) !== lastWeek) { lastWeek = mondayOf(t); toast('新的一週！大家都回到待聯繫島了'); } render(); }
  document.querySelectorAll('[data-cd]').forEach(el => { el.innerHTML = countdown(el.dataset.cd); });
  if (!modeIdx) timeLabel();
}, 30000);

$('#bookList').innerHTML = BOOKS.map(b => `<option value="${b}">`).join('');
render();
save();

// load the island scene; the rest of the app works even if it fails
try {
  // reuse app.js's ?v= so one bump in index.html refreshes every script
  const { createScene } = await import('./scene.js' + new URL(import.meta.url).search);
  scene = createScene($('#scene'), { onPersonClick: openDetail });
  render(); timeLabel();
} catch (err) {
  console.error(err);
  $('#sceneFallback').hidden = false;
  $('#sceneFallback').textContent = '島嶼畫面載入失敗，名單與其他功能仍可正常使用。';
}
