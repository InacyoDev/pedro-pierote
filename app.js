import * as C from './components.js';
import {portfolioData,contactConfig,whatsappUrl} from './data.js';

document.querySelector('#app').innerHTML=C.Header()+`<main>${C.Hero()+C.Manifesto()+C.PortfolioGallery()+C.HorizontalGallery()+C.CategoriesExperience()+C.FilmStrip()+C.About()+C.BehindTheScenes()+C.MobileFilmmaking()+C.ContactCTA()}</main>`+C.Footer()+C.FloatingWhatsApp()+C.Lightbox()+C.ContactModal();
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
let photoRequest=0,photoAnimation,photoFade;
async function renderPhoto(){
 const request=++photoRequest,p=activePhotos[photoIndex],img=$('#lightbox-image'),previous=$('#lightbox-previous'),status=$('#photo-status'),frame=$('.lightbox-frame');
 photoAnimation?.cancel();photoFade?.cancel();previous.hidden=true;status.textContent='';frame.setAttribute('aria-busy','true');
 const loading=setTimeout(()=>{if(request===photoRequest)status.textContent='Carregando fotografia…';},180);
 $('#photo-counter').textContent=`${String(photoIndex+1).padStart(2,'0')} / ${String(activePhotos.length).padStart(2,'0')}`;
 $('#photo-caption').textContent=p.alt;
 $$('[data-next],[data-previous]').forEach(b=>b.disabled=activePhotos.length<2);
 const loaded=new Image();loaded.src=p.image;
 try{await loaded.decode();}catch{if(request===photoRequest){status.textContent='Não foi possível carregar a fotografia. Feche e tente novamente.';frame.setAttribute('aria-busy','false');}clearTimeout(loading);return;}
 clearTimeout(loading);
 if(request!==photoRequest)return;
 if(!reduced.matches&&img.dataset.ready==='true'){previous.src=img.src;previous.hidden=false;}
 img.src=p.image;img.alt=p.alt;img.style.opacity='1';img.dataset.ready='true';status.textContent='';frame.setAttribute('aria-busy','false');
 if(!reduced.matches){
  photoAnimation=img.animate([{opacity:0,transform:'scale(1.012)'},{opacity:1,transform:'scale(1)'}],{duration:300,easing:'ease-out'});
  if(!previous.hidden){photoFade=previous.animate([{opacity:1},{opacity:0}],{duration:300});photoFade.finished.then(()=>{if(request===photoRequest)previous.hidden=true;}).catch(()=>{});}
 }
 if(activePhotos.length>1&&!navigator.connection?.saveData){const next=new Image();next.src=activePhotos[(photoIndex+1)%activePhotos.length].image;}
}
function showPhoto(id,collection=portfolioData){if(!collection.length)return;if(!$('#lightbox').open){$('#lightbox-image').style.opacity='0';$('#lightbox-image').dataset.ready='false';}activePhotos=collection;photoIndex=Math.max(0,collection.findIndex(p=>p.id===id));renderPhoto();openDialog($('#lightbox'));}
$('#lightbox').addEventListener('close',()=>{photoRequest++;photoAnimation?.cancel();photoFade?.cancel();$('#lightbox-previous').hidden=true;$('.lightbox-frame').setAttribute('aria-busy','false');});
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
form.addEventListener('submit',e=>{e.preventDefault();if(!form.reportValidity())return;$('#copy-status').textContent='';const d=new FormData(form);const date=d.get('data');const dateText=date?date.split('-').reverse().join('/'):'A combinar';const message=`Olá, Pedro! Meu nome é ${d.get('nome')}.\n\nProjeto: ${d.get('tipo')}\nData aproximada: ${dateText}\nCidade: ${d.get('cidade')||'A combinar'}\n\n${d.get('mensagem')}`;$('#message-preview').value=message;$('#contact-result').hidden=false;if(contactConfig.whatsapp){$('#send-message').href=whatsappUrl(message);$('#send-message').innerHTML=`Abrir WhatsApp ${C.icon('whatsapp')}`;}$('#message-preview').focus();$('#contact-result').scrollIntoView({behavior:reduced.matches?'instant':'smooth',block:'nearest'});});
$('#copy-message').addEventListener('click',async()=>{try{await navigator.clipboard.writeText($('#message-preview').value);$('#copy-status').textContent='Mensagem copiada. Cole na conversa com Pedro.';}catch{$('#message-preview').select();$('#copy-status').textContent='Selecione e copie a mensagem acima para levar à conversa.';}});

