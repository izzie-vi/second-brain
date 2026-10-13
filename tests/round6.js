// Round 6: one-line phone menu, dark mode, repeating tasks and dates, week goals,
// Pick for me, did-not-finish reason, reading stats, On this day. Local mode, clock fixed on a Monday.
const {chromium}=require('/opt/node-tools/node_modules/playwright');
const http=require('http'),fs=require('fs'),path=require('path');
const ROOT=path.join(__dirname,'../app'),OUT=process.argv[2]||'/tmp/shots6';fs.mkdirSync(OUT,{recursive:true});
const types={'.html':'text/html','.js':'text/javascript','.css':'text/css','.png':'image/png'};
const srv=http.createServer((q,r)=>{let p=decodeURIComponent(q.url.split('?')[0]);if(p.endsWith('/'))p+='index.html';const f=path.join(ROOT,p);if(!fs.existsSync(f)){r.writeHead(404);return r.end()}r.writeHead(200,{'content-type':types[path.extname(f)]||'application/octet-stream'});fs.createReadStream(f).pipe(r)}).listen(8767);
const fail=m=>{console.error('FAIL',m);process.exitCode=1};
const shot=(p,n,full=true)=>p.screenshot({path:`${OUT}/${n}.png`,fullPage:full});
const at=async(p,day,h='08:00')=>{await p.clock.setFixedTime(new Date(`${day}T${h}:00`));await p.evaluate(()=>render())};
(async()=>{
  const browser=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome'});
  const ctx=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true,deviceScaleFactor:2});
  await ctx.route(/openlibrary/,r=>r.fulfill({json:{docs:[]}}));
  await ctx.route(/config\.js$/,r=>r.fulfill({body:'window.SB_CONFIG={}',contentType:'text/javascript'}));
  const P=await ctx.newPage();
  P.on('pageerror',e=>fail('page error: '+e.message));
  P.on('console',m=>{if(m.type()==='error'&&!/Failed to load resource/.test(m.text()))fail('console: '+m.text())});
  await P.clock.setFixedTime(new Date('2026-10-12T08:00:00'));   // a Monday
  await P.goto('http://localhost:8767/');await P.waitForSelector('#main .hello');

  /* phone menu on one line */
  for(const w of [390,360]){await P.setViewportSize({width:w,height:800});
    const r=await P.evaluate(()=>{const bs=[...document.querySelectorAll('#nav button')];const n=document.getElementById('nav');return {tops:new Set(bs.map(b=>Math.round(b.getBoundingClientRect().top))).size,over:n.scrollWidth-n.clientWidth}});
    if(r.tops!==1||r.over>1)fail(`menu not on one line at ${w}px: ${JSON.stringify(r)}`)}
  await P.setViewportSize({width:390,height:844});

  /* repeating task: every Monday */
  await P.click('nav [data-go="days"]');await P.click('[data-new="repeat"]');
  await P.fill('.modal [name=t]','Water the plants');
  if(!(await P.isChecked('.modal [name=wd][value="0"]')))fail('today\'s weekday should start ticked');
  await P.click('.modal .btn.solid');
  const picked=()=>P.evaluate(()=>D.tasks.filter(t=>t.pick===TODAY).map(t=>t.t+(t.done?'✓':'')).join());
  if(await picked()!=='Water the plants')fail('repeating task not picked today: '+await picked());
  if(!(await P.textContent('#main')).includes('Mon'))fail('repeat rule not shown');
  await at(P,'2026-10-13');if(await P.evaluate(()=>D.tasks.some(t=>t.from)))fail('unfinished repeating task should go away the next day');
  await at(P,'2026-10-19');if(await picked()!=='Water the plants')fail('not back next Monday');
  await P.evaluate(()=>render());
  await P.click('nav [data-go="home"]');await P.click('.tiles [data-done]');await P.waitForTimeout(400);
  await at(P,'2026-10-20');if(!(await P.evaluate(()=>D.tasks.some(t=>t.from&&t.done==='2026-10-19'))))fail('done repeating task should stay in the done list');
  // every 2 weeks, and monthly on the 31st, checked straight on the rules
  const due=await P.evaluate(()=>{const r2={kind:'week',days:[0],every:2,start:'2026-10-12'},m={kind:'month',md:31,start:'2026-10-01'};
    return [dueOn(r2,'2026-10-12'),dueOn(r2,'2026-10-19'),dueOn(r2,'2026-10-26'),dueOn(m,'2026-10-31'),dueOn(m,'2026-11-30'),dueOn(m,'2026-11-29'),dueOn(m,'2027-02-28')].join()});
  if(due!=='true,false,true,true,true,false,true')fail('repeat rules wrong: '+due);
  // the same repeating task made on two devices has one id
  const ids=await P.evaluate(()=>{D.repeats[0].made='';makeRepeats();return D.tasks.filter(t=>t.from&&t.pick===TODAY).length});
  if(ids>1)fail('repeating task made twice');

  /* repeating dates */
  await at(P,'2026-10-12');
  await P.click('nav [data-go="days"]');await P.click('[data-new="date"]');
  await P.fill('.modal [name=t]','Mum\'s birthday');await P.fill('.modal [name=date]','1970-10-10');await P.selectOption('.modal [name=rep]','year');
  if(await P.inputValue('.modal [name=remind]')!=='day')fail('reminder should default to the day before');
  await P.click('.modal .btn.solid');
  await P.click('[data-new="date"]');await P.fill('.modal [name=t]','Rent');await P.fill('.modal [name=date]','2026-01-31');await P.selectOption('.modal [name=rep]','month');await P.click('.modal .btn.solid');
  const dc=await P.$$eval('.dcard',a=>a.map(x=>x.textContent.replace(/\s+/g,' ')));
  if(!dc.some(t=>t.includes('Rent')&&t.includes('31')&&t.includes('October 2026')&&t.includes('every month')))fail('rent next date wrong: '+dc);
  if(!dc.some(t=>t.includes('birthday')&&t.includes('October 2027')&&t.includes('every year')))fail('birthday next date wrong: '+dc);
  if(dc[0].includes('birthday'))fail('dates out of order');
  if(await P.$('[data-remind]'))fail('reminder button should not show without an account');
  await shot(P,'01-days-phone');

  /* week goals in the Monday plan */
  await P.click('nav [data-go="home"]');await P.click('[data-go^="week/"]');await P.waitForSelector('[data-form^="wgoal|"]');
  if(!(await P.textContent('.wrepline')).includes('Water the plants (Mon)'))fail('repeating line missing in the Monday plan');
  await P.fill('[data-form^="wgoal|"] input','Finish chapter 4');await P.press('[data-form^="wgoal|"] input','Enter');
  await P.fill('[data-form^="wgoal|"] input','Two long walks');await P.press('[data-form^="wgoal|"] input','Enter');
  await shot(P,'02-week-phone');
  await P.click('.back');await P.waitForSelector('#main .hello');if((await P.$$('.t-week .wgoal')).length!==2)fail('week goals should show on Monday before Done');
  await P.click('nav [data-go="goals"]');if(!(await P.textContent('.wgsec')).includes('Finish chapter 4'))fail('week goals missing in Goals');
  await P.click('.wgsec [data-go^="week/"]');await P.waitForSelector('[data-wdone]');
  await P.click('[data-wdone]');await P.waitForSelector('.t-note');
  await P.click('.t-note [data-wgdone]');await P.waitForTimeout(400);
  if(!(await P.$('.t-note .wgoal.done')))fail('week goal not ticked on Today');
  await at(P,'2026-10-18');if(!(await P.$('.t-note')))fail('week goals should stay until Sunday');
  await at(P,'2026-10-12');await shot(P,'03-today-phone');

  /* quick add for today, quick reading progress */
  await P.evaluate(()=>{location.hash='#home';render()});
  await P.fill('form[data-form="today"] input','Email Dr Marsh');await P.press('form[data-form="today"] input','Enter');
  if(!(await P.evaluate(()=>D.tasks.some(t=>t.t==='Email Dr Marsh'&&t.pick===TODAY))))fail('quick add should pick the task for today');
  await P.evaluate(()=>{D.books.push({id:'qb',t:'Quick book',a:'',st:'reading',pmode:'pages',pages:300,pg:10,sh:[],fmt:'Paper',tags:[]});render()});
  await P.click('[data-qp="qb"]');await P.fill('.qprog input','42');await P.press('.qprog input','Enter');
  if(await P.evaluate(()=>D.books.find(b=>b.id==='qb').pg)!==42||await P.$('.qprog'))fail('quick progress not saved');
  await P.evaluate(()=>{D.books=D.books.filter(b=>b.id!=='qb');D.tasks=D.tasks.filter(t=>t.t!=='Email Dr Marsh');render()});

  /* month favorites only offer books read that month */
  {const opts=await P.evaluate(()=>{D.books.push({id:'bo1',t:'Oct read',a:'',st:'read',end:'2026-10-03',sh:[],fmt:'Paper'},{id:'bs1',t:'Sept read',a:'',st:'read',end:'2026-09-20',sh:[],fmt:'Paper'});location.hash='#reading';render();return [...document.querySelectorAll('[data-fav="book"] option')].map(o=>o.textContent)});
    if(!opts.includes('Oct read')||opts.includes('Sept read'))fail('October favorites should list only October books: '+opts);
    await P.evaluate(()=>{D.books=D.books.filter(b=>!['bo1','bs1'].includes(b.id));location.hash='#home';render()})}

  /* Pick for me, DNF reason, stats */
  await P.evaluate(()=>{const B=(t,o)=>({id:'pk'+t.length+t[0],t,a:'Someone',st:'want',fmt:'Physical',sh:[],tags:[],grades:{},pages:'',...o});
    D.books.push(B('Short one',{pages:180,tags:['cozy']}),B('Long one',{pages:720,tags:['fantasy']}),B('No pages',{tags:['cozy']}),
      {id:'r1',t:'Circe',a:'Madeline Miller',st:'read',end:'2026-03-04',pages:393,grades:{Enjoyment:5},tags:['myth'],fmt:'Audiobook',sh:[]},
      {id:'r2',t:'Piranesi',a:'Susanna Clarke',st:'read',end:'2026-03-20',pages:245,grades:{Enjoyment:4},tags:['myth','fantasy'],fmt:'Physical',sh:[],times:2},
      {id:'r3',t:'Persuasion',a:'Jane Austen',st:'read',end:'2025-07-01',pages:249,grades:{},tags:[],fmt:'Physical',sh:[]},
      {id:'d1',t:'Ulysses',a:'James Joyce',st:'dnf',fmt:'Physical',sh:[],tags:[],grades:{}});save()});
  await P.click('nav [data-go="reading"]');await P.click('[data-pickme]');await P.waitForSelector('.modal .pickme');
  await P.check('.modal [data-pk="short"]');
  for(let i=0;i<4;i++){if(!(await P.textContent('.modal .pickme b')).includes('Short one'))fail('short filter picked '+await P.textContent('.modal .pickme b'))}
  await P.uncheck('.modal [data-pk="short"]');await P.selectOption('.modal [data-pk="tag"]','fantasy');
  if(!(await P.textContent('.modal .pickme b')).includes('Long one'))fail('tag filter wrong');
  await P.selectOption('.modal [data-pk="tag"]','');
  const seen=new Set();for(let i=0;i<12;i++){seen.add(await P.textContent('.modal .pickme b'));await P.click('[data-pkagain]')}
  if(seen.size<3)fail('Another one does not move through the list: '+[...seen]);
  await P.waitForTimeout(500);await shot(P,'04-pick-phone',false);
  const pk=await P.textContent('.modal .pickme b');await P.click('[data-pkstart]');await P.waitForSelector('.bpage');
  if(await P.evaluate(t=>D.books.find(b=>b.t===t).st,pk)!=='reading')fail('Start reading did not start it');
  await P.evaluate(()=>go('book/d1'));await P.waitForSelector('[data-f="books|d1|why"]');
  await P.fill('[data-f="books|d1|why"]','Too slow for now.');await P.press('[data-f="books|d1|why"]','Tab');
  if(await P.evaluate(()=>byId(D.books,'d1').why)!=='Too slow for now.')fail('DNF reason not saved');
  await P.click('[data-go="reading"]');
  const rs=await P.textContent('.rstats');
  for(const w of ['2','638','pages','4.5','myth','highest rated','Circe','read again'])if(!rs.includes(w))fail('stats missing '+w+': '+rs.slice(0,200));
  if((await P.$$('.mbars > div')).length!==12)fail('month bars missing');
  await P.click('[data-ry="2025"]');if(!(await P.textContent('.rstats')).includes('Persuasion')&&!(await P.textContent('.sec h2:has-text("in reading")')).includes('2025'))fail('year switch');
  await P.click('[data-ry="2026"]');
  await shot(P,'05-reading-stats-phone');

  /* On this day */
  await P.evaluate(()=>{D.days['2025-10-12']={mood:'good',text:'First cold morning. Bought a scarf.'};D.days['2024-10-12']={mood:'low'};save()});
  await P.click('nav [data-go="journal"]');await P.waitForSelector('.otd');
  const otd=await P.textContent('.otd');if(!otd.includes('2025')||!otd.includes('scarf')||!otd.includes('2024'))fail('on this day: '+otd);
  await shot(P,'06-journal-phone');

  /* dark mode: switch, and following the phone */
  await P.click('[data-theme="dark"]');
  if(!(await P.evaluate(()=>document.documentElement.hasAttribute('data-dark'))))fail('dark switch did nothing');
  for(const [r,n] of [['home','07'],['reading','08'],['writing','09'],['days','10'],['goals','11'],['journal','12']]){await P.evaluate(r=>go(r),r);await P.waitForTimeout(350);await shot(P,`${n}-dark-${r}-phone`)}
  await P.evaluate(()=>go('week/2026-10-12'));await P.waitForTimeout(300);await shot(P,'13-dark-week-phone');
  await P.evaluate(()=>go('book/r1'));await P.waitForTimeout(300);await shot(P,'14-dark-book-phone');
  await P.evaluate(()=>go('days'));await P.click('[data-new="date"]');await P.waitForTimeout(500);await shot(P,'15-dark-popup-phone',false);await P.keyboard.press('Escape');
  await P.click('[data-theme="auto"]');await P.emulateMedia({colorScheme:'dark'});await P.waitForTimeout(100);
  if(!(await P.evaluate(()=>document.documentElement.hasAttribute('data-dark'))))fail('auto does not follow the phone setting');
  await P.emulateMedia({colorScheme:'light'});await P.waitForTimeout(100);
  if(await P.evaluate(()=>document.documentElement.hasAttribute('data-dark')))fail('auto stuck on dark');
  await P.reload();await P.waitForSelector('#nav button');
  if(await P.evaluate(()=>D.repeats.length)!==1)fail('repeats not saved');
  if(await P.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1))fail('phone scrolls sideways');

  /* computer, dark */
  await P.click('[data-theme="dark"]');await P.setViewportSize({width:1280,height:900});
  for(const r of ['home','reading','days']){await P.evaluate(r=>go(r),r);await P.waitForTimeout(350);await shot(P,`20-dark-${r}-wide`)}
  await P.click('[data-theme="light"]');
  for(const r of ['home','reading','days']){await P.evaluate(r=>go(r),r);await P.waitForTimeout(350);await shot(P,`21-light-${r}-wide`)}
  await browser.close();srv.close();
  console.log(process.exitCode?'ROUND 6 FAILED':'Round 6 passed');
})().catch(e=>{console.error(e);process.exit(1)});
