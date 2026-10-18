import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,existsSync,readdirSync} from 'node:fs';
import {portfolioData,contactConfig,whatsappUrl} from './dist/data.js';
import * as C from './dist/components.js';

const sections=['Header','Hero','Manifesto','PortfolioGallery','HorizontalGallery','BehindTheScenes','CategoriesExperience','FilmStrip','About','MobileFilmmaking','ContactCTA','FloatingWhatsApp','Footer','Lightbox','ContactModal'];
const markup=sections.map(name=>C[name]()).join('');
test('All photographs and responsive candidates have accurate intrinsic widths',()=>{
 assert.equal(new Set(portfolioData.map(p=>p.id)).size,portfolioData.length);
 for(const p of portfolioData){
  for(const [file,width,height] of [[p.image,p.width,p.height],[p.thumbnail,p.thumbnailWidth]]){
   const data=readFileSync(new URL(`./dist/${file}`,import.meta.url));
   assert.equal(data.toString('ascii',12,16),'VP8 ');
   assert.equal(data.readUInt16LE(26)&16383,width,file);
   if(height)assert.equal(data.readUInt16LE(28)&16383,height,file);
  }
 }
});
test('Rendered sections have valid anchors, unique IDs and existing local assets',()=>{
 const ids=[...markup.matchAll(/\bid="([^"]+)"/g)].map(m=>m[1]);
 assert.equal(ids.length,new Set(ids).size);
 for(const [,anchor] of markup.matchAll(/href="#([^"]*)"/g))assert.ok(anchor&&ids.includes(anchor),anchor);
 for(const [,src] of markup.matchAll(/\bsrc="([^"]+)"/g))assert.ok(existsSync(new URL(`./dist/${src}`,import.meta.url)),src);
 for(const [,id] of markup.matchAll(/data-photo="(\d+)"/g))assert.ok(portfolioData.some(p=>p.id===Number(id)));
 assert.equal((markup.match(/<h1>/g)||[]).length,1);
});
test('Every image file belongs to the gallery data, including dynamically opened photos',()=>{
 const referenced=new Set(portfolioData.flatMap(p=>[p.image.split('/').pop(),p.thumbnail.split('/').pop()]));
 for(const file of readdirSync(new URL('./dist/images/',import.meta.url)))assert.ok(referenced.has(file),file);
});
test('Hero is prioritized while category backgrounds declare full viewport sizing',()=>{
 assert.match(C.Hero(),/loading="eager" fetchpriority="high"/);
 assert.equal((C.CategoriesExperience().match(/sizes="100vw"/g)||[]).length,4);
 assert.match(C.photo(16),/344w/);
 assert.match(C.photo(17),/364w/);
});

test('Interface icons use accessible inline vectors instead of Unicode glyphs',()=>{
 assert.doesNotMatch(markup,/[\u2190-\u21ff\u25b6\u2715\u260e\u00d7\ufe0f\u{1f300}-\u{1faff}]/u);
 for(const [,svg] of markup.matchAll(/(<svg\b[^>]*>)/g)){
  assert.match(svg,/viewBox="0 0 24 24"/);
  assert.match(svg,/stroke="currentColor"/);
  assert.match(svg,/aria-hidden="true"/);
  assert.match(svg,/focusable="false"/);
 }
 assert.match(C.Lightbox(),/icon-left/);assert.match(C.Lightbox(),/icon-right/);assert.match(C.Lightbox(),/icon-close/);
 assert.match(C.Header(),/icon-menu/);assert.match(C.FloatingWhatsApp(),/icon-whatsapp/);
});

test('WhatsApp links retain the supplied recipient and encode the message exactly',()=>{
 for(const section of [C.ContactCTA(),C.FloatingWhatsApp(),C.ContactModal()]){
  const [,href]=section.match(/href="(https:\/\/wa\.me\/[^\"]+)"/);
  const url=new URL(href);assert.equal(url.pathname,'/5573981839889');
  assert.equal(url.searchParams.get('text'),contactConfig.message);
  assert.match(section,/target="_blank" rel="noopener noreferrer"/);
 }
 const message='Olá, Pedro! Projeto & fotografia\nData: a combinar?';
 assert.equal(new URL(whatsappUrl(message)).searchParams.get('text'),message);
});
