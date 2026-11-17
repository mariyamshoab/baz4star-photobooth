const { createClient } = window.supabase;

/* ------------------------------------------------------------------ setup */
const SB_URL = 'https://kikhhnanuwzocwcpzutr.supabase.co';
const SB_KEY = 'sb_publishable_Dck6FXjKlwXw7x9AekE3gg_SBKDD-eW';
const BUCKET = 'baz-photobooth';
const sb = createClient(SB_URL, SB_KEY, { auth: { persistSession: false } });
const pub = (p) => sb.storage.from(BUCKET).getPublicUrl(p).data.publicUrl;

const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const el = (tag, props = {}, kids = []) => {
  const n = document.createElement(tag);
  for (const [k, v] of Object.entries(props)) {
    if (k === 'class') n.className = v;
    else if (k === 'text') n.textContent = v;
    else if (k === 'style') n.style.cssText = v;
    else if (k.startsWith('on')) n.addEventListener(k.slice(2), v);
    else if (v !== false && v != null) n.setAttribute(k, v === true ? '' : v);
  }
  for (const c of [].concat(kids)) if (c != null) n.append(c);
  return n;
};
const uuid = () => (crypto.randomUUID ? crypto.randomUUID() : 'x' + Date.now() + Math.random().toString(16).slice(2));
const hash = (s) => { let h = 0; for (const c of String(s)) h = (h * 31 + c.charCodeAt(0)) | 0; return Math.abs(h); };
const wideMQ = matchMedia('(max-width:760px),(max-aspect-ratio:4/5)');

function toast(msg, ms = 2600) {
  const t = $('#toast'); t.textContent = msg; t.hidden = false;
  clearTimeout(toast._t); toast._t = setTimeout(() => (t.hidden = true), ms);
}

/* ------------------------------------------------------------------ modal */
const modal = {
  open(kids) {
    const m = $('#modal'), box = $('.box', m);
    box.replaceChildren(el('button', { class: 'btn close', 'aria-label': 'Close', text: '✕', onclick: () => modal.close() }), ...kids);
    m.hidden = false; document.body.style.overflow = 'hidden';
    setTimeout(() => $('input,textarea,button:not(.close)', box)?.focus(), 30);
  },
  close() {
    const m = $('#modal'); m.hidden = true; document.body.style.overflow = '';
    $$('video', m).forEach((v) => v.pause());
    if (modal._onclose) { const f = modal._onclose; modal._onclose = null; f(); }
  },
};
$('#modal').addEventListener('click', (e) => { if (e.target.id === 'modal') modal.close(); });
addEventListener('keydown', (e) => { if (e.key === 'Escape' && !$('#modal').hidden) modal.close(); });

function confirmBox(title, yes = 'yes', no = 'never mind') {
  return new Promise((res) => {
    modal._onclose = () => res(false);
    modal.open([el('div', { class: 'form' }, [
      el('h2', { text: title, style: 'font-weight:400;font-size:2rem;margin:0' }),
      el('div', { class: 'row-btns' }, [
        el('button', { class: 'btn sh-pink', text: yes, onclick: () => { modal._onclose = null; modal.close(); res(true); } }),
        el('button', { class: 'btn', text: no, onclick: () => modal.close() }),
      ]),
    ])]);
  });
}

/* ------------------------------------------------------------------ sound */
let AC = null;
let soundOn = localStorage.getItem('bazSound') !== 'off';
function ac() {
  if (!AC) AC = new (window.AudioContext || window.webkitAudioContext)();
  if (AC.state === 'suspended') AC.resume();
  return AC;
}
function tone(freq, start, dur, type = 'triangle', vol = 0.18) {
  const a = ac(), o = a.createOscillator(), g = a.createGain();
  o.type = type; o.frequency.value = freq;
  g.gain.setValueAtTime(0.0001, start);
  g.gain.linearRampToValueAtTime(vol, start + 0.02);
  g.gain.exponentialRampToValueAtTime(0.0001, start + dur);
  o.connect(g).connect(a.destination); o.start(start); o.stop(start + dur + 0.05);
}
function noiseSrc(sec) {
  const a = ac(), b = a.createBuffer(1, Math.ceil(a.sampleRate * sec), a.sampleRate), d = b.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  const s = a.createBufferSource(); s.buffer = b; return s;
}
const sfx = {
  beep() { if (!soundOn) return; const a = ac(); tone(880, a.currentTime, 0.14, 'sine', 0.14); },
  shutter() {
    if (!soundOn) return;
    const a = ac(), t = a.currentTime, n = noiseSrc(0.14), f = a.createBiquadFilter(), g = a.createGain();
    f.type = 'highpass'; f.frequency.value = 1800;
    g.gain.setValueAtTime(0.55, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.12);
    n.connect(f).connect(g).connect(a.destination); n.start(t);
    tone(2600, t, 0.03, 'square', 0.07); tone(1500, t + 0.08, 0.04, 'square', 0.06);
  },
  whirr(sec = 4.6) {
    if (!soundOn) return;
    const a = ac(), t = a.currentTime, n = noiseSrc(sec), f = a.createBiquadFilter(), g = a.createGain();
    f.type = 'bandpass'; f.frequency.value = 900; f.Q.value = 1.3; g.gain.value = 0;
    [[0, 0.6], [1.0, 0.9], [2.2, 1.5], [3.9, 0.6]].forEach(([s, d]) => {
      g.gain.setValueAtTime(0, t + s); g.gain.linearRampToValueAtTime(0.22, t + s + 0.06);
      g.gain.setValueAtTime(0.22, t + s + d - 0.06); g.gain.linearRampToValueAtTime(0, t + s + d);
    });
    const m = a.createOscillator(), mg = a.createGain(); m.frequency.value = 36; mg.gain.value = 260;
    m.connect(mg).connect(f.frequency); m.start(t); m.stop(t + sec);
    n.connect(f).connect(g).connect(a.destination); n.start(t);
    tone(1200, t + sec - 0.1, 0.08, 'square', 0.05);
  },
  clunk() { if (!soundOn) return; const a = ac(); tone(140, a.currentTime, 0.18, 'sine', 0.3); tone(90, a.currentTime + 0.05, 0.2, 'sine', 0.25); },
  song() {
    const a = ac(), t0 = a.currentTime + 0.05, beat = 0.42;
    const N = { G4: 392, A4: 440, B4: 493.88, C5: 523.25, D5: 587.33, E5: 659.25, F5: 698.46, G5: 783.99, C4: 261.63, G3: 196, F4: 349.23, D4: 293.66 };
    const mel = [['G4', .75], ['G4', .25], ['A4', 1], ['G4', 1], ['C5', 1], ['B4', 2],
      ['G4', .75], ['G4', .25], ['A4', 1], ['G4', 1], ['D5', 1], ['C5', 2],
      ['G4', .75], ['G4', .25], ['G5', 1], ['E5', 1], ['C5', 1], ['B4', 1], ['A4', 2],
      ['F5', .75], ['F5', .25], ['E5', 1], ['C5', 1], ['D5', 1], ['C5', 3]];
    let t = t0;
    mel.forEach(([n, b]) => { tone(N[n], t, b * beat * 0.95, 'triangle', 0.2); tone(N[n] * 2, t, b * beat * 0.6, 'sine', 0.04); t += b * beat; });
    const bass = [['C4', 3], ['G3', 3], ['G3', 3], ['C4', 3], ['C4', 3], ['F4', 3], ['C4', 2], ['G3', 1], ['C4', 3]];
    let tb = t0 + beat; bass.forEach(([n, b]) => { tone(N[n] / 2, tb, b * beat * 0.9, 'sine', 0.09); tb += b * beat; });
    return t - t0;
  },
};
function syncSound() { $$('.sndT').forEach((b) => { b.textContent = soundOn ? '♪ on' : '♪ off'; b.setAttribute('aria-pressed', soundOn); }); }
$$('.sndT').forEach((b) => b.addEventListener('click', () => { soundOn = !soundOn; localStorage.setItem('bazSound', soundOn ? 'on' : 'off'); syncSound(); if (soundOn) sfx.beep(); }));
syncSound();
if (navigator.audioSession) { try { navigator.audioSession.type = 'playback'; } catch (e) {} }
const songAudio = new Audio('assets/happy-birthday.mp3'); songAudio.preload = 'auto';
const paintSong = () => $$('.songBtn').forEach((x) => (x.textContent = songAudio.paused ? '♪ play her song' : '■ stop the song'));
songAudio.addEventListener('ended', paintSong); songAudio.addEventListener('pause', paintSong); songAudio.addEventListener('play', paintSong);
$$('.songBtn').forEach((b) => b.addEventListener('click', () => {
  if (songAudio.paused) { songAudio.currentTime = 0; songAudio.play().catch(() => toast('tap again to play the song')); }
  else songAudio.pause();
}));

