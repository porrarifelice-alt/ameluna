
const BOOKS = window.AMELUNA_BOOKS;
let pageFlip = null;
let activeBook = null;
let soundOn = true;
let readerBusy = false;

const modal = document.getElementById('readerModal');
const pageDisplay = document.getElementById('pageDisplay');
const titleEl = document.getElementById('readerBookTitle');
const labelEl = document.getElementById('readerBookLabel');
const physicalBook = document.querySelector('.physical-book');

function flipSound(){
  if(!soundOn) return;
  try{
    const AC=window.AudioContext||window.webkitAudioContext;
    const ctx=new AC();
    const now=ctx.currentTime;
    const buffer=ctx.createBuffer(1,Math.floor(ctx.sampleRate*.38),ctx.sampleRate);
    const data=buffer.getChannelData(0);
    for(let i=0;i<data.length;i++){
      const t=i/data.length;
      const envelope=Math.sin(Math.PI*t)*Math.pow(1-t,.35);
      const flutter=.35+.65*Math.abs(Math.sin(t*Math.PI*7));
      data[i]=(Math.random()*2-1)*envelope*flutter;
    }
    const src=ctx.createBufferSource();src.buffer=buffer;
    const filter=ctx.createBiquadFilter();filter.type='bandpass';filter.frequency.setValueAtTime(700,now);filter.frequency.exponentialRampToValueAtTime(2400,now+.22);filter.Q.value=.55;
    const gain=ctx.createGain();gain.gain.setValueAtTime(.0001,now);gain.gain.exponentialRampToValueAtTime(.12,now+.018);gain.gain.exponentialRampToValueAtTime(.0001,now+.36);
    src.connect(filter).connect(gain).connect(ctx.destination);src.start(now);src.stop(now+.38);
    setTimeout(()=>ctx.close(),500);
  }catch(e){}
}

function getMount(){
  return document.getElementById('pageflipMount');
}

function createFreshMount(){
  // StPageFlip destroy() removes its root element.
  // Therefore every new opening gets a completely new root element.
  const existing = getMount();
  if(existing && existing.parentNode){
    existing.parentNode.removeChild(existing);
  }

  const mount = document.createElement('div');
  mount.id = 'pageflipMount';
  mount.className = 'pageflip-mount';

  const spine = physicalBook.querySelector('.spine-shadow');
  if(spine){
    physicalBook.insertBefore(mount, spine);
  } else {
    physicalBook.appendChild(mount);
  }
  return mount;
}

function safelyDestroyFlip(){
  if(pageFlip){
    try{
      pageFlip.destroy();
    }catch(err){
      console.warn('PageFlip destroy:', err);
    }
  }
  pageFlip = null;
  readerBusy = false;
}

function updateDisplay(index){
  if(!activeBook || !pageFlip) return;

  const total = activeBook.pages.length;
  const orientation = pageFlip.getOrientation ? pageFlip.getOrientation() : 'landscape';

  if(index === 0){
    pageDisplay.textContent = 'Copertina';
    return;
  }

  if(orientation === 'portrait'){
    pageDisplay.textContent = `${index + 1} / ${total}`;
    return;
  }

  const left = index + 1;
  const right = Math.min(index + 2, total);
  pageDisplay.textContent = left === right
    ? `${left} / ${total}`
    : `${left} - ${right} / ${total}`;
}

