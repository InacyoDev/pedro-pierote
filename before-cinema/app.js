import * as C from './components.js';
import {portfolioData,contactConfig} from './data.js';

document.querySelector('#app').innerHTML=C.Header()+`<main>${C.Hero()+C.Manifesto()+C.PortfolioGallery()+C.HorizontalGallery()+C.CategoriesExperience()+C.FilmStrip()+C.About()+C.BehindTheScenes()+C.MobileFilmmaking()+C.ContactCTA()}</main>`+C.Footer()+C.Lightbox()+C.ContactModal();
const $=s=>document.querySelector(s), $$=s=>[...document.querySelectorAll(s)];
const reduced=matchMedia('(prefers-reduced-motion: reduce)');
const fine=matchMedia('(pointer: fine) and (hover: hover)');
const dialogFocus=new WeakMap();
const dialogClosing=new WeakMap();
function openDialog(dialog){if(dialog.open)return;dialogFocus.set(dialog,document.activeElement);dialog.showModal();document.body.classList.add('modal-open');$('.cursor')?.setAttribute('hidden','');}
function closeDialog(dialog){
 if(dialogClosing.has(dialog))return dialogClosing.get(dialog);
 if(!dialog.open)return Promise.resolve();
 const closing=(async()=>{
  dialog.dataset.closing='true';
  if(!reduced.matches)await dialog.animate([{opacity:1},{opacity:0}],{duration:140}).finished.catch(()=>{});
  // The native close event restores focus before a menu link focuses its section.
  await new Promise(resolve=>{dialog.addEventListener('close',resolve,{once:true});dialog.close();delete dialog.dataset.closing;});
 })();
 dialogClosing.set(dialog,closing);closing.finally(()=>dialogClosing.delete(dialog));
 return closing;
}
$$('dialog').forEach(dialog=>{
 dialog.addEventListener('close',()=>{document.body.classList.toggle('modal-open',!!$('dialog[open]'));dialogFocus.get(dialog)?.focus({preventScroll:true});});
 dialog.addEventListener('cancel',e=>{e.preventDefault();closeDialog(dialog);});
 dialog.addEventListener('keydown',e=>{
  if(e.key!=='Tab')return;
  const items=[...dialog.querySelectorAll('a[href],button,input,select,textarea,[tabindex]')].filter(el=>!el.disabled&&el.tabIndex>=0&&el.getClientRects().length);
  const first=items[0],last=items.at(-1);
  if(e.shiftKey&&document.activeElement===first){e.preventDefault();last?.focus();}
  else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first?.focus();}
 });
 dialog.querySelector('[data-close]').addEventListener('click',()=>closeDialog(dialog));
 dialog.addEventListener('click',e=>{if(e.target===dialog && dialog.id!=='lightbox' && dialog.id!=='mobile-menu'){const r=dialog.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)closeDialog(dialog);}});
});
// Native dialogs keep the background inert; the Tab cycle stays inside the content.
$$('[data-contact]').forEach(b=>b.addEventListener('click',()=>openDialog($('#contact-modal'))));
const menu=$('#mobile-menu'),menuButton=$('.menu-toggle');
menuButton.addEventListener('click',()=>{menuButton.setAttribute('aria-expanded','true');openDialog(menu);});
menu.addEventListener('close',()=>menuButton.setAttribute('aria-expanded','false'));
menu.querySelectorAll('a').forEach(a=>a.addEventListener('click',async e=>{
 e.preventDefault();await closeDialog(menu);
 const target=$(a.hash);target.setAttribute('tabindex','-1');target.focus({preventScroll:true});
 history.replaceState(null,'',a.hash);target.scrollIntoView({behavior:reduced.matches?'instant':'smooth'});
}));
new ResizeObserver(()=>{if(innerWidth>700&&menu.open)closeDialog(menu);}).observe(document.documentElement);
const sentinel=document.createElement('div');sentinel.style.cssText='position:absolute;top:40px;width:1px;height:1px;pointer-events:none';document.body.prepend(sentinel);
new IntersectionObserver(([e])=>$('#header').classList.toggle('scrolled',!e.isIntersecting)).observe(sentinel);