/* ------------------------------------------------------------------ assets */
const imgCache = {};
function loadImg(src) {
  if (!imgCache[src]) imgCache[src] = new Promise((res, rej) => { const i = new Image(); i.crossOrigin = 'anonymous'; i.onload = () => res(i); i.onerror = rej; i.src = src; });
  return imgCache[src];
}
const STICKERS = [
  ['cookie', 'Cookie'], ['strawberry', 'Strawberry'], ['hat', 'Party hat'], ['cake', 'Cake'], ['star', 'Smiley star'], ['heart', 'Heart'],
  ['bow', 'Bow'], ['bee', 'Bee'], ['butterfly', 'Butterfly'], ['cat', 'Party cat'], ['balloon', 'Balloon'],
];
const stSrc = (k) => `assets/st/${k}.png`;
const fontReady = document.fonts ? document.fonts.load('48px "Gochi Hand"').catch(() => {}) : Promise.resolve();

/* ------------------------------------------------------------------ data */
const data = {
  async entries() {
    const { data: rows, error } = await sb.from('baz_entries').select('*').order('created_at', { ascending: false }).limit(400);
    if (error) throw error; return rows || [];
  },
  async mode() { const { data: m } = await sb.rpc('baz_get_mode'); return m === 'pick' ? 'pick' : 'auto'; },
  featured(rows, mode) {
    const strips = rows.filter((r) => r.kind === 'strip');
    return mode === 'pick' ? strips.filter((r) => r.featured).slice(0, 4) : strips.slice(0, 4);
  },
  async upload(path, blob, type) {
    const { error } = await sb.storage.from(BUCKET).upload(path, blob, { contentType: type, upsert: false });
    if (error) throw error;
  },
  async add(row) { const { error } = await sb.from('baz_entries').insert(row); if (error) throw error; },
};
const owner = {
  get pass() { return sessionStorage.getItem('bazPass'); },
  async ask() {
    if (this.pass) return true;
    return new Promise((res) => {
      modal._onclose = () => res(false);
      const inp = el('input', { type: 'password', placeholder: 'owner passcode', autocomplete: 'off', style: 'font-size:1.5rem;padding:.3em .6em;border:2.5px solid #2B2723;background:#FFFDF7;border-radius:12px' });
      const err = el('div', { class: 'muted', style: 'min-height:1.4em;font-size:1.2rem' });
      const go = async () => {
        const { data: ok } = await sb.rpc('baz_check_pass', { pass: inp.value });
        if (ok) { sessionStorage.setItem('bazPass', inp.value); modal._onclose = null; modal.close(); res(true); }
        else { err.textContent = 'hmm, that’s not it'; inp.select(); }
      };
      inp.addEventListener('keydown', (e) => { if (e.key === 'Enter') go(); });
      modal.open([el('div', { class: 'form' }, [
        el('h2', { text: 'just for the organiser ♡', style: 'font-weight:400;font-size:2rem;margin:0' }),
        el('p', { text: 'picking featured strips and removing strips needs the owner passcode.', style: 'font-size:1.25rem;margin:0' }),
        inp, err,
        el('div', { class: 'row-btns' }, [el('button', { class: 'btn sh-pink', text: 'unlock', onclick: go })]),
      ])]);
    });
  },
};