function initBook(bookKey){
  if(readerBusy) return;
  readerBusy = true;

  safelyDestroyFlip();
  activeBook = BOOKS[bookKey];

  titleEl.textContent = activeBook.title;
  labelEl.textContent = activeBook.label;
  pageDisplay.textContent = 'Copertina';

  modal.classList.add('open');
  modal.setAttribute('aria-hidden','false');
  document.body.classList.add('reader-open');

  const isPhoneNow = window.matchMedia('(max-width: 620px)').matches;
  if((!window.St || !window.St.PageFlip) && !(isPhoneNow && window.AmelunaLocalMobileReader)){
    const mount = createFreshMount();
    if(window.AmelunaLocalMobileReader){
      pageFlip = new window.AmelunaLocalMobileReader(mount, {});
      pageFlip.on('init', () => { readerBusy=false; updateDisplay(0); });
      pageFlip.on('flip', e => updateDisplay(e.data));
      pageFlip.on('changeState', e => { if(e.data==='flipping') flipSound(); });
      pageFlip.loadFromImages(activeBook.pages);
      return;
    }
    mount.innerHTML = '<div style="color:white;text-align:center;padding:30px">Il lettore non è disponibile.</div>';
    readerBusy = false;
    return;
  }

  // Wait until the visible reader has completed one layout frame.
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      const mount = createFreshMount();

      const isPhone = window.matchMedia('(max-width: 620px)').matches;

      if(isPhone && window.AmelunaLocalMobileReader){
        pageFlip = new window.AmelunaLocalMobileReader(mount, {});
      } else {
        pageFlip = new St.PageFlip(mount, {
          width: 620,
          height: 620,
          size: 'stretch',
          minWidth: 280,
          maxWidth: 650,
          minHeight: 280,
          maxHeight: 650,
          drawShadow: true,
          flippingTime: 1250,
          usePortrait: true,
          startPage: 0,
          autoSize: true,
          maxShadowOpacity: .58,
          showCover: true,
          mobileScrollSupport: true,
          swipeDistance: 24,
          clickEventForward: true,
          useMouseEvents: true,
          disableFlipByClick: false
        });
      }

      pageFlip.on('init', () => {
        readerBusy = false;
        updateDisplay(0);
      });

      pageFlip.on('flip', e => {
        updateDisplay(e.data);
      });

      pageFlip.on('changeState', e => {
        if(e.data === 'flipping') flipSound();
      });

      pageFlip.on('changeOrientation', () => {
        setTimeout(() => {
          if(pageFlip) updateDisplay(pageFlip.getCurrentPageIndex());
        }, 40);
      });

      pageFlip.loadFromImages(activeBook.pages);

      // Fallback in case the init event is delayed by the browser.
      setTimeout(() => {
        readerBusy = false;
        if(pageFlip) updateDisplay(pageFlip.getCurrentPageIndex());
      }, 600);
    });
  });
}

function closeReader(){
  modal.classList.remove('open');
  modal.setAttribute('aria-hidden','true');
  document.body.classList.remove('reader-open');

  safelyDestroyFlip();
  activeBook = null;
  pageDisplay.textContent = 'Copertina';

  // destroy() normally removes the root. Remove any residue as an extra safeguard.
  const leftover = getMount();
  if(leftover && leftover.parentNode){
    leftover.parentNode.removeChild(leftover);
  }
}

function nextPage(){
  if(!pageFlip || readerBusy) return;
  try{
    pageFlip.flipNext();
  }catch(err){
    console.warn('flipNext:', err);
  }
}

function prevPage(){
  if(!pageFlip || readerBusy) return;
  try{
    pageFlip.flipPrev();
  }catch(err){
    console.warn('flipPrev:', err);
  }
}

function firstPage(){
  if(!pageFlip || readerBusy) return;
  try{
    pageFlip.flip(0);
  }catch(err){
    try{ pageFlip.turnToPage(0); }catch(_e){}
  }
}

function lastPage(){
  if(!pageFlip || !activeBook || readerBusy) return;
  const last = activeBook.pages.length - 1;
  try{
    pageFlip.flip(last);
  }catch(err){
    try{ pageFlip.turnToPage(last); }catch(_e){}
  }
}

document.querySelectorAll('[data-reader]').forEach(btn => {
  btn.addEventListener('click', () => initBook(btn.dataset.reader));
});

document.getElementById('readerClose').addEventListener('click', closeReader);
document.getElementById('readerHome').addEventListener('click', closeReader);

document.getElementById('readerStart').addEventListener('click', firstPage);
document.getElementById('readerFirst').addEventListener('click', firstPage);
document.getElementById('readerPrevBottom').addEventListener('click', prevPage);
document.getElementById('readerNextBottom').addEventListener('click', nextPage);
document.getElementById('readerLast').addEventListener('click', lastPage);

document.getElementById('soundToggle').addEventListener('click', e => {
  soundOn = !soundOn;
  e.currentTarget.innerHTML = soundOn ? '🔊 <span>ON</span>' : '🔇 <span>OFF</span>';
});

document.addEventListener('keydown', e => {
  if(!modal.classList.contains('open') || !pageFlip) return;
  if(e.key === 'ArrowRight' || e.key === 'PageDown') nextPage();
  if(e.key === 'ArrowLeft' || e.key === 'PageUp') prevPage();
  if(e.key === 'Home') firstPage();
  if(e.key === 'End') lastPage();
  if(e.key === 'Escape') closeReader();
});

document.addEventListener('contextmenu', e => e.preventDefault());
document.addEventListener('dragstart', e => e.preventDefault());
document.addEventListener('selectstart', e => e.preventDefault());
document.addEventListener('copy', e => {
  if(modal.classList.contains('open')) e.preventDefault();
});
