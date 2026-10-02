const catalog = document.querySelector('#playlist-catalog');
const stamp = document.querySelector('#catalog-updated');

const esc = (s='') => String(s).replace(/[&<>'"]/g, c => ({
  '&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'
}[c]));

const duration = (seconds) => {
  if (!seconds && seconds !== 0) return '';
  const s = Math.max(0, Math.round(Number(seconds)));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const r = s % 60;
  return h ? `${h}:${String(m).padStart(2,'0')}:${String(r).padStart(2,'0')}`
           : `${m}:${String(r).padStart(2,'0')}`;
};

function videoCard(v, members){
  const restricted = members || ['subscriber_only','premium_only','needs_auth'].includes(v.availability);
  return `
    <article class="video-card">
      <a class="video-thumb" href="${esc(v.url)}" target="_blank" rel="noopener">
        <img src="${esc(v.thumbnail)}" alt="" loading="lazy">
        ${v.duration ? `<span class="duration">${duration(v.duration)}</span>` : ''}
        ${restricted ? '<span class="lock-badge">ABBONAMENTO</span>' : ''}
      </a>
      <div class="video-card-copy">
        <h3><a href="${esc(v.url)}" target="_blank" rel="noopener">${esc(v.title)}</a></h3>
        <div class="meta">${restricted ? 'contenuto abbonati' : 'YouTube'}</div>
      </div>
    </article>`;
}

async function loadCatalog(){
  try{
    const res = await fetch('data/playlists.json', {cache:'no-store'});
    if(!res.ok) throw new Error('catalog');
    const data = await res.json();
    if (stamp && data.updated) {
      stamp.textContent = 'aggiornato ' + new Intl.DateTimeFormat('it-IT', {
        day:'2-digit', month:'short', year:'numeric'
      }).format(new Date(data.updated));
    }

    catalog.innerHTML = data.playlists.map((p, i) => {
      const count = Array.isArray(p.videos) ? p.videos.length : 0;
      const duplicateNote = p.duplicateOf ? '<span class="meta">playlist duplicata: catalogata una sola volta</span>' : '';
      return `
        <section class="playlist-block" id="playlist-${i+1}">
          <div class="playlist-heading">
            <div>
              <div class="eyebrow">${esc(p.label || (p.members ? 'ABBONAMENTO' : 'PLAYLIST'))}</div>
              <h2>${esc(p.title || 'Playlist YouTube')}</h2>
              <div class="playlist-meta">${count} video ${duplicateNote}</div>
            </div>
            <a class="text-link" href="${esc(p.url)}" target="_blank" rel="noopener">apri playlist ↗</a>
          </div>
          ${count ? `<div class="video-grid">${p.videos.map(v=>videoCard(v,p.members)).join('')}</div>`
                  : '<div class="catalog-empty">Catalogo in aggiornamento automatico. Riprova tra qualche minuto.</div>'}
        </section>`;
    }).join('');
  }catch(e){
    catalog.innerHTML = '<div class="catalog-empty">Impossibile caricare il catalogo in questo momento.</div>';
  }
}
loadCatalog();
