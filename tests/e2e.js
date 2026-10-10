const {chromium}=require('/opt/node-tools/node_modules/playwright');
const http=require('http'),fs=require('fs'),path=require('path');
const ROOT=path.join(__dirname,'../app'),OUT=process.argv[2]||'/tmp/shots';fs.mkdirSync(OUT,{recursive:true});
const types={'.html':'text/html','.js':'text/javascript','.css':'text/css','.png':'image/png','.webmanifest':'application/manifest+json'};
const srv=http.createServer((q,r)=>{let p=decodeURIComponent(q.url.split('?')[0]);if(p.endsWith('/'))p+='index.html';const f=path.join(ROOT,p);if(!fs.existsSync(f)){r.writeHead(404);return r.end()}r.writeHead(200,{'content-type':types[path.extname(f)]||'application/octet-stream'});fs.createReadStream(f).pipe(r)}).listen(8765);
const URL='http://localhost:8765/';
const fail=m=>{console.error('FAIL',m);process.exitCode=1};
const db={};const pages=[];
const COVER=fs.readFileSync(path.join(ROOT,'icons/icon-192.png'));
async function device(browser,name,{sync,mobile}){
  const ctx=await browser.newContext(mobile?{viewport:{width:390,height:844},isMobile:true,hasTouch:true,deviceScaleFactor:2}:{viewport:{width:1280,height:900}});
  const page=await ctx.newPage();page._name=name;
  page.on('pageerror',e=>fail(name+' page error: '+e.message));
  page.on('console',m=>{if(m.type()==='error'&&!/fonts|Failed to load resource/.test(m.text()))fail(name+' console: '+m.text())});
  await ctx.route(/fonts\.(googleapis|gstatic)\.com/,r=>r.fulfill({status:200,body:'',contentType:'text/css'}));
  await ctx.route(/openlibrary\.org\/search\.json/,r=>{const q=new globalThis.URL(r.request().url()).searchParams.get('q');r.fulfill({json:{docs:[{title:q.includes('Eden')?'East of Eden':'Piranesi',author_name:[q.includes('Eden')?'John Steinbeck':'Susanna Clarke'],cover_i:123,number_of_pages_median:601,first_publish_year:1952}]}})});
  await ctx.route(/covers\.openlibrary\.org/,r=>r.fulfill({body:COVER,contentType:'image/png'}));
  if(!sync)await ctx.route(/config\.js$/,r=>r.fulfill({body:'window.SB_CONFIG={}',contentType:'text/javascript'}));
  if(sync){
    await ctx.route(/config\.js$/,r=>r.fulfill({body:"window.SB_CONFIG={url:'https://x.supabase.co',key:'anon'}",contentType:'text/javascript'}));
    await ctx.route(/vendor\/supabase\.js$/,r=>r.fulfill({body:fs.readFileSync(__dirname+'/fake-supabase.js','utf8'),contentType:'text/javascript'}));
    await page.exposeFunction('dbCall',async(op,a)=>{a=JSON.parse(a);
      if(op==='get'){const row=db[a.filters.user_id];return JSON.stringify({data:row?JSON.parse(JSON.stringify(row)):null,error:null})}
      if(op==='insert'){if(db[a.row.user_id])return JSON.stringify({error:{code:'23505'}});db[a.row.user_id]=a.row;notify(page,a.row);return JSON.stringify({error:null})}
      if(op==='update'){const row=db[a.filters.user_id];if(!row||row.rev!==a.filters.rev)return JSON.stringify({data:[],error:null});Object.assign(row,a.row);notify(page,row);return JSON.stringify({data:[{rev:row.rev}],error:null})}
    });
    pages.push(page);
  }
  return page;
}
function notify(from,row){for(const p of pages)if(p!==from)p.evaluate(r=>window.__realtime&&window.__realtime({new:r}),{rev:row.rev}).catch(()=>{})}
const shot=(p,n)=>p.screenshot({path:`${OUT}/${n}.png`,fullPage:true});
const settle=p=>p.waitForTimeout(1600);

