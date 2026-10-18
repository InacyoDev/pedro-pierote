// Local browser QA using Chrome and Node's built-in CDP transport; no dependencies.
import {spawn} from 'node:child_process';
import {mkdir,writeFile,mkdtemp,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import assert from 'node:assert/strict';

const output=path.resolve('.qa');
await mkdir(output,{recursive:true});
const profile=await mkdtemp(path.join(tmpdir(),'pedro-browser-qa-'));
const chrome=spawn('C:/Program Files/Google/Chrome/Application/chrome.exe',[
 '--headless=new','--no-first-run','--no-default-browser-check','--remote-debugging-port=0',
 `--user-data-dir=${profile}`,'about:blank'
],{windowsHide:true,stdio:['ignore','ignore','pipe']});
let ws;
const report={widths:[],checks:[],errors:[]};
const reportFile=process.argv.includes('--interactions-only')?'browser-interactions.json':'browser-report.json';
const pause=ms=>new Promise(resolve=>setTimeout(resolve,ms));
try{
 const endpoint=await new Promise((resolve,reject)=>{
  let log='';const timer=setTimeout(()=>reject(new Error('Chrome startup timed out')),15000);
  chrome.stderr.on('data',chunk=>{log+=chunk;const match=log.match(/DevTools listening on (ws:\/\/\S+)/);if(match){clearTimeout(timer);resolve(match[1]);}});
  chrome.on('error',reject);
 });
 ws=new WebSocket(endpoint);
 await new Promise((resolve,reject)=>{ws.addEventListener('open',resolve,{once:true});ws.addEventListener('error',reject,{once:true});});
 let id=0;const pending=new Map();
 ws.addEventListener('message',event=>{
  const msg=JSON.parse(event.data);
  if(msg.id){const request=pending.get(msg.id);pending.delete(msg.id);if(msg.error)request.reject(new Error(JSON.stringify(msg.error)));else request.resolve(msg.result);}
  else if(msg.method==='Runtime.exceptionThrown')report.errors.push(msg.params.exceptionDetails.exception?.description||msg.params.exceptionDetails.text);
  else if(msg.method==='Runtime.consoleAPICalled'&&['error','warning','assert'].includes(msg.params.type))report.errors.push(msg.params.args.map(a=>a.value||a.description).join(' '));
  else if(msg.method==='Log.entryAdded'&&['error','warning'].includes(msg.params.entry.level))report.errors.push(msg.params.entry.text);
  else if(msg.method==='Network.responseReceived'&&msg.params.response.status>=400)report.errors.push(`${msg.params.response.status} ${msg.params.response.url}`);
 });
 const send=(method,params={},sessionId)=>new Promise((resolve,reject)=>{const requestId=++id;pending.set(requestId,{resolve,reject});ws.send(JSON.stringify({id:requestId,method,params,sessionId}));});
 const {targetId}=await send('Target.createTarget',{url:'about:blank'});
 const {sessionId}=await send('Target.attachToTarget',{targetId,flatten:true});
 const call=(method,params={})=>send(method,params,sessionId);
 const evaluate=async expression=>{
  const result=await call('Runtime.evaluate',{expression,awaitPromise:true,returnByValue:true});
  if(result.exceptionDetails)throw new Error(result.exceptionDetails.exception?.description||result.exceptionDetails.text);
  return result.result.value;
 };
 const until=async(expression,timeout=5000)=>{const start=Date.now();while(!await evaluate(expression)){if(Date.now()-start>timeout)throw new Error(`Timed out: ${expression}`);await pause(40);}};
 const click=selector=>evaluate(`document.querySelector(${JSON.stringify(selector)}).click()`);
 const key=async key=>{const windowsVirtualKeyCode={Escape:27,Tab:9,ArrowLeft:37,ArrowRight:39,ArrowUp:38,ArrowDown:40,Home:36,End:35}[key];await call('Input.dispatchKeyEvent',{type:'keyDown',key,code:key,windowsVirtualKeyCode});await call('Input.dispatchKeyEvent',{type:'keyUp',key,code:key,windowsVirtualKeyCode});};
 const viewport=async(width,height=850,mobile=false)=>{
  await call('Emulation.setDeviceMetricsOverride',{width,height,deviceScaleFactor:1,mobile});
  await call('Emulation.setTouchEmulationEnabled',{enabled:mobile,maxTouchPoints:5});
 };
 const visit=async(url='http://127.0.0.1:4174/')=>{await call('Page.navigate',{url});await until('document.readyState === "complete" && !!document.querySelector(".editorial-grid")');};
 const screenshot=async(name,selector)=>{
  await evaluate(`document.querySelector(${JSON.stringify(selector)}).scrollIntoView({block:'start',behavior:'instant'})`);
  await pause(350);
  if(selector!=='.hero')await evaluate(`(()=>{const style=document.createElement('style');style.id='qa-capture';style.textContent='#header,.skip,.whatsapp-float,.cursor{visibility:hidden!important}';document.head.append(style)})()`);
  const clip=await evaluate(`(()=>{const r=document.querySelector(${JSON.stringify(selector)}).getBoundingClientRect();return {x:Math.max(0,r.x+scrollX),y:r.y+scrollY,width:Math.ceil(r.width),height:Math.ceil(r.height),scale:1}})()`);
  const {data}=await call('Page.captureScreenshot',{format:'png',captureBeyondViewport:true,clip});
  await writeFile(path.join(output,`${name}.png`),Buffer.from(data,'base64'));
  await evaluate('document.querySelector("#qa-capture")?.remove()');
 };
 await call('Page.enable');await call('Runtime.enable');await call('Log.enable');await call('Network.enable');
 await call('Page.addScriptToEvaluateOnNewDocument',{source:`window.__introAudit={seen:false,addedAt:null,removedAt:null};new MutationObserver(()=>{const visible=document.documentElement.classList.contains('intro-pending');if(visible){window.__introAudit.seen=true;window.__introAudit.addedAt??=performance.now();}else if(window.__introAudit.seen&&window.__introAudit.removedAt===null)window.__introAudit.removedAt=performance.now();}).observe(document,{attributes:true,subtree:true,attributeFilter:['class']});`});
 await viewport(1440,1000);await visit();await pause(1100);
 const intro=await evaluate('({audit:window.__introAudit,stored:sessionStorage.getItem("pp:intro-seen"),visible:getComputedStyle(document.querySelector(".intro")).display})');
 assert.ok(intro.audit.seen);assert.ok(intro.audit.removedAt-intro.audit.addedAt<=1050,JSON.stringify(intro));assert.equal(intro.stored,'1');assert.equal(intro.visible,'none');
 report.checks.push({intro});
 await visit();await pause(200);assert.equal(await evaluate('window.__introAudit.seen'),false);report.checks.push('Intro does not repeat in the same session');

 await evaluate(`scrollTo({top:document.querySelector('.work-a').getBoundingClientRect().top+scrollY-600,behavior:'instant'})`);await pause(400);
 const cameraBefore=await evaluate('document.querySelector(".work-a .image-window").style.transform');
 await evaluate('scrollBy({top:240,behavior:"instant"})');await pause(250);
 const cameraAfter=await evaluate('document.querySelector(".work-a .image-window").style.transform');
 assert.ok(cameraBefore&&cameraAfter&&cameraBefore!==cameraAfter,JSON.stringify({cameraBefore,cameraAfter}));
 assert.ok(await evaluate('document.querySelector(".work-a").style.getPropertyValue("--editorial-y") !== ""'));
 report.checks.push('Desktop scroll changes camera transform and editorial movement');
 await evaluate(`document.querySelector('.work-a').scrollIntoView({behavior:'instant',block:'center'})`);await pause(300);
 const photoPoint=await evaluate(`(()=>{const r=document.querySelector('.work-a button').getBoundingClientRect();return {x:r.x+r.width/2,y:Math.max(150,Math.min(innerHeight-100,r.y+r.height/2))}})()`);
 await call('Input.dispatchMouseEvent',{type:'mouseMoved',...photoPoint});await pause(120);
 assert.equal(await evaluate('document.querySelector(".cursor").textContent'),'VER');
 assert.equal(await evaluate('document.querySelector(".cursor").hidden'),false);
 await evaluate(`document.querySelector('.categories').scrollIntoView({behavior:'instant',block:'center'})`);await pause(400);
 await until('document.querySelectorAll(".category-image")[2].complete');
 const categoryPoint=await evaluate(`(()=>{const r=document.querySelector('[data-category="2"]').getBoundingClientRect();return {x:r.x+r.width/2,y:r.y+r.height/2}})()`);
 await call('Input.dispatchMouseEvent',{type:'mouseMoved',...categoryPoint});
 await until('document.querySelector("[data-category=\\"2\\"]").getAttribute("aria-pressed") === "true"');
 await pause(180);
 const crossfade=await evaluate('[...document.querySelectorAll(".category-image")].map(el=>Number(getComputedStyle(el).opacity))');
 assert.ok(crossfade[0]>0&&crossfade[0]<1&&crossfade[2]>0&&crossfade[2]<1,JSON.stringify(crossfade));
 await pause(550);assert.equal(await evaluate('getComputedStyle(document.querySelectorAll(".category-image")[2]).opacity'),'1');
 await evaluate(`document.querySelector('.contact-actions').scrollIntoView({block:'center',behavior:'instant'})`);await pause(300);
 const ctaPoint=await evaluate(`(()=>{const r=document.querySelector('.contact-actions .cta').getBoundingClientRect();return {x:r.x+r.width-25,y:r.y+r.height/2}})()`);
 await call('Input.dispatchMouseEvent',{type:'mouseMoved',...ctaPoint});await pause(160);
 assert.ok(await evaluate('parseFloat(document.querySelector(".contact-actions .cta").style.getPropertyValue("--magnet-x")) > 0'));
 report.checks.push('Preview cursor, hover zoom, category crossfade and magnetic CTA');

 for(const width of (process.argv.includes('--interactions-only')?[]:[1440,1024,768,375,390,414,430])){
  await viewport(width,width<701?850:1000,width<701);
  const height=await evaluate('document.documentElement.scrollHeight');
  for(let top=0;top<height;top+=600){await evaluate(`scrollTo({top:${top},behavior:'instant'})`);await pause(70);}
  await pause(650);
  const result=await evaluate(`({width:innerWidth,client:document.documentElement.clientWidth,scroll:document.documentElement.scrollWidth,broken:[...document.images].filter(i=>i.getAttribute('src')&&(!i.complete||!i.naturalWidth)).map(i=>i.getAttribute('src')),overflow:[...document.querySelectorAll('main section,header,footer,.editorial-grid,.category-content,.mobile-film-images,.hero-copy,.hero-actions')].filter(el=>{const r=el.getBoundingClientRect();return r.left < -1 || r.right > innerWidth+1 || (getComputedStyle(el).overflowX==='visible'&&el.scrollWidth>el.clientWidth+1)}).map(el=>el.className||el.id)})`);
  assert.ok(result.scroll<=result.client,JSON.stringify(result));assert.deepEqual(result.broken,[]);assert.deepEqual(result.overflow,[],JSON.stringify(result));
  report.widths.push(result);
  const icons=await evaluate(`({glyphs:[...document.querySelectorAll('a,button')].filter(el=>/[\\u2190-\\u21ff\\u25b6\\u2715\\u260e\\u00d7\\ufe0f\\u{1f300}-\\u{1faff}]/u.test(el.textContent)).map(el=>el.textContent),invalid:[...document.querySelectorAll('svg.icon')].filter(el=>{const r=el.getBoundingClientRect();return r.width>0&&(r.width<12||r.height<12||Math.abs(r.width-r.height)>.5)}).map(el=>el.getAttribute('class'))})`);
  assert.deepEqual(icons,{glyphs:[],invalid:[]});
  if(width<701)assert.equal(await evaluate('document.querySelector(".work-a .image-window").style.transform'),'');
  if(width===1440||width===390){await screenshot(`${width}-hero`,'.hero');await screenshot(`${width}-gallery`,'.portfolio');await screenshot(`${width}-about`,'.about');await screenshot(`${width}-mobile-film`,'.mobile-film');await screenshot(`${width}-categories`,'.categories');await screenshot(`${width}-contact`,'.contact');}
 }

 await viewport(390,844,true);
 await evaluate(`document.querySelector('.work-a button').focus()`);await click('.work-a button');
 await until('document.querySelector(".lightbox-frame").getAttribute("aria-busy") === "false"');
 assert.equal(await evaluate('document.querySelector("#photo-counter").textContent'),'01 / 06');
 await key('ArrowLeft');await until('document.querySelector("#photo-counter").textContent === "06 / 06"');
 await key('Home');await key('ArrowRight');await until('document.querySelector("#photo-counter").textContent === "02 / 06"');
 await until('document.querySelector(".lightbox-frame").getAttribute("aria-busy") === "false"');
 await pause(350);await screenshot('390-lightbox','#lightbox');
 assert.ok(await evaluate('document.querySelector("#lightbox").scrollWidth <= document.querySelector("#lightbox").clientWidth'));
 await call('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:310,y:400}]});
 await call('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:70,y:400}]});
 await call('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
 await until('document.querySelector("#photo-counter").textContent === "03 / 06"');
 for(let i=0;i<5;i++){await key('Tab');assert.ok(await evaluate('document.activeElement.closest("#lightbox") !== null'));}
 await evaluate('for(let i=0;i<8;i++)document.querySelector("[data-next]").click()');
 await until('document.querySelector(".lightbox-frame").getAttribute("aria-busy") === "false"');
 assert.equal(await evaluate('document.querySelector("#photo-counter").textContent'),'05 / 06');
 assert.ok(await evaluate('document.querySelector("#lightbox-image").src.endsWith("18.webp")'));
 await key('Escape');await until('!document.querySelector("#lightbox").open');
 assert.equal(await evaluate('document.activeElement.closest(".work-a") !== null'),true);
 report.checks.push('Gallery collection, keyboard wrap, Home, swipe, focus containment, rapid navigation, Escape and focus restoration');

 await evaluate(`document.querySelector('[data-category="0"]').focus()`);await key('End');
 assert.equal(await evaluate('document.querySelector("[data-category=\\"3\\"]").getAttribute("aria-pressed")'),'true');
 await click('[data-explore]');await until('document.querySelector(".lightbox-frame").getAttribute("aria-busy") === "false"');
 assert.equal(await evaluate('document.querySelector("#photo-counter").textContent'),'01 / 02');
 await key('Escape');await until('!document.querySelector("#lightbox").open');
 await click('[data-category="1"]');await click('[data-explore]');
 await until('document.querySelector(".lightbox-frame").getAttribute("aria-busy") === "false"');
 assert.equal(await evaluate('document.querySelector("[data-next]").disabled'),true);
 await key('Escape');await until('!document.querySelector("#lightbox").open');report.checks.push('Category keyboard navigation, filtered photos, single-photo controls');

 await evaluate(`scrollTo({top:0,behavior:'instant'})`);await click('.menu-toggle');
 assert.equal(await evaluate('document.querySelector(".menu-toggle").getAttribute("aria-expanded")'),'true');
 await click('#mobile-menu a[href="#sobre"]');await until('!document.querySelector("#mobile-menu").open');await pause(800);
 assert.equal(await evaluate('document.activeElement.id'),'sobre');
 assert.equal(await evaluate('document.body.classList.contains("modal-open")'),false);report.checks.push('Mobile menu anchor navigation and scroll unlock');

 await evaluate(`document.querySelector('.stage-window').scrollLeft=0`);await pause(100);
 assert.equal(await evaluate('document.querySelector("[data-stage=\\"-1\\"]").disabled'),true);
 await click('[data-stage="1"]');await pause(700);assert.ok(await evaluate('document.querySelector(".stage-window").scrollLeft>100'));
 await evaluate(`document.querySelector('.stage-window').scrollLeft=99999`);await pause(150);
 assert.equal(await evaluate('document.querySelector("[data-stage=\\"1\\"]").disabled'),true);report.checks.push('Carousel arrows and end boundaries');

 await click('.hero [data-contact]');await evaluate(`document.querySelector('[name="nome"]').value='Teste local';document.querySelector('[name="tipo"]').value='Show';document.querySelector('[name="mensagem"]').value='Verificação local do formulário.';document.querySelector('#contact-form').requestSubmit()`);
 assert.equal(await evaluate('document.querySelector("#contact-result").hidden'),false);
 assert.ok(await evaluate('document.querySelector("#message-preview").value.includes("Teste local")'));
 assert.ok(await evaluate('document.querySelector("#send-message").href.startsWith("https://wa.me/5573981839889?text=")'));
 assert.ok(await evaluate('new URL(document.querySelector("#send-message").href).searchParams.get("text").includes("Teste local")'));
 assert.ok(await evaluate('document.querySelector("#contact-modal").scrollWidth <= document.querySelector("#contact-modal").clientWidth'));
 await key('Escape');await until('!document.querySelector("#contact-modal").open');report.checks.push('Contact form prepares a correctly encoded WhatsApp message');

 const links=await evaluate(`[...document.querySelectorAll('[data-whatsapp]')].map(el=>({phone:new URL(el.href).pathname,message:new URL(el.href).searchParams.get('text'),target:el.target,rel:el.rel,svg:!!el.querySelector('.icon-whatsapp')}))`);
 assert.equal(links.length,2);for(const link of links){assert.equal(link.phone,'/5573981839889');assert.equal(link.message,'Olá, Pedro! Vi seu portfólio e gostaria de conversar sobre um projeto audiovisual.');assert.equal(link.target,'_blank');assert.equal(link.svg,true);assert.ok(link.rel.includes('noopener'));}
 await evaluate(`document.querySelector('#sobre').scrollIntoView({behavior:'instant'})`);await pause(350);
 assert.ok(await evaluate('document.querySelector(".whatsapp-float").classList.contains("is-visible")'));
 const floating=await evaluate(`(()=>{const r=document.querySelector('.whatsapp-float').getBoundingClientRect();return {width:r.width,height:r.height,bottom:innerHeight-r.bottom,right:innerWidth-r.right}})()`);
 assert.ok(floating.width>=48&&floating.height>=48&&floating.bottom>=20&&floating.right>=16,JSON.stringify(floating));
 await evaluate(`document.querySelector('.contact-actions').scrollIntoView({behavior:'instant',block:'center'})`);await pause(350);
 assert.equal(await evaluate('document.querySelector(".whatsapp-float").classList.contains("is-visible")'),false);
 report.checks.push('Final and floating WhatsApp links, vector icons, touch sizes and safe spacing');

 await call('Emulation.setEmulatedMedia',{features:[{name:'prefers-reduced-motion',value:'reduce'}]});
 await evaluate('sessionStorage.clear()');await visit();
 assert.equal(await evaluate('window.__introAudit.seen'),false);
 assert.equal(await evaluate('document.documentElement.classList.contains("js-motion")'),false);
 assert.equal(await evaluate('getComputedStyle(document.querySelector(".marquee")).animationName'),'none');
 assert.equal(await evaluate('document.querySelector(".work-a .image-window").style.transform'),'');
 assert.equal(await evaluate('getComputedStyle(document.querySelector(".credit-text")).opacity'),'1');
 report.checks.push('Reduced motion suppresses intro and motion');
 await visit(pathToFileURL(path.resolve('ABRIR-PORTFOLIO.html')).href);
 assert.ok(await evaluate('document.querySelector(".contact-actions [data-whatsapp]").href.startsWith("https://wa.me/5573981839889")'));
 await click('.work-a button');await until('document.querySelector(".lightbox-frame").getAttribute("aria-busy") === "false"');
 assert.ok(await evaluate('document.querySelector("#lightbox-image").naturalWidth > 0'));
 assert.equal(await evaluate('document.querySelector("#photo-counter").textContent'),'01 / 06');
 report.checks.push('Portable HTML opens from disk with working SVGs, WhatsApp and lightbox');
 assert.deepEqual(report.errors,[]);
 await writeFile(path.join(output,reportFile),JSON.stringify(report,null,2));
 console.log(JSON.stringify(report,null,2));
 await send('Browser.close');
}finally{
 await writeFile(path.join(output,reportFile),JSON.stringify(report,null,2));
 ws?.close();
 chrome.kill();
 await pause(300);
 // Remove only this test's unique temporary profile.
 if(profile.startsWith(path.join(tmpdir(),'pedro-browser-qa-')))await rm(profile,{recursive:true,force:true,maxRetries:5,retryDelay:200}).catch(()=>{});
}