let activePhotos=portfolioData, photoIndex=0;
let photoRequest=0,photoAnimation;
async function renderPhoto(){
 const request=++photoRequest,p=activePhotos[photoIndex],img=$('#lightbox-image'),status=$('#photo-status'),frame=$('.lightbox-frame');
 photoAnimation?.cancel();img.style.opacity='0';img.alt='';status.textContent='Carregando fotografia…';frame.setAttribute('aria-busy','true');
 $('#photo-counter').textContent=`${String(photoIndex+1).padStart(2,'0')} / ${String(activePhotos.length).padStart(2,'0')}`;
 $('#photo-caption').textContent=p.alt;
 $$('[data-next],[data-previous]').forEach(b=>b.disabled=activePhotos.length<2);
 const loaded=new Image();loaded.src=p.image;
 try{await loaded.decode();}catch{if(request===photoRequest){status.textContent='Não foi possível carregar a fotografia. Feche e tente novamente.';frame.setAttribute('aria-busy','false');}return;}
 if(request!==photoRequest)return;
 img.src=p.image;img.alt=p.alt;img.style.opacity='1';status.textContent='';frame.setAttribute('aria-busy','false');
 if(!reduced.matches)photoAnimation=img.animate([{opacity:0,transform:'scale(.995)'},{opacity:1,transform:'scale(1)'}],{duration:180});
 if(activePhotos.length>1&&!navigator.connection?.saveData){const next=new Image();next.src=activePhotos[(photoIndex+1)%activePhotos.length].image;}
}
function showPhoto(id,collection=portfolioData){if(!collection.length)return;activePhotos=collection;photoIndex=Math.max(0,collection.findIndex(p=>p.id===id));renderPhoto();openDialog($('#lightbox'));}
$('#lightbox').addEventListener('close',()=>{photoRequest++;photoAnimation?.cancel();$('.lightbox-frame').setAttribute('aria-busy','false');});
function nextPhoto(step){if(activePhotos.length<2)return;photoIndex=(photoIndex+step+activePhotos.length)%activePhotos.length;renderPhoto();}
$$('[data-photo]').forEach(b=>b.addEventListener('click',()=>{
 const group=b.closest('[data-photo-group]');
 const collection=group?[...group.querySelectorAll('[data-photo]')].map(item=>portfolioData.find(p=>p.id===Number(item.dataset.photo))):portfolioData;
 showPhoto(Number(b.dataset.photo),collection);
}));
$('[data-next]').addEventListener('click',()=>nextPhoto(1));$('[data-previous]').addEventListener('click',()=>nextPhoto(-1));
$('#lightbox').addEventListener('keydown',e=>{if(e.key==='ArrowRight'){e.preventDefault();nextPhoto(1)}if(e.key==='ArrowLeft'){e.preventDefault();nextPhoto(-1)}if(e.key==='Home'||e.key==='End'){e.preventDefault();photoIndex=e.key==='Home'?0:activePhotos.length-1;renderPhoto();}});
let touchX=0,touchY=0,swiping=false;
$('.lightbox-frame').addEventListener('touchstart',e=>{swiping=e.touches.length===1;touchX=e.changedTouches[0].clientX;touchY=e.changedTouches[0].clientY;},{passive:true});
$('.lightbox-frame').addEventListener('touchcancel',()=>{swiping=false;},{passive:true});
$('.lightbox-frame').addEventListener('touchend',e=>{const x=e.changedTouches[0].clientX-touchX,y=e.changedTouches[0].clientY-touchY;if(swiping&&Math.abs(x)>55&&Math.abs(x)>Math.abs(y))nextPhoto(x<0?1:-1);swiping=false;},{passive:true});