(async()=>{
  const browser=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome'});
  /* ---------- local mode, phone ---------- */
  const P=await device(browser,'phone-local',{mobile:true});
  await P.goto(URL);await P.waitForSelector('#main .hello');
  await shot(P,'01-today-empty-phone');
  // Reading: add a book via search
  await P.click('nav [data-go="reading"]');await P.click('[data-new="book"]');
  await P.fill('[data-olq]','East of Eden');await P.waitForSelector('[data-olpick="0"]');await shot(P,'02-add-book-search');
  await P.click('[data-olpick="0"]');await P.selectOption('.modal select[name=st]','reading');await P.click('.modal .btn.solid');
  await P.waitForSelector('.bpage');
  if(!(await P.$('.bpage img.real')))fail('cover not shown after picking search result');
  if(await P.inputValue('[data-f$="|pages"][data-rr]')!=='601')fail('pages not filled from search');
  await P.fill('[data-f$="|pg"]','120');await P.press('[data-f$="|pg"]','Enter');
  await P.click('[data-grade$="|Writing|4"]');await P.click('[data-grade$="|Writing|4"]');
  await P.click('[data-grade$="|Plot|3"]');
  if(!(await P.textContent('.avg')).includes('3.5'))fail('quarter average wrong: '+await P.textContent('.avg'));  // (3.75+3)/2=3.375 -> 3.5
  await shot(P,'03-book-page-phone');
  // book typed by hand gets a cover looked up in the background
  await P.click('[data-go="reading"]');await P.click('[data-new="book"]');await P.fill('.modal [name=t]','Piranesi');await P.fill('.modal [name=a]','Susanna Clarke');await P.click('.modal .btn.solid');
  await P.waitForSelector('.bpage img.real',{timeout:4000}).catch(()=>fail('background cover lookup failed'));
  await P.click('[data-bst$="|read"]');await P.waitForSelector('[data-bst$="|read"][aria-pressed="true"]');await P.click('[data-grade$="|Enjoyment|3"]');await P.waitForSelector('.avg b:text("3.0")');
  await P.click('[data-go="reading"]');await P.waitForSelector('.gbook .stars',{timeout:5000}).catch(()=>{});
  const sw=await P.evaluate(()=>{const s=document.querySelector('.gbook .stars');return s&&[s.getBoundingClientRect().width,s.querySelector('i').getBoundingClientRect().width]});
  if(!sw||Math.abs(sw[1]/sw[0]-0.6)>0.05)fail('shelf stars do not match a 3.0 rating: '+sw);
  // Days
  await P.click('nav [data-go="days"]');
  await P.fill('form[data-form="rhythm"] input','Drink water');await P.press('form[data-form="rhythm"] input','Enter');
  await P.fill('form[data-form="task|now"] input','Return library books');await P.press('form[data-form="task|now"] input','Enter');
  await P.click('[data-pick]');
  await P.click('[data-new="date"]');await P.fill('.modal [name=t]','Dentist');await P.fill('.modal [name=date]','2026-10-20');await P.click('.modal .btn.solid');
  await shot(P,'04-days-phone');
  // Writing
  await P.click('nav [data-go="writing"]');await P.click('[data-new="project"]');await P.fill('.modal [name=t]','The Lighthouse');await P.click('.modal .btn.solid');
  await P.waitForSelector('.ptop');await P.fill('form[data-form^="log|"] input[name=w]','800');await P.click('form[data-form^="log|"] .btn');
  await P.click('[data-newdoc]');await P.waitForSelector('.modal');await P.fill('.modal [name=name]','Scrivener');await P.fill('.modal [name=url]','x-scrivener-item:///Users/izzie/Lighthouse.scriv?id=1');await P.click('.modal .btn.solid');
  if(!(await P.$('[data-opendoc]'))){fail('document link not added');await shot(P,'dbgdoc');console.log(await P.evaluate(()=>JSON.stringify(U.pop?{k:U.pop.kind,proj:U.pop.proj}:null)))}
  await P.click('[data-phase$="|writing"]');await P.fill('[data-f$="|plot"]','70');await P.press('[data-f$="|plot"]','Enter');
  await P.click('[data-go="writing"]');
  if(await P.$('.pins .pin'))fail('new project should start unpinned');
  if(!(await P.textContent('.files')).includes('plot 70%'))fail('plot tag missing');
  await P.click('.files [data-pin]');await P.click('[data-go^="project/"]');
  await shot(P,'05-project-phone');
  // Goals
  await P.click('nav [data-go="goals"]');await P.click('[data-new^="goal"]');await P.fill('.modal [name=t]','Read 20 books');await P.selectOption('.modal [name=kind]','number');await P.fill('.modal [name=target]','20');await P.click('.modal .btn.solid');
  await P.waitForSelector('.gpage');
  if(await P.$('.gbox'))fail('goal settings should be closed until Edit');
  await P.click('[data-split$="|m"]');
  const kidsN=await P.evaluate(()=>D.goals.length);if(kidsN!==1+4+12)fail('split into quarters and months made '+kidsN+' goals');
  if((await P.$$('.sg.sm')).length!==12)fail('months not shown under quarters');
  await P.click('[data-gedit]');if(!(await P.$('.gbox')))fail('Edit did not open settings');
  await shot(P,'06-goal-phone');
  // Today reflects everything, and survives reload
  await P.click('.mark');await P.click('[data-rhb]');
  await P.click('.hello ~ * [data-done], .tiles [data-done]');await P.waitForTimeout(400);
  if(!(await P.$('.tiles .row.done')))fail('ticked pick should stay on Today, struck through');await P.reload();await P.waitForSelector('.hello');
  const today=await P.textContent('#main');
  if(!(await P.$('.tiles .row.done')))fail('ticked pick gone after reload');
  for(const w of ['Return library books','East of Eden','The Lighthouse','Dentist'])if(!today.includes(w))fail('Today missing '+w);
  if(!(await P.$('[data-rhb][aria-pressed="true"]')))fail('rhythm tick not saved');
  await shot(P,'07-today-phone');
  // Goodreads import: this year's reads + currently reading, skipping books already here
  await P.click('nav [data-go="reading"]');await P.click('[data-new="import"]');await P.setInputFiles('.modal [name=file]',path.join(__dirname,'fixtures/goodreads.csv'));await P.click('.modal .btn.solid');
  await P.waitForFunction(()=>/Added/.test(document.querySelector('#toast').textContent)).catch(()=>{});
  const imp=await P.evaluate(()=>D.books.map(b=>b.t));
  for(const t of ['The Hunger Games','Middlemarch'])if(!imp.includes(t))fail('import missed '+t);
  if(imp.includes('Old Book')||imp.includes('Wishlist Book'))fail('import ignored the year filter');
  if(imp.filter(t=>t==='Piranesi').length!==1)fail('import duplicated a book');
  const wide=await P.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1);if(wide)fail('phone page scrolls sideways');
  // Journal: mood, headache and a few lines from Today, for today and yesterday
  await P.click('nav [data-go="home"]');
  await P.click('[data-mood$="|good"]');await P.click('[data-head$="|light"]');
  await P.fill('.jline','Rain all day. Good book.');
  await P.click('[data-jo="1"]');await P.click('[data-head$="|medium"]');await P.click('[data-jo="0"]');
  const jd=await P.evaluate(()=>[D.days[TODAY],D.days[off(-1)]]);
  if(!jd[0]||jd[0].mood!=='good'||jd[0].head!=='light'||!/Rain/.test(jd[0].text))fail('today check-in not saved: '+JSON.stringify(jd[0]));
  if(!jd[1]||jd[1].head!=='medium')fail('yesterday headache not saved: '+JSON.stringify(jd[1]));
  await P.click('[data-head$="|light"]');if(await P.evaluate(()=>D.days[TODAY].head))fail('tapping the headache again should clear it');
  await shot(P,'12-today-checkin-phone');
  await P.click('nav [data-go="journal"]');await P.waitForSelector('.cal');
  if(!(await P.$('.cal button.sel .jdot')))fail('written day has no dot in the calendar');
  if(await P.inputValue('.jtext')!=='Rain all day. Good book.')fail('journal panel does not show the entry');
  await P.click('.jwhen [data-go^="entry/"]');await P.waitForSelector('.jfull');await P.fill('.jfull','Rain all day. Good book.\n\nMore here.');
  await P.click('[data-go="journal"]');if(!(await P.inputValue('.jtext')).includes('More here'))fail('full entry not saved');
  await P.waitForTimeout(400);await shot(P,'13-journal-phone');
  // Monday plan: give a task a day, write a note
  await P.evaluate(()=>{D.tasks.push({id:'wk1',t:'Outline chapter 4',when:'soon'});save()});
  await P.evaluate(()=>go('week/'+TODAY));await P.waitForSelector('.lastwk');
  const later=await P.evaluate(()=>{const k=[...document.querySelectorAll('[data-tday^="wk1|"]:not(:disabled)')].pop();k.click();return k.dataset.tday.split('|')[1]});
  const wk=await P.evaluate(()=>{const t=D.tasks.find(x=>x.id==='wk1');return t.pick===TODAY?TODAY:t.day});
  if(wk!==later)fail('task day not saved: '+wk+' vs '+later);
  await P.fill('[data-wnote]','Dentist Thursday.');await P.click('[data-wdone]');await P.waitForSelector('.hello');
  if(!(await P.textContent('#main')).includes('Dentist Thursday.'))fail('week note not on Today');
  // wrap up last month and see the wrapped
  const pm=await P.evaluate(()=>{const pm=ymOff(-1),d=pm+'-12';D.books.push({id:'wb1',t:'The Last Olympian',a:'Rick Riordan',st:'read',end:d,pages:381,grades:{Enjoyment:4},sh:[],tags:[],fmt:'Physical'});
    D.days[d]={mood:'great',head:'light',text:'The library smelled like rain. I stayed until closing.'};D.days[pm+'-13']={mood:'low'};D.tlog[d]=3;save();return pm});
  await P.evaluate(pm=>go('wrap/'+pm),pm);await P.waitForSelector('.wform');
  await P.fill('[data-wq$="|song"]','Seven');await P.press('[data-wq$="|song"]','Tab');await P.fill('[data-wq$="|moment"]','The library until closing');await P.press('[data-wq$="|moment"]','Tab');
  await P.setInputFiles('[data-wpic]',path.join(ROOT,'icons/icon-192.png'));await P.waitForSelector('.wform img.wpic');
  await P.click('[data-wmake]');await P.waitForSelector('.wtitle');
  const wt=await P.textContent('#main');
  for(const w of ['The Last Olympian','Seven','The library until closing','headache day','tasks done'])if(!wt.includes(w))fail('wrapped missing '+w);
  if(!(await P.$('.band img.wpic')))fail('wrapped missing the photo');
  if(await P.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1))fail('wrapped scrolls sideways on the phone');
  await P.waitForTimeout(500);await shot(P,'14-wrapped-phone');
  await P.setViewportSize({width:1280,height:900});await P.evaluate(()=>go('week/'+TODAY));await P.waitForTimeout(500);await shot(P,'15-week-wide');
  await P.evaluate(()=>go('journal'));await P.waitForTimeout(500);await shot(P,'16-journal-wide');
  await P.evaluate(pm=>go('wrapped/'+pm),pm);await P.waitForTimeout(500);await shot(P,'17-wrapped-wide');await P.setViewportSize({width:390,height:844});

  /* ---------- sync: computer + phone ---------- */
  const A=await device(browser,'computer',{sync:true});
  await A.goto(URL);await A.waitForSelector('#gate form');if(await A.isVisible('#app'))fail('app visible before sign-in');await shot(A,'08-sign-in');
  await A.fill('[name=email]','izzie@example.com');await A.fill('[name=password]','wrong-pass');await A.click('#gate .btn.solid');
  await A.waitForSelector('.msg.err');
  await A.fill('[name=password]','secret123');await A.click('#gate .btn.solid');await A.waitForSelector('.hello');
  await A.click('nav [data-go="days"]');await A.fill('form[data-form="task|now"] input','Call grandma');await A.press('form[data-form="task|now"] input','Enter');
  await settle(A);
  if(!db['u-izzie@example.com']||!JSON.stringify(db['u-izzie@example.com'].data).includes('Call grandma'))fail('computer did not upload');
  const B=await device(browser,'phone',{sync:true,mobile:true});
  await B.goto(URL);await B.fill('[name=email]','izzie@example.com');await B.fill('[name=password]','secret123');await B.click('#gate .btn.solid');
  await B.waitForSelector('.hello');if(await B.isVisible('#gate'))fail('gate still visible after sign-in');await B.click('nav [data-go="days"]');
  await B.waitForFunction(()=>document.querySelector('#main').textContent.includes('Call grandma'),null,{timeout:8000}).catch(()=>fail('phone did not get computer data'));
  // live: phone adds, computer sees it without reload
  await B.fill('form[data-form="task|soon"] input','Buy stamps');await B.press('form[data-form="task|soon"] input','Enter');
  await A.waitForFunction(()=>document.querySelector('#main').textContent.includes('Buy stamps'),null,{timeout:8000}).catch(()=>fail('computer did not get live update'));
  // both offline-ish at once: edits made before either syncs are merged
  await A.evaluate(()=>{D.tasks.push({id:'xa',t:'From computer',when:'later'});save()});
  await B.evaluate(()=>{D.tasks.push({id:'xb',t:'From phone',when:'later'});save()});
  await settle(A);await settle(B);await settle(A);
  const names=db['u-izzie@example.com'].data.tasks.map(t=>t.t);
  for(const n of ['Call grandma','Buy stamps','From computer','From phone'])if(!names.includes(n))fail('lost in merge: '+n);
  const aT=await A.evaluate(()=>D.tasks.map(t=>t.t).sort().join()),bT=await B.evaluate(()=>D.tasks.map(t=>t.t).sort().join());
  if(aT!==bT)fail('devices disagree: '+aT+' | '+bT);
  await A.evaluate(()=>render());await shot(A,'09-days-computer-synced');
  const st=await A.textContent('#savenote');if(!/synced/i.test(st))fail('status says '+st);
  // computer screenshots of each room with the phone-made data
  await A.click('nav [data-go="home"]');await shot(A,'10-today-computer');
  // Reading shows only three quotes, and "other quotes" picks different ones
  await A.evaluate(()=>{for(let i=0;i<5;i++)D.quotes.push({id:'qq'+i,book:'',text:'Quote number '+i,page:''});save()});
  await A.click('nav [data-go="reading"]');await A.waitForSelector('[data-qmore]');
  const q1=await A.$$eval('.quotes article blockquote',a=>a.map(x=>x.textContent));if(q1.length!==3)fail('reading shows '+q1.length+' quotes');
  await A.click('[data-qmore]');const q2=await A.$$eval('.quotes article blockquote',a=>a.map(x=>x.textContent));
  if(q2.length!==3||q2.every(x=>q1.includes(x)))fail('other quotes did not change: '+q2);
  await shot(A,'11-reading-quotes');
  await browser.close();srv.close();
  console.log(process.exitCode?'E2E FAILED':'E2E passed');
})().catch(e=>{console.error(e);process.exit(1)});
