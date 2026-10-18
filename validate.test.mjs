import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,existsSync,readdirSync} from 'node:fs';
import {portfolioData} from './dist/data.js';
import * as C from './dist/components.js';

const sections=['Header','Hero','Manifesto','PortfolioGallery','HorizontalGallery','BehindTheScenes','CategoriesExperience','FilmStrip','About','MobileFilmmaking','ContactCTA','Footer','Lightbox','ContactModal'];
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
