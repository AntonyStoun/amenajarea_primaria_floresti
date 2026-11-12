/* ============================================================
   AMENAJAREA FLORESTI — механика страницы
   Резиновые буквы, карточки-перевёртыши, RO/RU, редактор.
   ============================================================ */
(function(){
'use strict';

var C = window.AF_CONTENT;
var LANG = 'ru';
try { LANG = localStorage.getItem('af_lang') || 'ru'; } catch(e){}
if(!C[LANG]) LANG = 'ru';

var reduced = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
var shot = /[?&]shot=1/.test(location.search);
if(shot) document.documentElement.classList.add('shot');
var still = reduced || shot;
var editing = false;

function el(id){ return document.getElementById(id); }

/* ─────────── текст по языку ─────────── */
function applyTexts(){
  Array.prototype.forEach.call(document.querySelectorAll('[data-t]'), function(n){
    var v = C[LANG][n.getAttribute('data-t')];
    if(v != null) n.textContent = v;
  });
  Array.prototype.forEach.call(document.querySelectorAll('[data-nav]'), function(n){
    n.textContent = C[LANG].nav[n.getAttribute('data-nav')] || '';
  });
  document.documentElement.lang = (LANG === 'ro') ? 'ro' : 'ru';
  el('langRo').classList.toggle('on', LANG === 'ro');
  el('langRu').classList.toggle('on', LANG === 'ru');
  renderWorkers();
  updatePhase();
}

function setLang(l){
  LANG = l;
  try { localStorage.setItem('af_lang', l); } catch(e){}
  applyTexts();
}
el('langRo').addEventListener('click', function(){ setLang('ro'); });
el('langRu').addEventListener('click', function(){ setLang('ru'); });

/* ─────────── карточки-перевёртыши ─────────── */
function renderWorkers(){
  var g = el('workersGrid');
  g.innerHTML = '';
  C[LANG].workers.forEach(function(w, i){
    var n = i + 1, num = (n < 10 ? '0' : '') + n;
    var card = document.createElement('div');
    card.className = 'card';
    card.innerHTML =
      '<div class="face front">' +
        '<span class="card-num">' + num + '</span>' +
        '<img src="assets/img/' + w.id + '.png" alt="' + w.name + '" loading="lazy">' +
        '<span class="card-tap">&#8635;</span>' +
      '</div>' +
      '<div class="face back">' +
        '<span class="back-num">' + num + '/23</span>' +
        '<span class="back-name"  data-field="name"  data-id="' + w.id + '">' + w.name  + '</span>' +
        '<span class="back-role"  data-field="role"  data-id="' + w.id + '">' + w.role  + '</span>' +
        '<span class="back-place" data-field="place" data-id="' + w.id + '">' + w.place + '</span>' +
      '</div>';
    card.addEventListener('click', function(ev){
      if(editing && ev.target.isContentEditable) return;
      card.classList.toggle('flipped');
    });
    g.appendChild(card);
    if(editing) editify(card.querySelectorAll('[data-field]'));
  });
}

/* ─────────── РЕЗИНОВЫЕ БУКВЫ ─────────── */
var letters = [];
function buildRubber(){
  var h1 = el('rubberTitle');
  var words = ['AMENAJAREA', 'FLORESTI'];
  words.forEach(function(word){
    var line = document.createElement('span');
    line.className = 'rline';
    word.split('').forEach(function(ch){
      var s = document.createElement('span');
      s.className = 'rl';
      s.textContent = ch;
      line.appendChild(s);
      letters.push({ node:s, x:0, y:0, rot:0, scl:0, vx:0, vy:0, vr:0, vs:0, inRange:false });
    });
    h1.appendChild(line);
  });

  if(still) return;

  var active = [], running = false;
  function activate(L){
    if(active.indexOf(L) === -1) active.push(L);
    if(!running){ running = true; requestAnimationFrame(step); }
  }
  function kick(L, power){
    var p = Math.max(0.12, power);
    L.vx  += (Math.random() - 0.5) * 16 * p;
    L.vy  += (Math.random() - 0.5) * 12 * p - 3.2 * p;
    L.vr  += (Math.random() - 0.5) * 14 * p;
    L.vs  += (Math.random() - 0.5) * 0.26 * p;
    activate(L);
  }
  function waveFrom(idx, power){
    kick(letters[idx], power);
    for(var d = 1; d <= 3; d++){
      if(letters[idx - d]) kick(letters[idx - d], power * 0.62 / d);
      if(letters[idx + d]) kick(letters[idx + d], power * 0.62 / d);
    }
  }
  function step(){
    var k = 0.1, c = 0.22;
    for(var i = active.length - 1; i >= 0; i--){
      var L = active[i];
      L.vx += -k * L.x - c * L.vx;  L.x += L.vx;
      L.vy += -k * L.y - c * L.vy;  L.y += L.vy;
      L.vr += -k * L.rot - c * L.vr; L.rot += L.vr;
      L.vs += -k * L.scl - c * L.vs; L.scl += L.vs;
      var calm = Math.abs(L.x) + Math.abs(L.y) + Math.abs(L.rot) +
                 Math.abs(L.vx) + Math.abs(L.vy) + Math.abs(L.vr) + Math.abs(L.vs) + Math.abs(L.scl);
      if(calm < 0.06){
        L.x = L.y = L.rot = L.scl = L.vx = L.vy = L.vr = L.vs = 0;
        L.node.style.transform = '';
        active.splice(i, 1);
      } else {
        L.node.style.transform = 'translate(' + L.x.toFixed(1) + 'px,' + L.y.toFixed(1) + 'px) ' +
          'rotate(' + L.rot.toFixed(1) + 'deg) scale(' + (1 + L.scl).toFixed(3) + ')';
      }
    }
    if(active.length){ requestAnimationFrame(step); } else { running = false; }
  }

  letters.forEach(function(L, idx){
    L.node.addEventListener('pointerenter', function(){ waveFrom(idx, 1); });
  });

  /* мягкое притяжение: буква дёргается, когда мышь заходит к ней близко */
  var hero = el('hero');
  hero.addEventListener('pointermove', function(ev){
    var mx = ev.clientX, my = ev.clientY;
    letters.forEach(function(L, idx){
      var r = L.node.getBoundingClientRect();
      var cx = r.left + r.width / 2, cy = r.top + r.height / 2;
      var d = Math.hypot(mx - cx, my - cy);
      var R = Math.max(90, r.width * 1.2);
      if(d < R){
        if(!L.inRange){
          L.inRange = true;
          var p = (1 - d / R) * 0.7;
          L.vx += (cx - mx) / Math.max(d, 1) * 26 * p;
          L.vy += (cy - my) / Math.max(d, 1) * 22 * p;
          waveFrom(idx, p);
        }
      } else {
        L.inRange = false;
      }
    });
  });

  /* лёгкое дыхание в покое: буква иногда сама вздрагивает */
  setInterval(function(){
    if(document.hidden || editing || active.length) return;
    var L = letters[Math.floor(Math.random() * letters.length)];
    L.vs += (Math.random() - 0.5) * 0.06;
    L.vr += (Math.random() - 0.5) * 1.6;
    activate(L);
  }, 4200);
}

/* ─────────── наклон стеклянных окон ─────────── */
function tiltify(){
  if(still) return;
  Array.prototype.forEach.call(document.querySelectorAll('.tilt'), function(p){
    p.addEventListener('pointermove', function(ev){
      if(editing) return;
      var r = p.getBoundingClientRect();
      var px = (ev.clientX - r.left) / r.width  - 0.5;
      var py = (ev.clientY - r.top)  / r.height - 0.5;
      p.style.transform = 'perspective(1200px) rotateY(' + (px * 5).toFixed(2) + 'deg) rotateX(' + (-py * 4).toFixed(2) + 'deg)';
    });
    p.addEventListener('pointerleave', function(){ p.style.transform = ''; });
  });
}

/* ─────────── жизнь города: фазы по времени Флорешть ─────────── */
var fakeHour = null; /* только для тестовых снимков: ?hour=NN */
function phaseOf(h){
  if(h >= 4  && h < 7)  return { name:'shift',  t:'nowShift'   }; /* 04:00–06:59 — выходят затемно */
  if(h >= 7  && h < 16) return { name:'day',    t:'nowDay'     }; /* 07:00–15:59 — смена идёт */
  if(h >= 16 && h < 22) return { name:'clean',  t:'nowEvening' }; /* 16:00–21:59 — улица чиста */
  return               { name:'sleep',  t:'nowSleep'   };          /* 22:00–03:59 — город спит */
}
function hourInFalesti(){
  if(fakeHour !== null) return fakeHour;
  try {
    var s = new Intl.DateTimeFormat('en-GB', {
      timeZone: 'Europe/Chisinau', hour: '2-digit', hourCycle: 'h23'
    }).format(new Date());
    var h = parseInt(s, 10);
    if(!isNaN(h)) return h;
  } catch(e){}
  return new Date().getHours();
}
function updatePhase(){
  var p = phaseOf(hourInFalesti());
  document.body.dataset.phase = p.name;
  var pt = el('phaseText');
  if(pt){
    pt.setAttribute('data-t', p.t);
    /* в режиме редактирования строку не трогаем — правит человек */
    if(!document.body.classList.contains('editing')){
      var v = C[LANG][p.t];
      if(v != null) pt.textContent = v;
    }
  }
}

/* ─────────── часы во Флорешть ─────────── */
function tickClock(){
  var s;
  try {
    s = new Intl.DateTimeFormat('ru-RU', {
      timeZone: 'Europe/Chisinau', hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23'
    }).format(new Date());
  } catch(e){
    var d = new Date();
    s = ('0' + d.getHours()).slice(-2) + ':' + ('0' + d.getMinutes()).slice(-2) + ':' + ('0' + d.getSeconds()).slice(-2);
  }
  el('clock').textContent = s;
  updatePhase();
}

/* ─────────── появление секций + подсветка навигации ─────────── */
function observers(){
  var io = new IntersectionObserver(function(es){
    es.forEach(function(e){ if(e.isIntersecting) e.target.classList.add('in'); });
  }, { threshold: 0.08 });
  Array.prototype.forEach.call(document.querySelectorAll('.sec'), function(s){ io.observe(s); });

  var spy = new IntersectionObserver(function(es){
    es.forEach(function(e){
      if(e.isIntersecting){
        Array.prototype.forEach.call(document.querySelectorAll('.nav-btn'), function(b){
          b.classList.toggle('active', b.getAttribute('href') === '#' + e.target.id);
        });
      }
    });
  }, { rootMargin: '-38% 0px -52% 0px' });
  Array.prototype.forEach.call(document.querySelectorAll('.sec'), function(s){ spy.observe(s); });
}

/* ─────────── видео: ищет само video.mp4 / .webm / .mov в папке media/ ─────────── */
function tryVideo(){
  var sec = el('video'), v = el('theVideo'), nav = el('navVideo');
  nav.style.display = 'none';
  var candidates = ['media/video.mp4', 'media/video.webm', 'media/video.mov'];
  var i = 0;
  v.addEventListener('canplay', function(){
    sec.hidden = false;
    nav.style.display = '';
  });
  v.addEventListener('error', function(){
    i++;
    if(i < candidates.length){ v.src = candidates[i]; v.load(); }
    /* ни одного видео нет — секция спит */
  });
  v.src = candidates[0];
  v.load();
}

/* ─────────── РЕДАКТОР (Ctrl+E) ─────────── */
var dirty = false;
function editify(nodes){
  Array.prototype.forEach.call(nodes, function(n){
    n.setAttribute('contenteditable', 'true');
    if(n._afBound) return;
    n._afBound = true;
    n.addEventListener('input', function(){
      dirty = true;
      if(n.hasAttribute('data-t')){
        C[LANG][n.getAttribute('data-t')] = n.innerText;
      } else if(n.hasAttribute('data-nav')){
        C[LANG].nav[n.getAttribute('data-nav')] = n.innerText;
      } else if(n.hasAttribute('data-field')){
        var id = n.getAttribute('data-id'), f = n.getAttribute('data-field');
        var list = C[LANG].workers;
        for(var i = 0; i < list.length; i++){
          if(list[i].id === id){ list[i][f] = n.innerText; break; }
        }
      }
    });
  });
}
function enterEdit(){
  editing = true;
  document.body.classList.add('editing');
  el('editbar').hidden = false;
  editify(document.querySelectorAll('[data-t], [data-nav], [data-field]'));
}
function exitEdit(){
  if(dirty && !confirm('Выйти из редактора без публикации? Несохранённые правки исчезнут.')) return;
  location.reload();
}
function publish(){
  var head = '/* ============================================================\n' +
    '   AMENAJAREA FLORESTI — двуязычный контент (RO + RU)\n' +
    '   Сохранено через редактор страницы ' + new Date().toISOString().slice(0, 16).replace('T', ' ') + '\n' +
    '   Положить этот файл в папку content/ на GitHub (заменить старый).\n' +
    '   ============================================================ */\n';
  var body = 'window.AF_CONTENT = ' + JSON.stringify(C, null, 2) + ';\n';
  var blob = new Blob([head + body], { type: 'text/javascript;charset=utf-8' });
  var a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'texts.js';
  document.body.appendChild(a);
  a.click();
  setTimeout(function(){ URL.revokeObjectURL(a.href); a.remove(); }, 4000);
  dirty = false;
  document.querySelector('.editbar-tip').textContent =
    'texts.js скачан — перетащите его в папку content/ на GitHub и нажмите Commit changes.';
}
el('btnPublish').addEventListener('click', publish);
el('btnExit').addEventListener('click', exitEdit);

document.addEventListener('keydown', function(ev){
  if((ev.ctrlKey || ev.metaKey) && (ev.key === 'e' || ev.key === 'E' || ev.key === 'у' || ev.key === 'У')){
    ev.preventDefault();
    if(editing){ exitEdit(); } else { enterEdit(); }
  }
});

/* ─────────── старт ─────────── */
/* тестовый режим снимков: ?shot=1&sec=hero или sec=mesaj,contact */
if(shot){
  var mL = /[?&]lang=(ro|ru)/.exec(location.search);
  if(mL){ LANG = mL[1]; }
  var mSec = /[?&]sec=([a-z_,]+)/.exec(location.search);
  var mHour = /[?&]hour=(\d{1,2})/.exec(location.search);
  if(mHour){ var hh = parseInt(mHour[1], 10); if(hh >= 0 && hh <= 23) fakeHour = hh; }
  if(mSec){
    var want = mSec[1].split(',');
    if(want.indexOf('hero') === -1){ el('hero').style.display = 'none'; }
    Array.prototype.forEach.call(document.querySelectorAll('.sec'), function(s){
      if(want.indexOf(s.id) === -1) s.style.display = 'none';
    });
  }
}
applyTexts();
if(shot && /[?&]flipall=1/.test(location.search)){
  Array.prototype.forEach.call(document.querySelectorAll('.card'), function(c){ c.classList.add('flipped'); });
}
buildRubber();
tiltify();
tickClock();
setInterval(tickClock, 1000);
observers();
tryVideo();

})();