const stageWindow=$('.stage-window'),stageProgress=$('.stage-progress span');
const stageStep=()=>$('.stage-photo').offsetWidth+parseFloat(getComputedStyle($('.stage-track')).gap);
function updateStageControls(){
 const end=stageWindow.scrollWidth-stageWindow.clientWidth;
 $('[data-stage="-1"]').disabled=stageWindow.scrollLeft<=2;
 $('[data-stage="1"]').disabled=stageWindow.scrollLeft>=end-2;
 stageProgress.style.transform=`scaleX(${end>0?Math.min(1,Math.max(0,stageWindow.scrollLeft/end)):1})`;
}
stageWindow.addEventListener('scroll',updateStageControls,{passive:true});
new ResizeObserver(updateStageControls).observe(stageWindow);updateStageControls();
$$('[data-stage]').forEach(b=>b.addEventListener('click',()=>stageWindow.scrollBy({left:Number(b.dataset.stage)*stageStep(),behavior:reduced.matches?'instant':'smooth'})));
stageWindow.addEventListener('keydown',e=>{if(e.key==='ArrowLeft'||e.key==='ArrowRight'){e.preventDefault();stageWindow.scrollBy({left:(e.key==='ArrowRight'?1:-1)*stageStep(),behavior:reduced.matches?'instant':'smooth'});}});

// Preserve the copy and its semantics; each existing line becomes a film credit.
$$('.manifesto h2,.section-heading h2,.stage-heading h2,.about-copy h2,.backstage-title h2,.mobile-film h2,.contact h2').forEach(heading=>{
 heading.innerHTML=heading.innerHTML.split(/<br\s*\/?>/i).map((line,index)=>`<span class="credit-line"><span class="credit-text" style="--credit-delay:${index*85}ms">${line}</span></span>`).join('');
 heading.classList.add('credits');if(!heading.closest('.reveal'))heading.classList.add('reveal');
});
const reveal=new IntersectionObserver(entries=>entries.forEach(entry=>{
 if(entry.isIntersecting){entry.target.classList.add('visible');reveal.unobserve(entry.target);}
}),{threshold:.08});
$$('.reveal').forEach(el=>reveal.observe(el));
if(!reduced.matches)document.documentElement.classList.add('js-motion');

// Separate the camera layer from hover zoom and reveal masks, avoiding transform conflicts.
const cameraTargets=$$('.editorial-grid .photo-button,.about-crop,.backstage-main,.backstage-detail,.mobile-film .photo-button').map((host,index)=>{
 const img=host.querySelector('img'),layer=document.createElement('span');layer.className='image-window';
 img.before(layer);layer.append(img);host.classList.add('camera-window');
 return {host,layer,figure:host.closest('.portfolio-item'),drift:index%2?-22:26,travel:22,zoom:.035,base:1.045};
});
cameraTargets.push({host:$('.categories'),layer:$('.category-images'),travel:18,zoom:.025,base:1.035});
cameraTargets.push({host:$('.contact'),layer:$('.contact-photo'),travel:20,zoom:.025,base:1.05});
const cameraByElement=new Map(cameraTargets.map(item=>[item.host,item])),activeCameras=new Set();
const richMotion=matchMedia('(min-width: 900px) and (pointer: fine)');
const hero=$('.hero'),heroMedia=$('.hero-media'),heroCopy=$('.hero-copy');
let motionRaf=0,geometryDirty=true,heroVisible=true,heroHeight=1;
const clamp=value=>Math.max(0,Math.min(1,value));
// Layout geometry is refreshed on resize, not measured on every scroll frame.
function layoutTop(el){let top=0;for(let node=el;node;node=node.offsetParent)top+=node.offsetTop;return top;}
function measureMotion(){
 heroHeight=hero.offsetHeight;
 cameraTargets.forEach(item=>{item.top=layoutTop(item.host);item.height=item.host.offsetHeight;});
 geometryDirty=false;
}
function motionFrame(){
 motionRaf=0;if(reduced.matches||document.hidden||!richMotion.matches)return;
 if(geometryDirty)measureMotion();
 const y=scrollY,viewport=innerHeight;
 if(heroVisible){const progress=clamp(y/heroHeight);heroMedia.style.transform=`scale(${1+progress*.045})`;heroCopy.style.transform=`translate3d(0,${progress*30}px,0)`;}
 activeCameras.forEach(item=>{
  const progress=clamp((viewport+y-item.top)/(viewport+item.height));
  item.layer.style.transform=`translate3d(0,${((.5-progress)*item.travel).toFixed(2)}px,0) scale(${(item.base+(1-progress)*item.zoom).toFixed(4)})`;
  if(item.figure)item.figure.style.setProperty('--editorial-y',`${((.5-progress)*item.drift).toFixed(2)}px`);
 });
}
function startMotion(){if(!motionRaf&&!reduced.matches&&richMotion.matches&&!document.hidden)motionRaf=requestAnimationFrame(motionFrame);}
const cameraObserver=new IntersectionObserver(entries=>{
 entries.forEach(entry=>{const item=cameraByElement.get(entry.target);entry.target.classList.toggle('camera-active',entry.isIntersecting);if(entry.isIntersecting)activeCameras.add(item);else activeCameras.delete(item);});startMotion();
},{rootMargin:'100px 0px'});
cameraTargets.forEach(item=>cameraObserver.observe(item.host));

