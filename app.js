import * as C from './components.js';
import {portfolioData,contactConfig} from './data.js';

document.querySelector('#app').innerHTML=C.Header()+`<main>${C.Hero()+C.Manifesto()+C.PortfolioGallery()+C.HorizontalGallery()+C.CategoriesExperience()+C.FilmStrip()+C.About()+C.BehindTheScenes()+C.MobileFilmmaking()+C.ContactCTA()}</main>`+C.Footer()+C.Lightbox()+C.ContactModal();
const $=s=>document.querySelector(s), $$=s=>[...document.querySelectorAll(s)];
const reduced=matchMedia('(prefers-reduced-motion: reduce)');
const fine=matchMedia('(pointer: fine) and (hover: hover)');
const dialogFocus=new WeakMap();
function openDialog(dialog){if(dialog.open)return;dialogFocus.set(dialog,document.activeElement);dialog.showModal();document.body.classList.add('modal-open');}
async function closeDialog(dialog){
 if(!dialog.open||dialog.dataset.closing)return;
 dialog.dataset.closing='true';
 if(!reduced.matches){await dialog.animate([{opacity:1},{opacity:0}],{duration:140}).finished.catch(()=>{});}
 dialog.close();delete dialog.dataset.closing;
}
$$('dialog').forEach(dialog=>{
 dialog.addEventListener('close',()=>{document.body.classList.toggle('modal-open',!!$('dialog[open]'));dialogFocus.get(dialog)?.focus({preventScroll:true});});
 dialog.addEventListener('cancel',e=>{e.preventDefault();closeDialog(dialog);});
 dialog.querySelector('[data-close]').addEventListener('click',()=>closeDialog(dialog));
 dialog.addEventListener('click',e=>{if(e.target===dialog && dialog.id!=='lightbox' && dialog.id!=='mobile-menu'){const r=dialog.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)closeDialog(dialog);}});
});
// Native modal dialogs provide focus containment and Escape handling.
$$('[data-contact]').forEach(b=>b.addEventListener('click',()=>openDialog($('#contact-modal'))));
const menu=$('#mobile-menu'),menuButton=$('.menu-toggle');
menuButton.addEventListener('click',()=>{menuButton.setAttribute('aria-expanded','true');openDialog(menu);});
menu.addEventListener('close',()=>menuButton.setAttribute('aria-expanded','false'));
menu.querySelectorAll('a').forEach(a=>a.addEventListener('click',()=>closeDialog(menu)));
new ResizeObserver(()=>{if(innerWidth>700&&menu.open)closeDialog(menu);}).observe(document.documentElement);
const sentinel=document.createElement('div');sentinel.style.cssText='position:absolute;top:40px;width:1px;height:1px;pointer-events:none';document.body.prepend(sentinel);
new IntersectionObserver(([e])=>$('#header').classList.toggle('scrolled',!e.isIntersecting)).observe(sentinel);

let activePhotos=portfolioData, photoIndex=0;
let photoRequest=0;
async function renderPhoto(){
 const request=++photoRequest,p=activePhotos[photoIndex],img=$('#lightbox-image'),status=$('#photo-status');
 img.style.opacity='0';status.textContent='Carregando fotografia…';
 $('#photo-counter').textContent=`${String(photoIndex+1).padStart(2,'0')} / ${String(activePhotos.length).padStart(2,'0')}`;
 $('#photo-caption').textContent=p.alt;
 const loaded=new Image();loaded.src=p.image;
 try{await loaded.decode();}catch{if(request===photoRequest)status.textContent='Não foi possível carregar a fotografia. Tente a próxima imagem.';return;}
 if(request!==photoRequest)return;
 img.src=p.image;img.alt=p.alt;img.style.opacity='1';status.textContent='';
 if(!reduced.matches)img.animate([{opacity:0,transform:'scale(.99)'},{opacity:1,transform:'scale(1)'}],{duration:220});
 if(activePhotos.length>1&&!navigator.connection?.saveData){const next=new Image();next.src=activePhotos[(photoIndex+1)%activePhotos.length].image;}
}
function showPhoto(id,collection=portfolioData){if(!collection.length)return;activePhotos=collection;photoIndex=Math.max(0,collection.findIndex(p=>p.id===id));renderPhoto();openDialog($('#lightbox'));}
$('#lightbox').addEventListener('close',()=>{photoRequest++;});
function nextPhoto(step){photoIndex=(photoIndex+step+activePhotos.length)%activePhotos.length;renderPhoto();}
$$('[data-photo]').forEach(b=>b.addEventListener('click',()=>showPhoto(Number(b.dataset.photo))));
$('[data-next]').addEventListener('click',()=>nextPhoto(1));$('[data-previous]').addEventListener('click',()=>nextPhoto(-1));
$('#lightbox').addEventListener('keydown',e=>{if(e.key==='ArrowRight'){e.preventDefault();nextPhoto(1)}if(e.key==='ArrowLeft'){e.preventDefault();nextPhoto(-1)}});
let touchX=0,touchY=0,swiping=false;
$('.lightbox-frame').addEventListener('touchstart',e=>{swiping=e.touches.length===1;touchX=e.changedTouches[0].clientX;touchY=e.changedTouches[0].clientY;},{passive:true});
$('.lightbox-frame').addEventListener('touchcancel',()=>{swiping=false;},{passive:true});
$('.lightbox-frame').addEventListener('touchend',e=>{const x=e.changedTouches[0].clientX-touchX,y=e.changedTouches[0].clientY-touchY;if(swiping&&Math.abs(x)>55&&Math.abs(x)>Math.abs(y))nextPhoto(x<0?1:-1);swiping=false;},{passive:true});

let categoryIndex=0;
function selectCategory(index){categoryIndex=index;$$('[data-category]').forEach((b,i)=>{b.classList.toggle('active',i===index);b.setAttribute('aria-pressed',String(i===index));});$$('.category-image').forEach((im,i)=>im.classList.toggle('active',i===index));}
$$('[data-category]').forEach(b=>{const choose=()=>selectCategory(Number(b.dataset.category));b.addEventListener('click',choose);b.addEventListener('focus',choose);b.addEventListener('pointerenter',e=>{if(e.pointerType==='mouse')choose();});});
$('[data-explore]').addEventListener('click',()=>{const names=['Shows','Eventos','Conteúdo','Fotografia'],collection=portfolioData.filter(p=>p.category===names[categoryIndex]);showPhoto(collection[0].id,collection);});
$('.motion-toggle').addEventListener('click',e=>{const paused=$('.filmstrip').classList.toggle('paused');e.currentTarget.setAttribute('aria-pressed',String(paused));e.currentTarget.textContent=paused?'Retomar movimento':'Pausar movimento';});

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
