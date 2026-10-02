const $ = (s) => document.querySelector(s);
const year = $('#year');
if (year) year.textContent = new Date().getFullYear();

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