let categoryIndex=-1;
const categoryNames=['Shows','Eventos','Conteúdo','Fotografia'],categoryButtons=$$('[data-category]'),categoryImages=$$('.category-image');
async function selectCategory(index){
 if(index===categoryIndex)return;categoryIndex=index;
 categoryButtons.forEach((b,i)=>{b.classList.toggle('active',i===index);b.setAttribute('aria-pressed',String(i===index));});
 const count=portfolioData.filter(p=>p.category===categoryNames[index]).length;
 $('.category-label').textContent=`Explorar ${categoryNames[index]}`;
 $('#category-selection').textContent=`${count} ${count===1?'imagem':'imagens'}`;
 try{await categoryImages[index].decode();}catch{return;}
 if(categoryIndex===index)categoryImages.forEach((im,i)=>im.classList.toggle('active',i===index));
}
categoryButtons.forEach((b,index)=>{
 const choose=()=>selectCategory(index);b.addEventListener('click',choose);b.addEventListener('focus',choose);
 b.addEventListener('pointerenter',e=>{if(fine.matches&&e.pointerType==='mouse')choose();});
 b.addEventListener('keydown',e=>{let next=index;if(['ArrowDown','ArrowRight'].includes(e.key))next=(index+1)%categoryButtons.length;else if(['ArrowUp','ArrowLeft'].includes(e.key))next=(index+categoryButtons.length-1)%categoryButtons.length;else if(e.key==='Home')next=0;else if(e.key==='End')next=categoryButtons.length-1;else return;e.preventDefault();categoryButtons[next].focus();});
});
selectCategory(0);
$('[data-explore]').addEventListener('click',()=>{const collection=portfolioData.filter(p=>p.category===categoryNames[categoryIndex]);if(collection.length)showPhoto(collection[0].id,collection);});
$('.motion-toggle').addEventListener('click',e=>{const paused=$('.filmstrip').classList.toggle('paused');e.currentTarget.setAttribute('aria-pressed',String(paused));e.currentTarget.textContent=paused?'Retomar movimento':'Pausar movimento';});
let filmVisible=false;
const updateFilmMotion=()=>$('.filmstrip').classList.toggle('is-idle',!filmVisible||document.hidden);
new IntersectionObserver(([entry])=>{filmVisible=entry.isIntersecting;updateFilmMotion();}).observe($('.filmstrip'));
document.addEventListener('visibilitychange',updateFilmMotion);

const form=$('#contact-form');
if(contactConfig.whatsapp){$('.contact-note').textContent='Prepare sua mensagem para enviar pelo WhatsApp. O envio só acontece quando você confirmar no WhatsApp.';}
form.addEventListener('submit',e=>{e.preventDefault();if(!form.reportValidity())return;$('#copy-status').textContent='';const d=new FormData(form);const date=d.get('data');const dateText=date?date.split('-').reverse().join('/'):'A combinar';const message=`Olá, Pedro! Meu nome é ${d.get('nome')}.\n\nProjeto: ${d.get('tipo')}\nData aproximada: ${dateText}\nCidade: ${d.get('cidade')||'A combinar'}\n\n${d.get('mensagem')}`;$('#message-preview').value=message;$('#contact-result').hidden=false;if(contactConfig.whatsapp){const number=contactConfig.whatsapp.replace(/\D/g,'');$('#send-message').href=`https://wa.me/${number}?text=${encodeURIComponent(message)}`;$('#send-message').textContent='Abrir WhatsApp ↗';}$('#message-preview').focus();$('#contact-result').scrollIntoView({behavior:reduced.matches?'instant':'smooth',block:'nearest'});});
$('#copy-message').addEventListener('click',async()=>{try{await navigator.clipboard.writeText($('#message-preview').value);$('#copy-status').textContent='Mensagem copiada. Cole na conversa com Pedro.';}catch{$('#message-preview').select();$('#copy-status').textContent='Selecione e copie a mensagem acima para levar à conversa.';}});

