const eurRoot = document.querySelector('#eurorack-catalog');
const eurPinned = document.querySelector('#eurorack-pinned');
const eurStamp = document.querySelector('#eurorack-updated');

const eurEsc=(s='')=>String(s).replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));
const eurDuration=(seconds)=>{
  if(seconds===null||seconds===undefined) return '';
  const s=Math.max(0,Math.round(Number(seconds)));
  const h=Math.floor(s/3600), m=Math.floor((s%3600)/60), r=s%60;
  return h ? `${h}:${String(m).padStart(2,'0')}:${String(r).padStart(2,'0')}` : `${m}:${String(r).padStart(2,'0')}`;
};
const eurRestricted=(v)=>['subscriber_only','premium_only','needs_auth'].includes(v.availability);

function eurVideoCard(v){
  return `
  <article class="video-card">
    <a class="video-thumb" href="${eurEsc(v.url)}" target="_blank" rel="noopener">
      <img src="${eurEsc(v.thumbnail)}" alt="Thumbnail: ${eurEsc(v.title)}" loading="lazy">
      ${v.duration ? `<span class="duration">${eurDuration(v.duration)}</span>` : ''}
      ${eurRestricted(v) ? '<span class="lock-badge">ABBONAMENTO</span>' : ''}
    </a>
    <div class="video-card-copy">
      <h3><a href="${eurEsc(v.url)}" target="_blank" rel="noopener">${eurEsc(v.title)}</a></h3>
      <div class="meta">${eurRestricted(v) ? 'contenuto abbonati' : 'Eurorack / YouTube'}</div>
    </div>
  </article>`;
}

async function loadEurorack(){
  try{
    const res=await fetch('data/eurorack.json',{cache:'no-store'});
    if(!res.ok) throw new Error('eurorack');
    const data=await res.json();
    const videos=Array.isArray(data.videos)?data.videos:[];
    const pinned=videos.find(v=>v.id===data.pinned);
    const rest=videos.filter(v=>v.id!==data.pinned);

    if(eurStamp && data.updated){
      eurStamp.textContent='aggiornato '+new Intl.DateTimeFormat('it-IT',{day:'2-digit',month:'short',year:'numeric'}).format(new Date(data.updated));
    }

    if(eurPinned && pinned){
      eurPinned.innerHTML=`
        <a href="${eurEsc(pinned.url)}" target="_blank" rel="noopener" class="pinned-media">
          <img src="${eurEsc(pinned.thumbnail)}" alt="Thumbnail: ${eurEsc(pinned.title)}">
          ${pinned.duration ? `<span class="duration">${eurDuration(pinned.duration)}</span>` : ''}
          <span class="pin-badge">FISSATO</span>
        </a>
        <div class="pinned-copy">
          <div class="eyebrow">IN EVIDENZA</div>
          <h2>${eurEsc(pinned.title)}</h2>
          <a class="text-link" href="${eurEsc(pinned.url)}" target="_blank" rel="noopener">guarda su YouTube ↗</a>
        </div>`;
    }

    eurRoot.innerHTML=rest.map(eurVideoCard).join('');
  }catch(e){
    if(eurRoot) eurRoot.innerHTML='<div class="catalog-empty">Impossibile caricare i video Eurorack in questo momento.</div>';
  }
}
loadEurorack();