/* ------------------------------------------------------------------ strip rendering */
const FRAMES = [
  ['plain', 'plain white'], ['dots', 'pink dots'], ['gingham', 'olive gingham'], ['butter', 'butter yellow'], ['film', 'old film'],
];
const S = 1.5, W = 600 * S, PAD = 36 * S, FW = 528 * S, FH = 396 * S, GAP = 22 * S, CAP = 90 * S;
const H = PAD + 4 * FH + 3 * GAP + CAP;
function paintFrameBg(ctx, style) {
  if (style === 'film') { ctx.fillStyle = '#2B2723'; ctx.fillRect(0, 0, W, H); ctx.fillStyle = '#FBF6EC'; for (let y = 14 * S; y < H; y += 34 * S) { ctx.fillRect(8 * S, y, 14 * S, 18 * S); ctx.fillRect(W - 22 * S, y, 14 * S, 18 * S); } return; }
  ctx.fillStyle = style === 'butter' ? '#F8E08A' : '#FFFFFF'; ctx.fillRect(0, 0, W, H);
  if (style === 'dots') { ctx.fillStyle = '#F07FA3'; for (let y = 9 * S; y < H; y += 18 * S) for (let x = ((y / (18 * S)) % 2 ? 9 : 18) * S; x < W; x += 18 * S) { ctx.beginPath(); ctx.arc(x, y, 3.2 * S, 0, 7); ctx.fill(); } }
  if (style === 'gingham') { ctx.fillStyle = 'rgba(169,181,106,.42)'; for (let x = 0; x < W; x += 20 * S) ctx.fillRect(x, 0, 10 * S, H); for (let y = 0; y < H; y += 20 * S) ctx.fillRect(0, y, W, 10 * S); }
}
async function renderStrip(frames, style) {
  await fontReady;
  const c = document.createElement('canvas'); c.width = W; c.height = H; const ctx = c.getContext('2d');
  paintFrameBg(ctx, style);
  for (let i = 0; i < 4; i++) {
    const y = PAD + i * (FH + GAP);
    if (frames && frames[i]) ctx.drawImage(frames[i], PAD, y, FW, FH);
    else { ctx.fillStyle = '#E9E2D6'; ctx.fillRect(PAD, y, FW, FH); }
    ctx.strokeStyle = 'rgba(43,39,35,.55)'; ctx.lineWidth = 2 * S; ctx.strokeRect(PAD, y, FW, FH);
  }
  ctx.fillStyle = style === 'film' ? '#FBF6EC' : '#2B2723';
  ctx.font = `${50 * S}px "Gochi Hand", cursive`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText('baz ♡ 2026', W / 2, H - CAP / 2 - 4 * S);
  return c;
}
function grab(video, colour) {
  const vw = video.videoWidth, vh = video.videoHeight, want = 4 / 3;
  let sw = vw, sh = vh; if (vw / vh > want) sw = vh * want; else sh = vw / want;
  const c = document.createElement('canvas'); c.width = FW; c.height = FH; const ctx = c.getContext('2d');
  ctx.translate(FW, 0); ctx.scale(-1, 1);
  ctx.drawImage(video, (vw - sw) / 2, (vh - sh) / 2, sw, sh, 0, 0, FW, FH);
  if (!colour) toBW(c);
  return c;
}
function grabImage(img, colour) {
  const vw = img.naturalWidth, vh = img.naturalHeight, want = 4 / 3;
  let sw = vw, sh = vh; if (vw / vh > want) sw = vh * want; else sh = vw / want;
  const c = document.createElement('canvas'); c.width = FW; c.height = FH;
  c.getContext('2d').drawImage(img, (vw - sw) / 2, (vh - sh) / 2, sw, sh, 0, 0, FW, FH);
  if (!colour) toBW(c);
  return c;
}
function toBW(c) {
  const ctx = c.getContext('2d'), d = ctx.getImageData(0, 0, c.width, c.height), p = d.data;
  for (let i = 0; i < p.length; i += 4) { let g = 0.3 * p[i] + 0.59 * p[i + 1] + 0.11 * p[i + 2]; g = Math.max(0, Math.min(255, (g - 128) * 1.12 + 132)); p[i] = p[i + 1] = p[i + 2] = g; }
  ctx.putImageData(d, 0, 0);
}
const canvasBlob = (c, type = 'image/jpeg', q = 0.9) => new Promise((r) => c.toBlob(r, type, q));
function downloadBlob(blob, name) {
  const u = URL.createObjectURL(blob); const a = el('a', { href: u, download: name }); document.body.append(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(u), 4000);
}

/* ------------------------------------------------------------------ app state */
const state = { strip: null, stripStyle: 'dots' };

/* ------------------------------------------------------------------ home */
const home = {
  async enter() {
    const svg = $('#homeArt');
    const setVB = () => svg.setAttribute('viewBox', wideMQ.matches ? '425 30 578 790' : '0 0 1440 900');
    setVB(); if (!home._mq) { home._mq = true; wideMQ.addEventListener('change', setVB); }
    const g = $('#featured'); const NS = 'http://www.w3.org/2000/svg';
    try {
      const [rows, mode] = await Promise.all([data.entries(), data.mode()]);
      const f = data.featured(rows, mode);
      g.replaceChildren();
      if (!f.length) {
        const t = document.createElementNS(NS, 'text'); t.setAttribute('x', 541); t.setAttribute('y', 312); t.setAttribute('text-anchor', 'middle');
        t.setAttribute('font-family', 'Gochi Hand, cursive'); t.setAttribute('font-size', '20'); t.setAttribute('fill', '#6B625A'); t.textContent = 'be the first ♡'; g.append(t);
      }
      f.forEach((r, i) => {
        const im = document.createElementNS(NS, 'image'); const x = 481 + i * 31, w = 28, h = w * H / W;
        im.setAttribute('href', pub(r.media_path)); im.setAttribute('x', x); im.setAttribute('y', 246 + (i % 2) * 8); im.setAttribute('width', w); im.setAttribute('height', h);
        im.setAttribute('transform', `rotate(${(hash(r.id) % 7) - 3} ${x + w / 2} ${300})`); g.append(im);
      });
    } catch (e) { console.warn(e); }
  },
};