// Reversible motion enhancement: content stays visible if scripts or observers fail.
if(!reduced.matches){document.documentElement.classList.add('js-motion');const reveal=new IntersectionObserver(entries=>entries.forEach(e=>{if(e.isIntersecting){e.target.classList.add('visible');reveal.unobserve(e.target);}}),{threshold:.08});$$('.reveal').forEach(el=>reveal.observe(el));}
reduced.addEventListener('change',()=>{if(reduced.matches)document.documentElement.classList.remove('js-motion');});
const stageWindow=$('.stage-window');let heroVisible=true,raf=0,lastScroll=-1;
new IntersectionObserver(([e])=>{heroVisible=e.isIntersecting;if(heroVisible)startMotion();}).observe($('.hero'));
const stageStep=()=>$('.stage-photo').offsetWidth+parseFloat(getComputedStyle($('.stage-track')).gap);
function updateStageControls(){
 const end=stageWindow.scrollWidth-stageWindow.clientWidth;
 $('[data-stage="-1"]').disabled=stageWindow.scrollLeft<=2;
 $('[data-stage="1"]').disabled=stageWindow.scrollLeft>=end-2;
}
stageWindow.addEventListener('scroll',updateStageControls,{passive:true});
new ResizeObserver(updateStageControls).observe(stageWindow);updateStageControls();
$$('[data-stage]').forEach(b=>b.addEventListener('click',()=>{stageWindow.scrollBy({left:Number(b.dataset.stage)*(stageStep()),behavior:reduced.matches?'instant':'smooth'});}));
stageWindow.addEventListener('keydown',e=>{if(e.key==='ArrowLeft'||e.key==='ArrowRight'){e.preventDefault();stageWindow.scrollBy({left:(e.key==='ArrowRight'?1:-1)*(stageStep()),behavior:reduced.matches?'instant':'smooth'});}});
function motionFrame(){raf=0;if(reduced.matches||document.hidden)return;const y=scrollY;if(y!==lastScroll){lastScroll=y;if(heroVisible&&innerWidth>700){const p=Math.min(1,y/$('.hero').offsetHeight);$('.hero-media').style.transform=`scale(${1+p*.045})`;$('.hero-copy').style.transform=`translateY(${p*30}px)`;}}}
function startMotion(){if(!raf&&!reduced.matches)raf=requestAnimationFrame(motionFrame);}
window.addEventListener('scroll',startMotion,{passive:true});
window.addEventListener('resize',()=>{lastScroll=-1;if(innerWidth<=700){$('.hero-media').style.transform='';$('.hero-copy').style.transform='';}startMotion();},{passive:true});
document.addEventListener('visibilitychange',()=>{if(!document.hidden)startMotion();});
reduced.addEventListener('change',()=>{if(reduced.matches){$('.hero-media').style.transform='';$('.hero-copy').style.transform='';}else startMotion();});

// The native pointer remains available; the decorative marker never captures input.
const cursor=document.createElement('div');cursor.className='cursor';cursor.setAttribute('aria-hidden','true');cursor.hidden=true;document.body.append(cursor);
document.addEventListener('pointermove',e=>{if(!fine.matches||reduced.matches||e.pointerType!=='mouse'){cursor.hidden=true;return;}cursor.hidden=!!$('dialog[open]');cursor.style.transform=`translate3d(${e.clientX}px,${e.clientY}px,0) translate(-50%,-50%)`;const image=e.target.closest('[data-photo]'),link=e.target.closest('a,button');cursor.classList.toggle('see',!!image);cursor.classList.toggle('link',!image&&!!link);cursor.textContent=image?'VER':'';},{passive:true});
document.addEventListener('pointerleave',()=>cursor.hidden=true);
$$('.cta').forEach(el=>{el.addEventListener('pointermove',e=>{if(!fine.matches||reduced.matches||e.pointerType!=='mouse')return;const r=el.getBoundingClientRect();el.style.transform=`translate(${(e.clientX-r.left-r.width/2)*.035}px,${(e.clientY-r.top-r.height/2)*.06}px)`;});el.addEventListener('pointerleave',()=>el.style.transform='');});