// The floating link yields to the Hero, final CTA and native modal dialogs.
const floating=$('.whatsapp-float');let contactVisible=false;
function updateFloating(){floating.classList.toggle('is-visible',!heroVisible&&!contactVisible);}
new IntersectionObserver(([entry])=>{heroVisible=entry.isIntersecting;updateFloating();startMotion();}).observe(hero);
new IntersectionObserver(([entry])=>{contactVisible=entry.isIntersecting;updateFloating();}).observe($('.contact-actions'));

function resetMotion(){
 heroMedia.style.transform='';heroCopy.style.transform='';
 cameraTargets.forEach(item=>{item.layer.style.transform='';item.figure?.style.removeProperty('--editorial-y');});
}
function refreshMotion(){geometryDirty=true;if(reduced.matches||!richMotion.matches)resetMotion();else startMotion();}
window.addEventListener('scroll',startMotion,{passive:true});
window.addEventListener('resize',refreshMotion,{passive:true});
new ResizeObserver(()=>{geometryDirty=true;startMotion();}).observe(document.querySelector('main'));
document.fonts.ready.then(refreshMotion);
document.addEventListener('visibilitychange',()=>{if(document.hidden){cancelAnimationFrame(motionRaf);motionRaf=0;}else startMotion();});
richMotion.addEventListener('change',refreshMotion);
reduced.addEventListener('change',()=>{
 document.documentElement.classList.toggle('js-motion',!reduced.matches);
 if(reduced.matches){photoAnimation?.cancel();photoFade?.cancel();$('#lightbox-previous').hidden=true;}
 refreshMotion();
});

// One pointer frame for the preview cursor and subtle magnetic CTAs.
const cursor=document.createElement('div');cursor.className='cursor';cursor.setAttribute('aria-hidden','true');cursor.hidden=true;document.body.append(cursor);
let pointerFrame=0,pointer,magnet;
function resetMagnet(){if(magnet){magnet.style.removeProperty('--magnet-x');magnet.style.removeProperty('--magnet-y');magnet=null;}}
function paintPointer(){
 pointerFrame=0;if(!pointer||!fine.matches||reduced.matches||$('dialog[open]')){cursor.hidden=true;resetMagnet();return;}
 const {x,y,target}=pointer,image=target.closest('[data-photo]'),button=target.closest('.cta'),link=target.closest('a,button');
 const rect=button?.getBoundingClientRect();
 if(magnet!==button)resetMagnet();
 cursor.hidden=false;cursor.classList.toggle('see',!!image);cursor.classList.toggle('link',!image&&!!link);cursor.textContent=image?'VER':'';
 cursor.style.transform=`translate3d(${x}px,${y}px,0) translate(-50%,-50%)`;
 if(button){magnet=button;button.style.setProperty('--magnet-x',`${(x-rect.left-rect.width/2)*.035}px`);button.style.setProperty('--magnet-y',`${(y-rect.top-rect.height/2)*.08}px`);}
}
document.addEventListener('pointermove',e=>{if(e.pointerType!=='mouse'){cursor.hidden=true;resetMagnet();return;}pointer={x:e.clientX,y:e.clientY,target:e.target};if(!pointerFrame)pointerFrame=requestAnimationFrame(paintPointer);},{passive:true});
document.addEventListener('pointerleave',()=>{pointer=null;cursor.hidden=true;resetMagnet();});
document.addEventListener('pointerdown',e=>{if(e.pointerType!=='mouse')resetMagnet();},{passive:true});
window.addEventListener('blur',()=>{pointer=null;cursor.hidden=true;resetMagnet();});
reduced.addEventListener('change',()=>{if(reduced.matches){cursor.hidden=true;resetMagnet();}});