/* ------------------------------------------------------------------ booth */
const booth = {
  mode: 'photo', stage: 'setup', frameIdx: 1, colour: false, stream: null, frames: [], raf: 0,
  vs: new Set(['confetti', 'hat', 'cookie']), rec: null, chunks: [], vblob: null, vthumb: null,
  async enter(mode) {
    this.mode = mode; this.reset(); this.paintMode();
    await this.startCam();
  },
  leave() { this.stage = 'off'; this.stopCam(); cancelAnimationFrame(this.raf); if (this.rec && this.rec.state !== 'inactive') this.rec.stop(); },
  async startCam() {
    this.stopCam();
    const msg = $('#msg'); msg.hidden = true;
    if (!navigator.mediaDevices?.getUserMedia) { this.camError('this browser can’t use the camera'); return; }
    try {
      this.stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user', width: { ideal: 1280 }, height: { ideal: 960 } }, audio: this.mode === 'video' });
      const v = $('#cam'); v.srcObject = this.stream; await v.play().catch(() => {});
      if (this.mode === 'video') this.loopVideo();
    } catch (e) { console.warn(e); this.camError(this.mode === 'video' ? 'camera or mic is blocked — allow them in your browser, then try again' : 'camera is blocked — allow it in your browser, then try again'); }
  },
  stopCam() { if (this.stream) { this.stream.getTracks().forEach((t) => t.stop()); this.stream = null; } },
  camError(text) {
    const msg = $('#msg'); msg.hidden = false;
    const kids = [el('span', { text: 'oops! ' + text }), el('button', { class: 'btn', text: 'try again', onclick: () => this.startCam() })];
    if (this.mode === 'photo') {
      const fi = el('input', { type: 'file', accept: 'image/*', multiple: true, hidden: true, onchange: (e) => this.fromFiles(e.target.files) });
      kids.push(el('label', { class: 'btn', text: 'or use 4 photos from your device' }, [fi]));
    }
    msg.replaceChildren(...kids);
  },
  async fromFiles(files) {
    const list = [...files].slice(0, 4); if (!list.length) return;
    const imgs = await Promise.all(list.map((f) => loadImg(URL.createObjectURL(f))));
    while (imgs.length < 4) imgs.push(imgs[imgs.length - 1]);
    this.frames = imgs.map((i) => grabImage(i, this.colour));
    $('#msg').hidden = true; this.print();
  },
  reset() {
    this.stage = 'setup'; this.frames = []; this.vblob = null; this.vthumb = null;
    const slot = $('#slot'); slot.classList.remove('run'); $('#stripImg').removeAttribute('src');
    $('#hint').hidden = false; $('#acts').replaceChildren(); $('#tray').hidden = true;
    $('#count').textContent = ''; $('#pill').hidden = true; $('#go').disabled = false;
    $('#playback').hidden = true; $('#playback').removeAttribute('src');
    this.paintMode();
  },
  paintMode() {
    const v = this.mode === 'video';
    $('#mStrip').classList.toggle('on', !v); $('#mVideo').classList.toggle('on', v);
    $('#sw').hidden = v; $('#chips').hidden = !v; $('#framebar').hidden = v || this.stage !== 'setup';
    $('#cam').hidden = v; $('#vcan').hidden = !v || this.stage === 'recorded';
    $('#cam').classList.toggle('bw', !this.colour && !v);
    $('#golbl').textContent = v ? (this.stage === 'recording' ? 'stop' : this.stage === 'recorded' ? 'done!' : 'record') : ({ setup: 'start', shooting: 'smile!', printing: 'printing…', printed: 'done!' }[this.stage] || 'start');
    $('#go').classList.toggle('rec', v); $('#go').setAttribute('aria-label', v ? 'Record a video note' : 'Start taking photos');
    $('#slotlbl').textContent = v ? 'your tape' : 'your strip';
    $('#hint').textContent = v ? '(your tape drops in the tray when you’re done)' : '(empty for now — smile first!)';
    $('#colourT').setAttribute('aria-checked', this.colour);
    $('#frameName').textContent = FRAMES[this.frameIdx][1];
    this.paintChips(); this.paintMini();
  },
  async paintMini() {
    const c = await renderStrip(null, FRAMES[this.frameIdx][0]); $('#mini').src = c.toDataURL('image/jpeg', 0.7);
  },
  paintChips() {
    const L = [['confetti', 'confetti'], ['hat', 'party hat'], ['cookie', 'cookie'], ['strawberry', 'strawberry'], ['candle', 'candle'], ['balloons', 'balloons']];
    $('#chips').replaceChildren(...L.map(([k, t]) => el('button', { class: 'btn' + (this.vs.has(k) ? ' on' : ''), 'aria-pressed': this.vs.has(k), text: (this.vs.has(k) ? '✓ ' : '') + t, onclick: () => { this.vs.has(k) ? this.vs.delete(k) : this.vs.add(k); this.paintChips(); } })));
  },
  async go() {
    ac();
    if (this.mode === 'video') return this.stage === 'recording' ? this.stopRec() : this.startRec();
    if (this.stage !== 'setup' || !this.stream) return;
    this.stage = 'shooting'; this.paintMode(); $('#go').disabled = true; $('#framebar').hidden = true;
    const v = $('#cam'), pill = $('#pill'), count = $('#count');
    this.frames = []; pill.hidden = false;
    for (let i = 0; i < 4; i++) {
      if (this.stage !== 'shooting') return;
      pill.replaceChildren(el('span', { text: `photo ${i + 1} of 4` }), ...[0, 1, 2, 3].map((k) => el('span', { class: 'dot' + (k < i ? ' done' : k === i ? ' now' : '') })));
      for (const n of [3, 2, 1]) { if (this.stage !== 'shooting') return; count.textContent = n; sfx.beep(); await sleep(800); }
      count.textContent = ''; if (this.stage !== 'shooting' || !v.videoWidth) return; sfx.shutter();
      const f = $('#flash'); f.classList.remove('go'); void f.offsetWidth; f.classList.add('go');
      this.frames.push(grab(v, this.colour));
      await sleep(i < 3 ? 650 : 300);
    }
    if (this.stage !== 'shooting') return;
    pill.hidden = true; this.print();
  },
  async print() {
    this.stage = 'printing'; this.paintMode(); $('#go').disabled = true; $('#framebar').hidden = true;
    const msg = $('#msg'); msg.hidden = false;
    msg.replaceChildren(el('span', { text: 'printing your strip…', style: 'font-size:1.5em' }), el('span', { text: '♡ ♡ ♡', style: 'color:#F07FA3;letter-spacing:.3em' }));
    const c = await renderStrip(this.frames, FRAMES[this.frameIdx][0]);
    state.strip = c; state.stripStyle = FRAMES[this.frameIdx][0]; doodle.fresh = true;
    const img = $('#stripImg'); img.src = c.toDataURL('image/jpeg', 0.85);
    await new Promise((r) => (img.complete ? r() : (img.onload = r)));
    $('#hint').hidden = true;
    const slot = $('#slot'); slot.classList.remove('run'); void slot.offsetWidth; slot.classList.add('run');
    sfx.whirr(4.6); await sleep(4700); sfx.clunk();
    msg.replaceChildren(el('span', { text: 'all done ♡', style: 'font-size:1.5em' }), el('span', { text: 'grab your strip from the slot', class: 'muted' }));
    this.stage = 'printed'; this.paintMode();
    $('#acts').replaceChildren(
      el('a', { class: 'btn big sh-olive', href: '#/doodle', text: 'take your strip →' }),
      el('button', { class: 'btn', text: 'not cute? redo it', onclick: () => { this.reset(); $('#msg').hidden = true; } }),
    );
  },
  /* ---- video ---- */
  loopVideo() {
    const c = $('#vcan'), ctx = c.getContext('2d'), v = $('#cam');
    c.width = 960; c.height = 720;
    const conf = Array.from({ length: 46 }, () => ({ x: Math.random() * 960, y: Math.random() * -720, s: 8 + Math.random() * 10, r: Math.random() * 6, vr: (Math.random() - 0.5) * 0.2, vy: 2 + Math.random() * 3, c: ['#F07FA3', '#A9B56A', '#F8E08A', '#F5B3C7', '#FFFDF7'][Math.floor(Math.random() * 5)] }));
    const balloons = [{ x: 120, y: 820, s: 0.9 }, { x: 830, y: 1100, s: 1.1 }];
    const imgs = {}; ['hat', 'cookie', 'strawberry', 'balloon'].forEach((k) => loadImg(stSrc(k)).then((i) => (imgs[k] = i)));
    const draw = (ts) => {
      const t = ts / 1000;
      ctx.fillStyle = '#3D4421'; ctx.fillRect(0, 0, 960, 720);
      if (v.videoWidth) {
        const vw = v.videoWidth, vh = v.videoHeight, want = 4 / 3; let sw = vw, sh = vh; if (vw / vh > want) sw = vh * want; else sh = vw / want;
        ctx.save(); ctx.translate(960, 0); ctx.scale(-1, 1); ctx.drawImage(v, (vw - sw) / 2, (vh - sh) / 2, sw, sh, 0, 0, 960, 720); ctx.restore();
      }
      const bob = (k, x, y, w, ph = 0) => { const im = imgs[k]; if (!im) return; const h = w * im.naturalHeight / im.naturalWidth; ctx.save(); ctx.translate(x, y + Math.sin(t * 3.4 + ph) * 10); ctx.rotate(Math.sin(t * 3.4 + ph) * 0.1); ctx.drawImage(im, -w / 2, -h / 2, w, h); ctx.restore(); };
      if (this.vs.has('balloons') && imgs.balloon) balloons.forEach((b) => { b.y -= 1.6 * b.s; if (b.y < -200) b.y = 820; const w = 150 * b.s; ctx.drawImage(imgs.balloon, b.x - w / 2 + Math.sin(t + b.x) * 12, b.y, w, w); });
      if (this.vs.has('hat')) bob('hat', 480, 90, 170);
      if (this.vs.has('cookie')) bob('cookie', 850, 600, 170, 1);
      if (this.vs.has('strawberry')) bob('strawberry', 115, 600, 190, 2);
      if (this.vs.has('candle')) {
        ctx.save(); ctx.translate(480, 640);
        ctx.fillStyle = '#A9B56A'; ctx.strokeStyle = '#2B2723'; ctx.lineWidth = 4; ctx.fillRect(-14, -70, 28, 80); ctx.strokeRect(-14, -70, 28, 80);
        const fl = 1 + Math.sin(t * 22) * 0.12; ctx.scale(1, fl); ctx.beginPath(); ctx.moveTo(0, -120); ctx.quadraticCurveTo(22, -88, 0, -74); ctx.quadraticCurveTo(-22, -88, 0, -120); ctx.fillStyle = '#F7C64B'; ctx.fill(); ctx.stroke(); ctx.restore();
      }
      if (this.vs.has('confetti')) conf.forEach((p) => { p.y += p.vy; p.r += p.vr; if (p.y > 740) { p.y = -20; p.x = Math.random() * 960; } ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.r); ctx.fillStyle = p.c; ctx.strokeStyle = '#2B2723'; ctx.lineWidth = 1.5; ctx.fillRect(-p.s / 2, -p.s * 0.7, p.s, p.s * 1.4); ctx.strokeRect(-p.s / 2, -p.s * 0.7, p.s, p.s * 1.4); ctx.restore(); });
      this.raf = requestAnimationFrame(draw);
    };
    cancelAnimationFrame(this.raf); this.raf = requestAnimationFrame(draw);
  },
  startRec() {
    if (!this.stream || this.stage === 'recorded') return;
    const c = $('#vcan'), out = c.captureStream(30);
    this.stream.getAudioTracks().forEach((tr) => out.addTrack(tr));
    const types = ['video/mp4;codecs=avc1,mp4a', 'video/webm;codecs=vp9,opus', 'video/webm;codecs=vp8,opus', 'video/webm', 'video/mp4'];
    const type = types.find((t) => window.MediaRecorder && MediaRecorder.isTypeSupported(t));
    if (!window.MediaRecorder || !type) { toast('this browser can’t record video — try Chrome or Safari'); return; }
    this.chunks = []; this.rec = new MediaRecorder(out, { mimeType: type, videoBitsPerSecond: 2_000_000 });
    this.rec.ondataavailable = (e) => e.data.size && this.chunks.push(e.data);
    this.rec.onstop = () => this.afterRec(type);
    this.rec.start(250); this.stage = 'recording'; this.paintMode(); sfx.beep();
    const pill = $('#pill'); pill.hidden = false; const t0 = Date.now();
    setTimeout(async () => { this.vthumb = await canvasBlob(c, 'image/jpeg', 0.8); }, 1200);
    const tick = () => {
      if (this.stage !== 'recording') return;
      const s = Math.min(10, Math.floor((Date.now() - t0) / 1000));
      pill.replaceChildren(el('span', { class: 'dot rec-dot' }), el('span', { text: `rec 0:${String(s).padStart(2, '0')} / 0:10` }));
      if (Date.now() - t0 >= 10000) return this.stopRec();
      setTimeout(tick, 200);
    };
    tick();
  },
  stopRec() { if (this.rec && this.rec.state !== 'inactive') this.rec.stop(); this.stage = 'recorded'; $('#pill').hidden = true; },
  async afterRec(type) {
    const base = type.split(';')[0];
    this.vblob = new Blob(this.chunks, { type: base });
    if (!this.vthumb) this.vthumb = await canvasBlob($('#vcan'), 'image/jpeg', 0.8);
    this.stopCam(); cancelAnimationFrame(this.raf);
    const p = $('#playback'); p.src = URL.createObjectURL(this.vblob); p.hidden = false; p.loop = true; p.controls = true; p.play().catch(() => {});
    $('#vcan').hidden = true; this.paintMode(); $('#go').disabled = true;
    $('#hint').hidden = true; $('#tray').hidden = false; sfx.clunk();
    $('#acts').replaceChildren(
      el('button', { class: 'btn big sh-olive', text: 'pin it to the wall →', onclick: () => this.pinVideo() }),
      el('button', { class: 'btn', text: 'redo', onclick: () => { this.reset(); $('#vcan').hidden = false; this.startCam(); } }),
    );
  },
  pinVideo() {
    const name = el('input', { maxlength: 40, placeholder: 'your name' });
    const note = el('textarea', { maxlength: 500, placeholder: 'a little note for baz (optional)' });
    const btn = el('button', { class: 'btn big sh-pink', text: 'pin it ★' });
    btn.onclick = async () => {
      btn.disabled = true; btn.textContent = 'pinning…';
      try {
        const id = uuid(), ext = this.vblob.type.includes('mp4') ? 'mp4' : 'webm';
        await data.upload(`entries/${id}.${ext}`, this.vblob, this.vblob.type);
        await data.upload(`entries/${id}-thumb.jpg`, this.vthumb, 'image/jpeg');
        await data.add({ kind: 'video', media_path: `entries/${id}.${ext}`, thumb_path: `entries/${id}-thumb.jpg`, name: name.value.trim() || null, note: note.value.trim() || null });
        modal.close(); toast('pinned to baz’s wall ★'); location.hash = '#/wall';
      } catch (e) { console.error(e); btn.disabled = false; btn.textContent = 'pin it ★'; toast('couldn’t pin it — check your internet & try again'); }
    };
    modal.open([el('div', { class: 'form card' }, [el('h2', { text: 'sign your video note ♡' }), el('div', { class: 'lbl', text: 'signed,' }), name, el('div', { class: 'lbl', text: 'note' }), note]), el('div', { class: 'row-btns' }, [btn])]);
  },
};
$('#go').addEventListener('click', () => booth.go());
$('#colourT').addEventListener('click', () => { booth.colour = !booth.colour; booth.paintMode(); });
$('#prevF').addEventListener('click', () => { booth.frameIdx = (booth.frameIdx + FRAMES.length - 1) % FRAMES.length; booth.paintMode(); });
$('#nextF').addEventListener('click', () => { booth.frameIdx = (booth.frameIdx + 1) % FRAMES.length; booth.paintMode(); });
$('#mStrip').addEventListener('click', () => { location.hash = '#/booth'; });
$('#mVideo').addEventListener('click', () => { location.hash = '#/video'; });

