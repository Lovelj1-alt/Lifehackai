
const packsEl = document.getElementById('packsGrid');
const detail = document.getElementById('packDetail');
const backToGrid = document.getElementById('backToGrid');
const titleEl = document.getElementById('packTitle');
const taglineEl = document.getElementById('packTagline');
const metaEl = document.getElementById('packMeta');
const contentEl = document.getElementById('packContent');
const copyAllBtn = document.getElementById('copyAll');
const dlBtn = document.getElementById('downloadTxt');
const searchEl = document.getElementById('search');
const easyBtn = document.getElementById('easyBtn');
const installBtn = document.getElementById('installBtn');
const chatLog = document.getElementById('chatLog');
const chatInput = document.getElementById('chatInput');
const sendChat = document.getElementById('sendChat');

let PACKS = [];
let deferredPrompt = null;

window.addEventListener('beforeinstallprompt', (e) => { e.preventDefault(); deferredPrompt = e; });
installBtn?.addEventListener('click', async () => {
  if (deferredPrompt) { deferredPrompt.prompt(); await deferredPrompt.userChoice; deferredPrompt = null; }
  else { alert('On iPhone: Share → Add to Home Screen'); }
});

easyBtn?.addEventListener('click', () => {
  alert('Easy mode: copy any pack, paste into ChatGPT, ship in minutes.');
});

async function loadPacks() {
  const res = await fetch('/packs.json', { cache: 'no-store' });
  if (!res.ok) throw new Error('Failed to load packs');
  PACKS = await res.json();
  renderGrid(PACKS);
}
loadPacks().catch(err => {
  console.error(err);
  packsEl.innerHTML = '<p class="muted">Could not load packs.</p>';
});

function renderGrid(list) {
  packsEl.innerHTML = '';
  list.forEach(p => {
    const card = document.createElement('button');
    card.className = 'card pack';
    card.setAttribute('aria-label', p.title);
    card.innerHTML = `<h4>${p.title}</h4>
      <p class="muted">${p.tagline}</p>
      <div class="pillbar">${p.tags.map(t=>`<span class="pill">#${t}</span>`).join('')}</div>`;
    card.addEventListener('click', ()=>openPack(p.id));
    packsEl.appendChild(card);
  });
}

async function openPack(id) {
  const p = PACKS.find(x=>x.id===id);
  if (!p) return;
  detail.hidden = false;
  titleEl.textContent = p.title;
  taglineEl.textContent = p.tagline;
  metaEl.innerHTML = p.tags.map(t=>`<span class="pill">#${t}</span>`).join('');
  contentEl.innerHTML = p.sections.map(sec => {
    const items = sec.items.map((it,i)=>`<li>${linkify(escapeHtml(it))}</li>`).join('');
    return `<h4>${sec.heading}</h4><ol>${items}</ol>`;
  }).join('');
  window.scrollTo({top: detail.offsetTop - 12, behavior: 'smooth'});

  const text = packToText(p);
  copyAllBtn.onclick = async () => {
    await navigator.clipboard.writeText(text);
    copyAllBtn.textContent = 'Copied!';
    setTimeout(()=>copyAllBtn.textContent='Copy All', 1200);
  };
  dlBtn.onclick = () => downloadText(text, p.id + '.txt');
}

backToGrid?.addEventListener('click', ()=>{
  detail.hidden = true;
  titleEl.textContent = '';
  taglineEl.textContent = '';
  contentEl.innerHTML = '';
});

searchEl?.addEventListener('input', (e)=>{
  const q = e.target.value.toLowerCase().trim();
  const filtered = PACKS.filter(p =>
    p.title.toLowerCase().includes(q) ||
    p.tagline.toLowerCase().includes(q) ||
    p.tags.some(t => t.toLowerCase().includes(q))
  );
  renderGrid(filtered);
});

function packToText(p) {
  let out = `# ${p.title}\n${p.tagline}\n\n`;
  p.sections.forEach(sec => {
    out += `## ${sec.heading}\n` + sec.items.map(i=>'• '+i).join('\n') + '\n\n';
  });
  return out.trim() + '\n';
}

function downloadText(text, filename) {
  const blob = new Blob([text], {type:'text/plain'});
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}

function escapeHtml(str){return str.replace(/[&<>"']/g, s=>({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[s]));}
function linkify(str){
  return str.replace(/(https?:\/\/[^\s)]+)|(?<![\w@.])([\w.-]+\.[a-z]{2,})(?![\w@])/gi, (m)=>{
    const url = m.startsWith('http')? m : 'https://' + m;
    return `<a href="${url}" target="_blank" rel="noopener">${m}</a>`;
  });
}

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/service-worker.js').catch(console.warn);
  });
}
