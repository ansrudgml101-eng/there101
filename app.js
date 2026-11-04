(() => {
  'use strict';
  const $ = id => document.getElementById(id);
  const max = 12;
  let slides = [];
  let current = 0;
  let activeOverlay = null;
  let swipeStart = null;
  let toastTimer;
  const load = async () => {
    try {
      const response = await fetch('./slides.json');
      if (!response.ok) throw Error('Slide metadata unavailable');
      slides = await response.json();
    } catch (e) {
      // Local file:// preview fallback. GitHub Pages uses the external metadata file.
      slides = window.FALLBACK_SLIDES || [];
      if (!slides.length) { $('stageViewport').setAttribute('aria-label', '웹 서버 또는 GitHub Pages에서 열어 주세요.'); return; }
    }
    renderNav(); renderOverview();
    const start = Number((location.hash.match(/slide-(\d+)/) || [])[1]);
    goTo(Number.isFinite(start) && start >= 1 && start <= max ? start - 1 : 0, false);
  };
  const notify = message => { const el = $('toast'); el.textContent = message; el.classList.add('show'); clearTimeout(toastTimer); toastTimer = setTimeout(() => el.classList.remove('show'), 1800); };
  function renderNav() {
    $('slideNav').replaceChildren(...slides.map((s, i) => {
      const button = document.createElement('button'); button.className = 'nav-item'; button.type = 'button';
      button.innerHTML = `<span class="nav-no">${String(i+1).padStart(2,'0')}</span><span class="nav-label"></span>`;
      button.querySelector('.nav-label').textContent = s.title;
      button.addEventListener('click', () => goTo(i)); return button;
    }));
  }
  function renderOverview(query = '') {
    const grid = $('overviewGrid'); grid.replaceChildren();
    slides.forEach((s,i) => {
      if (query && !(s.title + ' ' + s.section + ' ' + s.content).toLocaleLowerCase().includes(query.toLocaleLowerCase())) return;
      const button = document.createElement('button'); button.type = 'button'; button.className = 'overview-card' + (current===i?' selected':'');
      const image = document.createElement('img'); image.loading='lazy'; image.src=s.image; image.alt=s.title;
      const meta = document.createElement('div'); meta.className='overview-meta';
      const no = document.createElement('b'); no.textContent=String(i+1).padStart(2,'0');
      const title = document.createElement('span'); title.textContent=s.title;
      meta.append(no,title); button.append(image,meta); button.addEventListener('click', () => {goTo(i);closeOverlay();});grid.append(button);
    });
    if (!grid.childElementCount) grid.textContent = '검색 결과가 없습니다.';
  }
  function goTo(index, animate=true) {
    if (!slides.length || index < 0 || index >= slides.length) return;
    const prev = current; current = index; const s = slides[index];
    const img = $('slideImage'); img.src = s.image; img.alt = `${index+1}번째 슬라이드: ${s.title}`;
    const frame = $('slideFrame'); frame.classList.remove('enter-next','enter-prev');
    if (animate && index !== prev) { void frame.offsetWidth; frame.classList.add(index>prev?'enter-next':'enter-prev'); }
    $('sectionLabel').textContent=s.section; $('topTitle').textContent=s.title;
    $('currentNumber').textContent=String(index+1).padStart(2,'0');
    $('progressText').innerHTML=`${String(index+1).padStart(2,'0')} <em>/ 12</em>`;
    $('progressFill').style.width=`${(index+1)/max*100}%`;
    $('prevBtn').disabled=index===0; $('nextBtn').disabled=index===max-1;
    [...$('slideNav').children].forEach((el,i) => {el.classList.toggle('active',i===index);if (i===index) {el.setAttribute('aria-current','page');el.scrollIntoView({block:'nearest',behavior:'smooth'});}else el.removeAttribute('aria-current');});
    if (location.hash !== `#slide-${index+1}`) history.replaceState(null,'',`#slide-${index+1}`);
    $('notesTitle').textContent=`슬라이드 ${index+1} / 12`;
    $('notesSlideTitle').textContent=s.title; $('notesText').textContent=s.notes || '원본 발표자 메모가 없습니다.'; $('slideText').textContent=s.content;
    document.title=`${s.title} | 천안시 웹 프레젠테이션`;
  }
  const next = () => goTo(current+1), prev = () => goTo(current-1);
  function openOverlay(id) { if (activeOverlay) closeOverlay(); activeOverlay=id; const el=$(id);el.classList.add('open');el.setAttribute('aria-hidden','false');if(id==='overview') {renderOverview($('searchInput').value);$('searchInput').focus();}else el.querySelector('.close-btn').focus(); }
  function closeOverlay() { if(!activeOverlay)return;const el=$(activeOverlay);el.classList.remove('open');el.setAttribute('aria-hidden','true');activeOverlay=null;$('stageViewport').focus({preventScroll:true}); }
  function toggleFullscreen() { if(document.fullscreenElement){document.exitFullscreen?.();}else if($('app').requestFullscreen){$('app').requestFullscreen().catch(()=>notify('전체화면을 지원하지 않는 브라우저입니다.'));}else notify('전체화면을 지원하지 않는 브라우저입니다.'); }
  $('prevBtn').addEventListener('click', prev);$('nextBtn').addEventListener('click', next);
  $('outlineBtn').addEventListener('click',()=>openOverlay('overview'));
  $('notesBtn').addEventListener('click',()=>openOverlay('notes'));
  $('fullscreenBtn').addEventListener('click',toggleFullscreen);
  document.querySelectorAll('[data-close]').forEach(el=>el.addEventListener('click',closeOverlay));
  document.querySelectorAll('.overlay').forEach(el=>el.addEventListener('click',ev=>{if(ev.target===el)closeOverlay();}));
  $('searchInput').addEventListener('input', ev=>renderOverview(ev.target.value));
  window.addEventListener('hashchange',()=>{const n=Number((location.hash.match(/slide-(\d+)/)||[])[1]);if(n>=1&&n<=max)goTo(n-1);});
  document.addEventListener('keydown',e=>{
    if(e.key==='Escape'){if(activeOverlay){closeOverlay();return;}if(document.fullscreenElement)document.exitFullscreen?.();return;}
    if(['INPUT','TEXTAREA'].includes(document.activeElement?.tagName))return;
    if(activeOverlay)return;
    if(['ArrowRight','PageDown',' '].includes(e.key)){e.preventDefault();next();}
    if(['ArrowLeft','PageUp'].includes(e.key)){e.preventDefault();prev();}
    if(e.key==='Home'){e.preventDefault();goTo(0);}if(e.key==='End'){e.preventDefault();goTo(max-1);}
    if(e.key.toLowerCase()==='g')openOverlay('overview');
    if(e.key.toLowerCase()==='n')openOverlay('notes');
    if(e.key.toLowerCase()==='f')toggleFullscreen();
  });
  const viewport=$('stageViewport');
  viewport.addEventListener('touchstart',e=>{if(e.touches.length===1)swipeStart={x:e.touches[0].clientX,y:e.touches[0].clientY};},{passive:true});
  viewport.addEventListener('touchend',e=>{if(!swipeStart)return;const dx=e.changedTouches[0].clientX-swipeStart.x,dy=e.changedTouches[0].clientY-swipeStart.y;if(Math.abs(dx)>55&&Math.abs(dx)>Math.abs(dy)*1.4){dx<0?next():prev();}swipeStart=null;},{passive:true});
  let wheelLocked=false;
  viewport.addEventListener('wheel',e=>{if(Math.abs(e.deltaY)<30&&Math.abs(e.deltaX)<30)return;e.preventDefault();if(wheelLocked)return;wheelLocked=true;setTimeout(()=>wheelLocked=false,720);(e.deltaY>0||e.deltaX>0)?next():prev();},{passive:false});
  load();
})();