/* ------------------------------------------------------------------ doodle */
const CRAYONS = [['#F07FA3', 'pink'], ['#A9B56A', 'olive'], ['#F8E08A', 'butter'], ['#2B2723', 'ink'], ['#FFFFFF', 'white']];
const SIZES = [8, 16, 28];
const doodle = {
  fresh: true, color: '#F07FA3', size: 16, tool: 'draw', strokes: [], items: [], hist: [], sel: null,
  enter() {
    if (!state.strip) { location.hash = '#/booth'; return; }
    const cv = $('#drawC'); cv.width = W; cv.height = H;
    $('#baseImg').src = state.strip.toDataURL('image/jpeg', 0.92);
    if (this.fresh) { this.strokes = []; this.items = []; this.hist = []; this.sel = null; this.fresh = false; $('#signName').value = ''; $('#signNote').value = ''; }
    this.redraw(); this.renderItems(); this.paintTools();
  },
  paintTools() {
    $$('.crayon').forEach((b) => b.setAttribute('aria-pressed', this.tool === 'draw' && b.dataset.c === this.color));
    $$('.sizes button').forEach((b) => b.setAttribute('aria-pressed', +b.dataset.s === this.size));
    $('#tErase').classList.toggle('on', this.tool === 'erase'); $('#tText').classList.toggle('on', this.tool === 'text');
  },
  scale() { return W / $('#work').clientWidth; },
  pt(e) { const r = $('#work').getBoundingClientRect(); return [(e.clientX - r.left) * W / r.width, (e.clientY - r.top) * H / r.height]; },
  drawStroke(ctx, s, from = 1) {
    const p = s.pts; if (!p.length) return;
    ctx.save(); ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    if (s.erase) { ctx.globalCompositeOperation = 'destination-out'; ctx.lineWidth = s.size * 1.6; ctx.strokeStyle = '#000'; ctx.beginPath(); ctx.moveTo(...p[Math.max(0, from - 1)]); for (let i = from; i < p.length; i++) ctx.lineTo(...p[i]); if (p.length === 1) ctx.lineTo(p[0][0] + 0.1, p[0][1]); ctx.stroke(); ctx.restore(); return; }
    const passes = [[1, 0.88, 0], [0.45, 0.4, 0.32], [0.35, 0.35, -0.3]];
    for (const [w, a, off] of passes) {
      ctx.globalAlpha = a; ctx.lineWidth = s.size * w; ctx.strokeStyle = s.color; ctx.beginPath();
      const j = (i) => off * s.size * Math.sin(i * 1.7 + s.seed);
      const st = Math.max(0, from - 1); ctx.moveTo(p[st][0] + j(st), p[st][1] - j(st));
      for (let i = st + 1; i < p.length; i++) ctx.lineTo(p[i][0] + j(i), p[i][1] - j(i));
      if (p.length === 1) ctx.lineTo(p[0][0] + 0.5, p[0][1] + 0.5);
      ctx.stroke();
    }
    ctx.restore();
  },
  redraw() { const c = $('#drawC'), ctx = c.getContext('2d'); ctx.clearRect(0, 0, W, H); this.strokes.forEach((s) => this.drawStroke(ctx, s)); },
  down(e) {
    if (e.target.closest('.item,.itembar')) return;
    this.select(null);
    const [x, y] = this.pt(e);
    if (this.tool === 'text') { this.addText(x, y); return; }
    e.preventDefault(); $('#drawC').setPointerCapture(e.pointerId);
    this.cur = { color: this.color, size: this.size * S, erase: this.tool === 'erase', seed: Math.random() * 10, pts: [[x, y]] };
    this.strokes.push(this.cur); this.drawStroke($('#drawC').getContext('2d'), this.cur);
  },
  move(e) { if (!this.cur) return; const p = this.pt(e); this.cur.pts.push(p); this.drawStroke($('#drawC').getContext('2d'), this.cur, this.cur.pts.length - 1); },
  up() { if (!this.cur) return; this.hist.push({ t: 'stroke' }); this.cur = null; },
  addItem(it) { it.id = uuid(); this.items.push(it); this.hist.push({ t: 'add', id: it.id }); this.renderItems(); this.select(it.id); },
  async addSticker(src) { const im = await loadImg(src); const w = 230 * S * Math.min(1, im.naturalWidth / im.naturalHeight + 0.2); this.addItem({ type: 'img', src, x: W / 2 + (Math.random() - 0.5) * 120 * S, y: H * (0.2 + Math.random() * 0.6), w, rot: (Math.random() - 0.5) * 24 }); },
  addText(x, y) {
    const inp = el('input', { maxlength: 40, value: 'bday girl!!', style: 'font-size:1.6rem' });
    const ok = () => { const t = inp.value.trim(); modal.close(); if (t) this.addItem({ type: 'text', text: t, color: this.color === '#FFFFFF' ? '#2B2723' : this.color, size: 70 * S, x, y, w: 0, rot: -4 }); };
    inp.addEventListener('keydown', (e) => { if (e.key === 'Enter') ok(); });
    modal.open([el('div', { class: 'form card' }, [el('h2', { text: 'what should it say?' }), inp, el('div', { class: 'row-btns' }, [el('button', { class: 'btn sh-pink', text: 'add it', onclick: ok })])])]);
    setTimeout(() => inp.select(), 60);
  },
  renderItems() {
    const work = $('#work'); $$('.item', work).forEach((n) => n.remove());
    for (const it of this.items) {
      const n = el('div', { class: 'item' + (this.sel === it.id ? ' sel' : ''), 'data-id': it.id, tabindex: 0, role: 'button', 'aria-label': it.type === 'text' ? 'Text: ' + it.text : 'Sticker' });
      if (it.type === 'img') { n.append(el('img', { src: it.src, alt: '' })); n.style.width = (it.w / W * 100) + '%'; n.style.left = ((it.x - it.w / 2) / W * 100) + '%'; n.style.top = '0'; }
      else { const s = el('div', { class: 'txt', text: it.text }); s.style.color = it.color; s.style.fontSize = (it.size / W * 100) + 'cqw'; n.append(s); }
      work.append(n);
      requestAnimationFrame(() => this.place(n, it));
      n.addEventListener('pointerdown', (e) => this.drag(e, it, n));
    }
    this.paintBar();
  },
  place(n, it) {
    const r = $('#work').getBoundingClientRect(); const k = r.width / W;
    const w = n.offsetWidth, h = n.offsetHeight;
    n.style.left = (it.x * k - w / 2) + 'px'; n.style.top = (it.y * k - h / 2) + 'px';
    n.style.transform = `rotate(${it.rot}deg)`;
  },
  drag(e, it, n) {
    e.preventDefault(); e.stopPropagation(); this.select(it.id);
    const k = this.scale(), sx = e.clientX, sy = e.clientY, ox = it.x, oy = it.y;
    const mv = (ev) => { it.x = Math.max(0, Math.min(W, ox + (ev.clientX - sx) * k)); it.y = Math.max(0, Math.min(H, oy + (ev.clientY - sy) * k)); this.place(n, it); this.paintBar(); };
    const upf = () => { removeEventListener('pointermove', mv); removeEventListener('pointerup', upf); };
    addEventListener('pointermove', mv); addEventListener('pointerup', upf);
  },
  select(id) { this.sel = id; $$('.item').forEach((n) => n.classList.toggle('sel', n.dataset.id === id)); this.paintBar(); },
  paintBar() {
    const bar = $('#itembar'); const it = this.items.find((i) => i.id === this.sel);
    if (!it) { bar.hidden = true; return; }
    const n = $(`.item[data-id="${it.id}"]`); if (!n) { bar.hidden = true; return; }
    bar.hidden = false; bar.style.left = Math.max(0, n.offsetLeft) + 'px'; bar.style.top = Math.max(0, n.offsetTop - 40) + 'px';
  },
  bump(f) { const it = this.items.find((i) => i.id === this.sel); if (!it) return; if (it.type === 'img') it.w = Math.max(40, Math.min(W * 1.2, it.w * f)); else it.size = Math.max(20, Math.min(260, it.size * f)); this.renderItems(); },
  turn() { const it = this.items.find((i) => i.id === this.sel); if (!it) return; it.rot += 15; this.renderItems(); },
  del() { const i = this.items.findIndex((x) => x.id === this.sel); if (i < 0) return; const [it] = this.items.splice(i, 1); this.hist.push({ t: 'del', it, i }); this.sel = null; this.renderItems(); },
  undo() {
    const h = this.hist.pop(); if (!h) return;
    if (h.t === 'stroke') { this.strokes.pop(); this.redraw(); }
    else if (h.t === 'add') { this.items = this.items.filter((i) => i.id !== h.id); this.renderItems(); }
    else if (h.t === 'del') { this.items.splice(h.i, 0, h.it); this.renderItems(); }
    else if (h.t === 'clear') { this.strokes = h.strokes; this.items = h.items; this.redraw(); this.renderItems(); }
  },
  clear() { if (!this.strokes.length && !this.items.length) return; this.hist.push({ t: 'clear', strokes: this.strokes, items: this.items }); this.strokes = []; this.items = []; this.sel = null; this.redraw(); this.renderItems(); },
  async flatten() {
    await fontReady;
    const c = document.createElement('canvas'); c.width = W; c.height = H; const ctx = c.getContext('2d');
    ctx.drawImage(state.strip, 0, 0); ctx.drawImage($('#drawC'), 0, 0);
    for (const it of this.items) {
      ctx.save(); ctx.translate(it.x, it.y); ctx.rotate(it.rot * Math.PI / 180);
      if (it.type === 'img') { const im = await loadImg(it.src); const h = it.w * im.naturalHeight / im.naturalWidth; ctx.drawImage(im, -it.w / 2, -h / 2, it.w, h); }
      else { ctx.font = `${it.size}px "Gochi Hand", cursive`; ctx.fillStyle = it.color; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(it.text, 0, 0); }
      ctx.restore();
    }
    return c;
  },
  async download() { const c = await this.flatten(); downloadBlob(await canvasBlob(c, 'image/jpeg', 0.92), 'baz-photobooth-strip.jpg'); },
  async pin() {
    const btn = $('#pinBtn'); btn.disabled = true; btn.textContent = 'pinning…';
    try {
      const c = await this.flatten(); const blob = await canvasBlob(c, 'image/jpeg', 0.88); const id = uuid();
      await data.upload(`entries/${id}.jpg`, blob, 'image/jpeg');
      await data.add({ kind: 'strip', media_path: `entries/${id}.jpg`, name: $('#signName').value.trim() || null, note: $('#signNote').value.trim() || null, frame: state.stripStyle });
      state.strip = null; this.fresh = true; toast('pinned to baz’s wall ★'); location.hash = '#/wall';
    } catch (e) { console.error(e); toast('couldn’t pin it — check your internet & try again'); }
    btn.disabled = false; btn.textContent = 'pin it to the wall ★';
  },
};
(function wireDoodle() {
  const rail = $('#crayons');
  CRAYONS.forEach(([c, n]) => rail.append(el('button', { class: 'crayon', 'data-c': c, 'aria-label': n + ' crayon', 'aria-pressed': 'false', onclick: () => { doodle.color = c; doodle.tool = 'draw'; doodle.paintTools(); } })));
  $$('.crayon').forEach((b) => { b.innerHTML = `<svg viewBox="0 0 130 40" aria-hidden="true"><rect x="4" y="6" width="96" height="28" rx="6" fill="${b.dataset.c}" stroke="#2B2723" stroke-width="2.4"/><path d="M100,6 L126,20 L100,34Z" fill="${b.dataset.c}" stroke="#2B2723" stroke-width="2.4" stroke-linejoin="round"/><rect x="22" y="12" width="46" height="16" fill="#FFFDF7" opacity=".75" stroke="#2B2723" stroke-width="1"/></svg>`; });
  const sz = $('#sizes'); SIZES.forEach((s, i) => sz.append(el('button', { 'data-s': s, 'aria-label': ['small', 'medium', 'big'][i] + ' crayon', onclick: () => { doodle.size = s; doodle.paintTools(); } }, [el('span', { style: `width:${6 + i * 6}px;height:${6 + i * 6}px` })])));
  $('#tErase').onclick = () => { doodle.tool = doodle.tool === 'erase' ? 'draw' : 'erase'; doodle.paintTools(); };
  $('#tText').onclick = () => { doodle.tool = doodle.tool === 'text' ? 'draw' : 'text'; doodle.paintTools(); if (doodle.tool === 'text') toast('tap on your strip where the words should go'); };
  $('#tUndo').onclick = () => doodle.undo(); $('#tClear').onclick = () => doodle.clear();
  const cv = $('#drawC');
  cv.addEventListener('pointerdown', (e) => doodle.down(e)); cv.addEventListener('pointermove', (e) => doodle.move(e));
  ['pointerup', 'pointercancel', 'pointerleave'].forEach((t) => cv.addEventListener(t, () => doodle.up()));
  $('#work').addEventListener('pointerdown', (e) => { if (e.target === $('#work') || e.target.id === 'baseImg') doodle.select(null); });
  const grid = $('#stk');
  STICKERS.forEach(([k, n]) => grid.append(el('button', { 'aria-label': 'Add ' + n + ' sticker', onclick: () => doodle.addSticker(stSrc(k)) }, [el('img', { src: stSrc(k), alt: '' })])));
  const up = el('input', { type: 'file', accept: 'image/*', hidden: true, onchange: (e) => { const f = e.target.files[0]; if (f) { const r = new FileReader(); r.onload = () => doodle.addSticker(r.result); r.readAsDataURL(f); } e.target.value = ''; } });
  grid.append(el('label', { 'aria-label': 'Upload your own sticker' }, [document.createTextNode('+ your own'), up]));
  $('#ibSmall').onclick = () => doodle.bump(0.85); $('#ibBig').onclick = () => doodle.bump(1.18); $('#ibTurn').onclick = () => doodle.turn(); $('#ibDel').onclick = () => doodle.del();
  $('#pinBtn').onclick = () => doodle.pin(); $('#dlBtn').onclick = () => doodle.download();
  addEventListener('resize', () => { if (!$('#doodle').hidden) doodle.renderItems(); });
  addEventListener('keydown', (e) => { if ($('#doodle').hidden) return; if ((e.ctrlKey || e.metaKey) && e.key === 'z') { e.preventDefault(); doodle.undo(); } if ((e.key === 'Delete' || e.key === 'Backspace') && doodle.sel && !/INPUT|TEXTAREA/.test(document.activeElement.tagName)) doodle.del(); });
})();

