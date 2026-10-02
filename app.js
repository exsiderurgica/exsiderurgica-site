const $ = (s) => document.querySelector(s);
const year = $('#year');
if (year) year.textContent = new Date().getFullYear();

const VISIT_COUNTER = {
  namespace: 'exsiderurgica-site-gc20261002-7f2c9a',
  key: 'site-visits',
  sessionMs: 30 * 60 * 1000
};

async function trackSiteVisit(){
  const footer = document.querySelector('footer');
  if (!footer) return;

  let isNewVisit = true;
  const storageKey = 'exsiderurgica:last-visit';

  try {
    const now = Date.now();
    const last = Number(localStorage.getItem(storageKey) || 0);
    isNewVisit = !last || (now - last) > VISIT_COUNTER.sessionMs;
    localStorage.setItem(storageKey, String(now));
  } catch (e) {
    try {
      isNewVisit = !sessionStorage.getItem(storageKey);
      sessionStorage.setItem(storageKey, '1');
    } catch (_) {}
  }

  const action = isNewVisit ? 'hit' : 'get';
  const endpoint = `https://abacus.jasoncameron.dev/${action}/${VISIT_COUNTER.namespace}/${VISIT_COUNTER.key}`;

  try {
    const res = await fetch(endpoint, {cache:'no-store'});
    if (!res.ok) throw new Error('counter');
    const data = await res.json();
    const value = Number(data.value);
    if (!Number.isFinite(value)) throw new Error('counter-value');

    const node = document.createElement('span');
    node.className = 'visit-counter';
    node.innerHTML = `visite <strong>${value.toLocaleString('it-IT')}</strong>`;

    const existing = footer.querySelector('.visit-counter');
    if (existing) existing.replaceWith(node);
    else {
      const yearNode = footer.querySelector('#year');
      if (yearNode) footer.insertBefore(node, yearNode);
      else footer.appendChild(node);
    }
  } catch (e) {
    // If the external counter is temporarily unavailable, the site keeps working
    // and the counter simply stays hidden.
  }
}

async function loadFeatured(){
  const target = $('#featured-video');
  if (!target) return;
  try{
    const res = await fetch('data/videos.json', {cache:'no-store'});
    if(!res.ok) throw new Error('feed');
    const data = await res.json();
    const v = data.videos?.[0];
    if(!v) throw new Error('empty');
    target.innerHTML = `
      <a href="${v.url}" target="_blank" rel="noopener" aria-label="${escapeHtml(v.title)}">
        <img src="${v.thumbnail}" alt="Thumbnail: ${escapeHtml(v.title)}" loading="eager" />
      </a>
      <div class="featured-copy">
        <div class="meta">${formatDate(v.published)}</div>
        <h3>${escapeHtml(v.title)}</h3>
        <p>${escapeHtml(v.description || 'Nuovo video sul canale Exsiderurgica.')}</p>
        <a href="${v.url}" target="_blank" rel="noopener">watch on YouTube ↗</a>
      </div>`;
  }catch(e){
    target.innerHTML = `
      <a href="https://www.youtube.com/watch?v=JDyDPqJhlFg" target="_blank" rel="noopener">
        <img src="https://i.ytimg.com/vi/JDyDPqJhlFg/maxresdefault.jpg" alt="Eurorack Techno" />
      </a>
      <div class="featured-copy"><div class="meta">EXSIDERURGICA / YOUTUBE</div><h3>Eurorack Techno: i moduli fanno paura</h3><p>Modular synth, techno e workflow Eurorack.</p><a href="https://www.youtube.com/watch?v=JDyDPqJhlFg" target="_blank" rel="noopener">watch on YouTube ↗</a></div>`;
  }
}
function escapeHtml(s=''){return s.replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]))}
function formatDate(s){try{return new Intl.DateTimeFormat('it-IT',{day:'2-digit',month:'short',year:'numeric'}).format(new Date(s))}catch{return ''}}
loadFeatured();
trackSiteVisit();