/* ------------------------------------------------------------------ wall */
const PINS = ['#F07FA3', '#A9B56A', '#F8E08A', '#FFFDF7'];
const wall = {
  rows: [], mode: 'auto',
  async enter() {
    $('#board').replaceChildren(el('div', { class: 'sticky', text: 'loading the wall…', style: 'grid-column:1/-1' }));
    try { [this.rows, this.mode] = await Promise.all([data.entries(), data.mode()]); this.render(); }
    catch (e) { console.error(e); $('#board').replaceChildren(el('div', { class: 'sticky', text: 'couldn’t load the wall — refresh?' })); }
  },
  async setMode(m) {
    if (!(await owner.ask())) return;
    const { error } = await sb.rpc('baz_set_mode', { pass: owner.pass, mode: m });
    if (error) { sessionStorage.removeItem('bazPass'); toast('passcode didn’t work'); return; }
    this.mode = m; this.render(); toast(m === 'auto' ? 'the 4 newest strips show on the booth' : 'pick up to 4 strips with ☆');
  },
  async feature(r) {
    if (!(await owner.ask())) return;
    const val = !r.featured;
    if (val && this.rows.filter((x) => x.featured).length >= 4) { toast('only 4 can be featured — un-star one first'); return; }
    const { error } = await sb.rpc('baz_set_featured', { pass: owner.pass, entry: r.id, val });
    if (error) { toast('couldn’t change that'); return; }
    r.featured = val; this.render();
  },
  async remove(r) {
    if (!(await owner.ask())) return;
    if (!(await confirmBox('take this off the wall? it can’t come back.', 'remove it'))) return;
    const { error } = await sb.rpc('baz_remove', { pass: owner.pass, entry: r.id });
    if (error) { toast('couldn’t remove it'); return; }
    this.rows = this.rows.filter((x) => x.id !== r.id); this.render(); modal.close();
  },
  render() {
    const own = !!owner.pass, f = new Set(data.featured(this.rows, this.mode).map((r) => r.id));
    $('#mAuto').classList.toggle('on', this.mode === 'auto'); $('#mPick').classList.toggle('on', this.mode === 'pick');
    $('#featHint').textContent = this.mode === 'auto' ? '' : `picked ${this.rows.filter((r) => r.featured).length} of 4`;
    const kids = [el('a', { class: 'sticky', href: '#/booth', text: this.rows.length ? '+ add your strip' : 'no strips yet — be the first!' })];
    this.rows.forEach((r, i) => {
      const rot = (hash(r.id) % 11) - 5;
      const open = el('button', { class: 'open', 'aria-label': r.kind === 'video' ? 'Play video note' : 'Open strip', onclick: () => this.open(r) });
      if (r.kind === 'strip') open.append(el('img', { class: 'strip', src: pub(r.media_path), alt: 'Photo strip' + (r.name ? ' from ' + r.name : ''), loading: 'lazy' }));
      else open.append(el('div', { class: 'tv' }, [el('div', { class: 'scr' }, [r.thumb_path ? el('img', { src: pub(r.thumb_path), alt: '', loading: 'lazy' }) : null, el('span')]), el('div', { class: 'lbl', text: 'video note' })]));
      const card = el('div', { class: 'pinned', style: `transform:rotate(${rot}deg)` }, [
        el('span', { class: 'pin', style: `background:${PINS[i % 4]}` }), f.has(r.id) ? el('span', { class: 'star', text: '★', 'aria-label': 'featured' }) : null, open,
        el('div', { class: 'tag', text: 'from ' + (r.name || 'a friend') }),
      ]);
      if (own) {
        const bar = el('div', { class: 'own' });
        if (r.kind === 'strip' && this.mode === 'pick') bar.append(el('button', { class: 'btn' + (r.featured ? ' on' : ''), text: r.featured ? '★ featured' : '☆ feature', onclick: () => this.feature(r) }));
        bar.append(el('button', { class: 'btn', text: 'remove', onclick: () => this.remove(r) }));
        card.append(bar);
      }
      kids.push(card);
    });
    $('#board').replaceChildren(...kids);
    $('#ownerBtn').textContent = own ? 'owner ✓' : 'owner';
  },
  open(r) {
    const own = !!owner.pass;
    const note = el('div', { class: 'note' }, [
      el('div', { class: 'card' }, [el('div', { class: 'from', text: 'from ' + (r.name || 'a friend') }), el('p', { text: r.note || '' })]),
      el('div', { class: 'row-btns' }, [
        r.kind === 'strip' && own && this.mode === 'pick' ? el('button', { class: 'btn sh-pink', text: r.featured ? '★ featured on the booth' : '☆ feature on the booth', onclick: async () => { await this.feature(r); modal.close(); } }) : null,
        el('button', { class: 'btn', text: 'download', onclick: async () => { const b = await (await fetch(pub(r.media_path))).blob(); downloadBlob(b, r.kind === 'strip' ? 'baz-photobooth-strip.jpg' : 'baz-video-note.' + r.media_path.split('.').pop()); } }),
        own ? el('button', { class: 'btn', text: 'remove', onclick: () => this.remove(r) }) : null,
      ]),
    ]);
    const media = r.kind === 'strip' ? el('img', { class: 'big', src: pub(r.media_path), alt: 'Photo strip' }) : el('video', { src: pub(r.media_path), controls: true, autoplay: true, playsinline: true });
    modal.open([media, note]);
  },
};
$('#mAuto').onclick = () => wall.setMode('auto'); $('#mPick').onclick = () => wall.setMode('pick');
$('#ownerBtn').onclick = async () => { if (owner.pass) { sessionStorage.removeItem('bazPass'); wall.render(); toast('owner mode off'); } else if (await owner.ask()) wall.render(); };

/* ------------------------------------------------------------------ router */
const views = ['home', 'booth', 'doodle', 'wall'];
function show(v) { views.forEach((x) => ($('#' + x).hidden = x !== v)); scrollTo(0, 0); }
async function route() {
  const h = location.hash || '#/';
  if (!h.startsWith('#/booth') && h !== '#/video') booth.leave();
  if (h === '#/booth') { show('booth'); booth.enter('photo'); }
  else if (h === '#/video') { show('booth'); booth.enter('video'); }
  else if (h === '#/doodle') { if (!state.strip) { location.hash = '#/booth'; return; } show('doodle'); doodle.enter(); }
  else if (h === '#/wall') { show('wall'); wall.enter(); }
  else { show('home'); home.enter(); }
}
addEventListener('hashchange', route);
route();
