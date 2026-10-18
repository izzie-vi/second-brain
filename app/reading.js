/* ================= Reading =================
   Oat & sage. Five small tabs: Now, Library, Challenges, Quotes, Year. Books open as full pages.
   New data: books get `past` (earlier reads), `rr` (this read is a reread) and `log` (dated thoughts);
   D.challenges, D.wheel (ids of To read books on the wheel) and D.sessions (timed reading). */

/* ---------- made-up covers: 16 colors, 3 styles, picked from the title (and "look") so every device agrees ---------- */
const RCOL=[['#C9D8C5','#2E3B2C','#E9EFE4'],['#F1C7B8','#4A2A20','#F9E3DA'],['#BFD0E0','#22334A','#E4ECF4'],['#E8D6A8','#4A3A16','#F5ECCF'],
 ['#D9C7E6','#3E2A52','#EEE5F4'],['#2F4A45','#F2E9D6','#527069'],['#7E4F5E','#FBE8EC','#9C6A79'],['#F4E3C9','#5A3A22','#E5C08E'],
 ['#A9C5C0','#1F3A36','#D3E4E0'],['#3B3F5C','#F3E6CF','#5A5F85'],['#E9A68F','#3E1F16','#F6CDBF'],['#B5C99A','#2C3A1E','#D8E4C6'],
 ['#F2D3DC','#5A2838','#FAE8EE'],['#8FB3C9','#1C2F3D','#C3D8E5'],['#D8B989','#3D2A10','#EBD6B4'],['#5E7A63','#F1EEDF','#7E9C7B']];
const bookCol=b=>RCOL[seedOf(b)%RCOL.length];
function cover(b){
  const h=seedOf(b),[c1,c2,c3]=bookCol(b),st=(h>>4)%3,T=esc(b.t),A=esc((b.a||'').split(' ').pop()),css=`--c1:${c1};--c2:${c2};--c3:${c3}`;
  const inner=st===1?`<div class="ncv ncv1" style="${css}"><div class="band"><div class="ct">${T}</div><div class="ca">${A}</div></div></div>`
    :st===2?`<div class="ncv ncv2" style="${css}"><span class="orn">✦</span><span class="ct">${T}</span><span class="ca">${A}</span></div>`
    :`<div class="ncv ncv0" style="${css}"><span class="ct">${T}</span><span class="ca">${A}</span></div>`;
  return `<div class="cover" aria-hidden="true">${inner}</div>`;
}
const tint=b=>{const [c1,c2]=b?bookCol(b):['#EAE4D8','#2B2A27'];return `--q1:${c1};--q2:${c2}`};

/* books read in a month: finished that month, or open and started by then (plus the one already picked) */
const readIn=(ym,keep)=>D.books.filter(b=>b.id===keep||(b.st==='read'&&(b.end||'').startsWith(ym))||(b.st==='reading'&&(b.start||'').slice(0,7)<=ym));
const timesRead=b=>Math.max(+b.times||0,(b.past||[]).length+(b.st==='read'&&b.end?1:0));
const lastThought=b=>[...(b.log||[])].reverse().find(x=>x.t);
Object.assign(U,{rt:'now',rs:'all',rp:'',bdet:'',pre:60,wspin:0,wland:'',qh:'',qbook:'',chedit:''});

/* ================= the room ================= */
function vReading(){
  const g=D.goals.find(x=>x.kind==='number'&&x.auto&&x.per===Y),n=g?gval(g):0;
  const tabs=[['now','Now'],['lib','Library'],['chal','Challenges'],['quotes','Quotes'],['year','Year']];
  const view={now:rNow,lib:rLib,chal:rChal,quotes:rQuotes,year:rYear}[U.rt]||rNow;
  return `<div class="rd"><section class="rhead"><h1>Reading</h1>
   ${g?`<button class="rcard rgoal" data-go="goals" title="Your reading goal, also in Goals"><span style="display:flex;justify-content:space-between;align-items:baseline;gap:10px"><b>${n} <span class="small" style="font-family:var(--rbody);font-weight:400">of ${g.target} books</span></b><span class="small">${Y}</span></span><span class="rbar"><i style="width:${pct(n,g.target)}%"></i></span></button>`
     :`<button class="btn" data-new="goal|books">Set a reading goal</button>`}</section>
   <nav class="rtabs" role="tablist" aria-label="Reading">${tabs.map(([k,l])=>`<button role="tab" data-rtab="${k}" aria-selected="${U.rt===k}">${l}</button>`).join('')}</nav>
   ${view()}</div>`;
}

/* ---------- Now ---------- */
function rNow(){
  const open=D.books.filter(b=>b.st==='reading'),paused=D.books.filter(b=>b.st==='paused');
  const fv=D.favs[YM]||{},opts=readIn(YM,fv.book);
  const done=D.books.filter(b=>b.st==='read'&&b.end).sort((a,b)=>b.end.localeCompare(a.end)).slice(0,12);
  return `<section class="rsec"><div class="rsh"><h2>Currently reading</h2><div class="racts"><button class="btn" data-wheel>◎ Spin the wheel</button><button class="btn pri" data-new="book">+ Add book</button></div></div>
   ${runBar()}
   <div class="rnow">${open.map(b=>{const pr=progress(b),th=lastThought(b),pg=b.pmode==='pages';return `<article class="rcard rnowc"><button data-go="book/${b.id}" aria-label="Open ${esc(b.t)}">${cover(b)}</button>
    <div class="rcol"><div><span class="bt">${esc(b.t)}</span> ${b.rr?'<span class="rbadge">reread</span>':''}</div><span class="small">${esc(b.a)}${b.start?' · since '+nice(b.start):''}</span>
     ${pr!==null?`<span class="rbar"><i style="width:${pr}%"></i></span><span class="small" style="display:flex;justify-content:space-between"><span>${b.pmode==='pct'?'':progTxt(b)}</span><b style="color:var(--ink)">${pr}%</b></span>`:''}
     ${U.rp===b.id?`<form class="rupd" data-form="rprog|${b.id}">${b.pmode==='none'?'':`<input class="rin n" name="v" type="number" inputmode="numeric" min="0" value="${esc(pg?b.pg||'':b.pct||'')}" aria-label="${pg?'Page':'Percent'}" placeholder="${pg?'page':'%'}">`}<input class="rin w" name="t" placeholder="A thought? (optional)" aria-label="A thought"><button class="btn pri">Save</button></form>`
       :`${th?`<p class="rthought">“${esc(th.t)}”</p>`:''}<div class="racts"><button class="btn sm" data-rp="${b.id}">Update progress</button><button class="btn sm" data-sess="${b.id}">▶ Reading session</button></div>`}
    </div></article>`}).join('')||'<p class="rempty">Nothing open. Spin the wheel or start something from your library.</p>'}</div>
   ${paused.length?`<p class="small">Paused: ${paused.map(b=>`<button class="link" data-go="book/${b.id}">${esc(b.t)}</button>`).join(', ')}</p>`:''}</section>
  <section class="rsec"><div class="rsh"><h2>${monthName(YM)} favorites</h2></div>
   <div class="rfavs">
    <label class="rcard rfav"><span class="small">Book of the month</span><select data-fav="book" aria-label="Book of the month"><option value="">Pick one…</option>${opts.map(b=>`<option value="${b.id}" ${fv.book===b.id?'selected':''}>${esc(b.t)}</option>`).join('')}</select></label>
    <label class="rcard rfav"><span class="small">Character</span><input data-fav="character" value="${esc(fv.character||'')}" placeholder="Who stuck with you?"></label>
    <label class="rcard rfav"><span class="small">Line</span><input data-fav="line" value="${esc(fv.line||'')}" placeholder="A line you keep thinking about"></label>
   </div></section>
  ${done.length?`<section class="rsec"><div class="rsh"><h2>Recently finished</h2><button class="btn" data-rtab="lib">See library</button></div>
   <div class="rstrip">${done.map(b=>`<button data-go="book/${b.id}">${cover(b)}<span class="tt">${esc(b.t)}</span>${starsOf(avg(b))}</button>`).join('')}</div></section>`:''}`;
}

/* ---------- Library ---------- */
const RSTAT=[['all','All'],['reading','Reading'],['want','To read'],['read','Read'],['paused','Paused'],['dnf',"Didn't finish"]];
const RF_LABEL={shelf:'shelf',year:'finished',tag:'tag',rate:'rating',fmt:'format',rr:'',sort:'sort'};
function libList(){
  const R=U.rf,q=U.rq.trim().toLowerCase();
  return D.books.filter(b=>(U.rs==='all'||b.st===U.rs)&&(!R.shelf||b.sh.includes(R.shelf))&&(!R.year||(R.year==='none'?!b.end:(b.end||'').startsWith(R.year)))
    &&(!R.tag||(b.tags||[]).includes(R.tag))&&(!R.rate||(R.rate==='none'?!avg(b):avg(b)>=+R.rate))&&(!R.fmt||b.fmt===R.fmt)&&(!R.rr||b.rr||(b.past||[]).length>0)
    &&(!q||(b.t+' '+b.a+' '+(b.tags||[]).join(' ')).toLowerCase().includes(q)))
   .sort(SORTS[R.sort||'recent'][1]);
}
const gbook=b=>`<button class="gbook" data-go="book/${b.id}"><span class="rcw">${cover(b)}${b.rr||(b.past||[]).length?'<span class="rbadge">reread</span>':''}</span><span class="bt">${esc(b.t)}</span><span class="ba">${esc(b.a)}</span>${b.st==='read'?starsOf(avg(b)):`<span class="rst">${ST[b.st][0]}</span>`}</button>`;
function rLib(){
  const lib=libList(),R=U.rf;
  const count=k=>k==='all'?D.books.length:D.books.filter(b=>b.st===k).length;
  const act=Object.keys(R).filter(k=>R[k]&&!(k==='sort'&&R[k]==='recent'));
  const actTxt=k=>k==='rr'?'only rereads':k==='rate'?(R.rate==='none'?'not rated':R.rate+'★ and up'):k==='year'?(R.year==='none'?'no finish date':'finished '+R.year):k==='sort'?'sort: '+SORTS[R.sort][0]:R[k];
  const grid=bs=>`<div class="rgrid">${bs.map(gbook).join('')}</div>`;
  let body;
  if(!lib.length)body='<p class="rempty">No books here yet.</p>';
  else if((R.sort||'recent')!=='recent')body=grid(lib);
  else{
    /* grouped: what you're reading, then finished books by year, then the rest */
    const groups=[];const add=(t,bs)=>{if(bs.length)groups.push([t,bs])};
    add('Reading now',lib.filter(b=>b.st==='reading'));
    const read=lib.filter(b=>b.st==='read'),yrs=[...new Set(read.map(b=>(b.end||'').slice(0,4)).filter(Boolean))].sort().reverse();
    yrs.forEach(y=>add(y,read.filter(b=>(b.end||'').startsWith(y))));add('Read, no date',read.filter(b=>!b.end));
    add('To read',lib.filter(b=>b.st==='want'));add('Paused',lib.filter(b=>b.st==='paused'));add("Didn't finish",lib.filter(b=>b.st==='dnf'));
    body=groups.length===1&&U.rs!=='read'?grid(groups[0][1]):groups.map(([t,bs])=>`<div class="rgroup"><h3>${esc(t)}</h3><span class="small">${bs.length} ${bs.length===1?'book':'books'}</span></div>${grid(bs)}`).join('');
  }
  return `<section class="rsec">
   <div class="rsearch"><input type="search" data-rq placeholder="Search your books" value="${esc(U.rq)}" aria-label="Search your books"><button class="btn" data-rfilter>Filter &amp; sort${act.length?` · ${act.length}`:''}</button><button class="btn pri" data-new="book">+ Add book</button></div>
   <div class="rchips" role="group" aria-label="Status">${RSTAT.map(([k,l])=>`<button data-rs="${k}" aria-pressed="${U.rs===k}">${l}<b>${count(k)}</b></button>`).join('')}</div>
   ${act.length||U.rq?`<div class="ractive">${act.map(k=>`<span>${esc(actTxt(k))}<button data-rfx="${k}" aria-label="Remove filter">×</button></span>`).join('')}<button class="link" data-rclr>clear all</button><span class="small" style="background:none">${lib.length} ${lib.length===1?'book':'books'}</span></div>`:''}
   ${body}
   <div class="rfoot"><button class="link" data-new="import">Import from Goodreads</button><button class="link" data-new="shelves">Edit shelves</button></div></section>`;
}
function filterPop(){
  const R=U.rf,years=[...new Set(D.books.map(b=>(b.end||'').slice(0,4)).filter(Boolean))].sort().reverse(),tags=[...new Set(D.books.flatMap(b=>b.tags||[]))].sort();
  const grp=(k,l,opts)=>`<div class="rfg"><span>${l}</span><div class="rchips">${opts.map(([v,t])=>`<button type="button" data-rfc="${k}|${esc(v)}" aria-pressed="${(R[k]||'')===v||(k==='sort'&&!R.sort&&v==='recent')}">${esc(t)}</button>`).join('')}</div></div>`;
  const n=libList().length;
  const inner=`<h2>Filter &amp; sort</h2>
   ${grp('shelf','Shelf',[['','All'],...D.shelves.map(s=>[s,s])])}
   ${years.length?grp('year','Finished in',[['','Any year'],...years.map(y=>[y,y]),['none','No date']]):''}
   ${tags.length?grp('tag','Tag',[['','Any'],...tags.map(t=>[t,t])]):''}
   ${grp('rate','Rating',[['','Any'],['5','5 ★'],['4','4 ★ and up'],['3','3 ★ and up'],['none','Not rated']])}
   ${grp('fmt','Format',[['','Any'],['Physical','Physical'],['Ebook','Ebook'],['Audiobook','Audiobook']])}
   ${grp('rr','Rereads',[['','All books'],['1','Only rereads']])}
   ${grp('sort','Sort',Object.entries(SORTS).map(([k,[l]])=>[k,l[0].toUpperCase()+l.slice(1)]))}
   <div class="racts" style="justify-content:flex-end"><button class="btn" data-rfreset>Clear</button><button class="btn pri" data-close>Show ${n} ${n===1?'book':'books'}</button></div>`;
  layerPop('rfilter','Filter and sort',inner);
}
/* a centered popup for the Reading room; swaps its inside when already open so it doesn't fade in again */
function layerPop(kind,label,inner,noScrim){
  const open=U.pop&&U.pop.kind===kind&&document.querySelector('#layer .modal');
  if(open){open.innerHTML=inner;return}
  U.pop={kind};
  document.getElementById('layer').innerHTML=`<div class="scrim" ${noScrim?'':'data-scrim'}><div class="modal rpop" role="dialog" aria-modal="true" aria-label="${esc(label)}">${inner}</div></div>`;
}

/* ---------- spin the wheel ---------- */
const wheelBooks=()=>D.wheel.map(i=>byId(D.books,i)).filter(b=>b&&b.st==='want');
function wheelSvg(){
  const W=wheelBooks(),n=W.length,a=360/Math.max(n,1),R=150;
  if(n<2)return `<svg viewBox="0 0 300 300" aria-hidden="true"><circle cx="150" cy="150" r="148" fill="#ECE6DB"/></svg>`;
  const pt=d=>{const r=(d-90)*Math.PI/180;return [(150+R*Math.cos(r)).toFixed(2),(150+R*Math.sin(r)).toFixed(2)]};
  return `<svg viewBox="0 0 300 300" aria-hidden="true"><g id="rwg" style="transform:rotate(${U.wspin}deg)">${W.map((b,i)=>{const [x1,y1]=pt(i*a),[x2,y2]=pt((i+1)*a),[c1,c2]=bookCol(b),mid=(i+.5)*a,lab=b.t.length>17?b.t.slice(0,16)+'…':b.t;
    return `<path d="M150 150 L${x1} ${y1} A${R} ${R} 0 ${a>180?1:0} 1 ${x2} ${y2} Z" fill="${c1}" stroke="#FFFFFF" stroke-width="2"/><text transform="rotate(${(mid-90).toFixed(2)} 150 150)" x="${150+R*.9}" y="154" text-anchor="end" font-size="${n>9?9.5:11}" font-family="DM Sans,sans-serif" font-weight="600" fill="${c2}">${esc(lab)}</text>`}).join('')}</g></svg>`;
}
const landHtml=b=>b?`<div class="rland">${cover(b)}<div style="flex:1;min-width:0"><span class="hint" style="text-align:left;display:block">The wheel says</span><b>${esc(b.t)}</b><span class="hint" style="text-align:left;display:block">${esc([b.a,b.pages?b.pages+' pages':''].filter(Boolean).join(' · '))}</span></div><button class="btn pri" data-wstart="${b.id}">Start it</button></div>`:'';
function wheelPop(){
  const want=D.books.filter(b=>b.st==='want').sort((x,y)=>x.t.localeCompare(y.t)),W=wheelBooks();
  const inner=`<h2>Spin the wheel</h2>
   ${want.length<2?`<p class="hint" style="text-align:left">Add at least two books to your To read list, then put them on the wheel here.</p>`
    :`<div class="rwheel"><span class="ptr"></span>${wheelSvg()}${W.length>1?'<button class="hub" data-spin aria-label="Spin">SPIN</button>':''}</div>
     ${W.length<2?'<p class="hint">Pick at least two books below to put on the wheel.</p>':''}
     <div id="rwland">${landHtml(byId(D.books,U.wland))}</div>
     <div class="rfg"><span>On the wheel (${W.length} of up to 12, tap to add or take off)</span><div class="rchips rwchips">${want.map(b=>`<button type="button" data-tw="${b.id}" aria-pressed="${D.wheel.includes(b.id)}">${esc(b.t)}</button>`).join('')}</div></div>`}
   <div class="racts" style="justify-content:center">${W.length>1?'<button class="btn pri" data-spin>Spin</button>':''}<button class="btn" data-close>Close</button></div>`;
  layerPop('wheel','Spin the wheel',inner);
}
let spinning=false;
function spin(){
  const W=wheelBooks();if(spinning||W.length<2)return;spinning=true;
  const n=W.length,a=360/n,k=Math.floor(Math.random()*n),c=(k+.5)*a;
  U.wspin=U.wspin-(U.wspin%360)+360*5+(360-c);U.wland='';
  const g=document.getElementById('rwg'),l=document.getElementById('rwland');if(l)l.innerHTML='';
  if(g)g.style.transform=`rotate(${U.wspin}deg)`;
  const fast=matchMedia('(prefers-reduced-motion: reduce)').matches;
  setTimeout(()=>{spinning=false;U.wland=W[k].id;const el=document.getElementById('rwland');if(el)el.innerHTML=landHtml(W[k])},fast?50:3700);
}

/* ---------- reading sessions ---------- */
const PRE=[[30,'30 minutes','a cozy start','☕'],[60,'1 hour nonstop','no phone, no breaks','🌙'],[120,'2 hour marathon','a weekend treat','📚']];
/* the running session lives on this device only (and survives a reload) */
let RUN=null;try{RUN=JSON.parse(localStorage.getItem('sb-run')||'null')}catch(_){}
const keepRun=()=>{try{RUN?localStorage.setItem('sb-run',JSON.stringify(RUN)):localStorage.removeItem('sb-run')}catch(_){}};
const runSecs=()=>RUN?Math.floor(((RUN.paused?RUN.pAt:Date.now())-RUN.t0-RUN.pMs)/1000):0;
const mmss=s=>`${String(Math.floor(s/60)).padStart(2,'0')}:${String(s%60).padStart(2,'0')}`;
function runBar(){
  if(!RUN)return '';const b=byId(D.books,RUN.book),left=Math.max(0,RUN.min*60-runSecs());
  return `<div class="rrun"><span>${left?`Reading session · <b id="rrunt">${mmss(left)}</b> left`:'Session time is up 🎉'}${b?' · '+esc(b.t):''}</span><button class="btn sm" data-sopen>Open timer</button></div>`;
}
function sessPop(){
  if(!RUN)return;const s=runSecs(),tot=RUN.min*60,left=Math.max(0,tot-s),b=byId(D.books,RUN.book),p=Math.min(100,Math.round(s/tot*100));
  const pre=PRE.find(x=>x[0]===RUN.min)||PRE[0];
  const inner=`<p class="hint">${pre[1]}${b?' · '+esc(b.t):''}</p>
   <div class="rring" id="rring" style="--p:${p}"><div><div class="rtimer" id="rtm">${mmss(left)}</div><span class="hint" id="rtl">${left?(RUN.paused?'paused':'keep going'):'you did it 🎉'}</span></div></div>
   <div class="racts" style="justify-content:center">${left?`<button class="btn" data-spause>${RUN.paused?'Resume':'Pause'}</button>`:''}<button class="btn pri" data-send>${left?'Stop and save':'Done, log pages'}</button></div>
   <div class="racts" style="justify-content:center"><button class="link" data-close>Hide timer</button><button class="link" data-scancel>Cancel session</button></div>
   ${RUN.min===60?'<p class="hint">Pausing means it doesn\'t count as nonstop, but the time still counts.</p>':''}`;
  layerPop('session','Reading session',inner,true);
}
setInterval(()=>{
  if(!RUN||RUN.paused)return;const left=Math.max(0,RUN.min*60-runSecs());
  const t=document.getElementById('rtm');if(t){t.textContent=mmss(left);document.getElementById('rring').style.setProperty('--p',Math.min(100,Math.round(runSecs()/(RUN.min*60)*100)));
    if(!left&&!RUN.rang){RUN.rang=true;keepRun();sessPop()}}
  const bar=document.getElementById('rrunt');if(bar)bar.textContent=mmss(left);
},1000);
function sessSummary(){
  const mine=D.sessions.filter(s=>(s.d||'').startsWith(YM)),mins=Math.round(mine.reduce((m,s)=>m+(+s.secs||0),0)/60);
  return `${mine.length} ${mine.length===1?'session':'sessions'} · ${mins>=60?Math.floor(mins/60)+'h ':''}${mins%60}m this month`;
}
const earned=m=>D.sessions.filter(s=>s.min===m&&s.full&&(m!==60||s.nonstop)).length;

/* ---------- Challenges ---------- */
const STARTER=['Over 500 pages','A classic','Under 200 pages','A reread','A book in translation','A one-word title','Set somewhere you\'ve never been','The oldest book on your To read'];
function seedChallenges(){
  if(D.chSeed)return;D.chSeed=Y;
  /* fixed ids, so the phone and the computer don't both add their own copy */
  if(!byId(D.challenges,'chp'+Y))D.challenges.push({id:'chp'+Y,name:`${Y} reading prompts`,kind:'prompts',prompts:STARTER.map((p,i)=>({id:'p'+Y+i,p,book:''}))});
  if(YM.endsWith('-10')&&!byId(D.challenges,'chs'+YM))D.challenges.push({id:'chs'+YM,name:'Spooky October',kind:'count',goal:3,n:0,note:'Three spooky or gothic reads this month.',prompts:[]});
  save();
}
function rChal(){
  seedChallenges();
  const open=D.books.filter(b=>b.st==='reading');
  const card=c=>{
    const ed=U.chedit===c.id;
    if(c.kind==='prompts'){const n=c.prompts.filter(p=>byId(D.books,p.book)).length;
      return `<article class="rcard rch"><header><h3>${esc(c.name)}</h3><span class="racts"><span class="small">${n} of ${c.prompts.length} done</span><button class="link" data-chedit="${c.id}">${ed?'done':'edit'}</button></span></header><span class="rbar"><i style="width:${pct(n,c.prompts.length)}%"></i></span>
       ${ed?`<div class="redit"><input class="rin" data-chf="${c.id}|name" value="${esc(c.name)}" aria-label="Challenge name">${c.prompts.map(p=>`<div class="row2"><input class="rin" data-chpt="${c.id}|${p.id}" value="${esc(p.p)}" aria-label="Prompt"><button class="x" data-chpdel="${c.id}|${p.id}" aria-label="Remove prompt">×</button></div>`).join('')}
         <form class="row2" data-form="chp|${c.id}"><input class="rin" name="p" placeholder="+ Add a prompt" aria-label="Add a prompt"></form><button class="link danger" style="align-self:flex-start" data-chdel="${c.id}">Delete this challenge</button></div>`
       :`<div class="rprompts">${c.prompts.map(p=>{const b=byId(D.books,p.book);return `<button class="rprompt ${b?'done':''}" data-chp="${c.id}|${p.id}"><span class="ck">${b?'✓':''}</span><span><span class="p" style="display:block">${esc(p.p)}</span><span class="b">${b?esc(b.t):'+ choose a book'}</span></span></button>`}).join('')||'<p class="rempty">No prompts yet. Tap edit to add some.</p>'}</div>`}</article>`}
    const g=Math.max(1,+c.goal||1),n=+c.n||0;
    return `<article class="rcard rch"><header><h3>${esc(c.name)}</h3><span class="racts"><span class="small">${Math.min(n,g)} of ${g}${n>=g?' 🎉':''}</span><button class="link" data-chedit="${c.id}">${ed?'done':'edit'}</button></span></header>
     ${ed?`<div class="redit"><input class="rin" data-chf="${c.id}|name" value="${esc(c.name)}" aria-label="Challenge name"><input class="rin" data-chf="${c.id}|note" value="${esc(c.note||'')}" placeholder="What counts?" aria-label="What counts"><label class="row2 small">Goal <input class="rin n" type="number" min="1" data-chf="${c.id}|goal" value="${g}" aria-label="Goal"></label><button class="link danger" style="align-self:flex-start" data-chdel="${c.id}">Delete this challenge</button></div>`
       :`${c.note?`<p class="small">${esc(c.note)}</p>`:''}<div class="rdots">${Array.from({length:Math.min(g,40)},(_,i)=>`<i class="${i<n?'on':''}"></i>`).join('')}<span class="racts" style="margin-left:auto"><button class="btn sm" data-chn="${c.id}|-1" aria-label="One less">−</button><button class="btn sm" data-chn="${c.id}|1" aria-label="One more">+1</button></span></div>`}</article>`;
  };
  const prompts=D.challenges.filter(c=>c.kind==='prompts'),counts=D.challenges.filter(c=>c.kind!=='prompts');
  return `<section class="rsec"><div class="rsh"><h2>Challenges</h2><div class="racts"><button class="btn" data-wheel>◎ Spin the wheel</button><button class="btn pri" data-newch>+ New challenge</button></div></div>
   ${prompts.map(card).join('')}
   <article class="rcard rch"><header><h3>Reading sessions</h3><span class="small">${sessSummary()}</span></header>
    ${runBar()}
    <div class="rpresets">${PRE.map(([m,l,d])=>`<button class="rpreset" data-pre="${m}" aria-pressed="${U.pre===m}"><b>${l}</b><span class="small">${d}</span></button>`).join('')}</div>
    <div class="racts"><select class="rsel" data-sessbook aria-label="Book for this session"><option value="">No particular book</option>${open.map(b=>`<option value="${b.id}" ${U.sessbook===b.id?'selected':''}>${esc(b.t)}</option>`).join('')}</select><button class="btn pri" data-sess="${U.sessbook||''}" ${RUN?'disabled':''}>▶ Start</button></div>
    <div class="rfg"><span class="small">Earned</span><div class="rearned">${PRE.map(([m,l,,e])=>{const k=earned(m);return k?`<span>${e} ${l} × ${k}</span>`:`<span style="opacity:.55">${l}: not yet</span>`}).join('')}</div></div></article>
   ${counts.length?`<div class="rtwo">${counts.map(card).join('')}</div>`:''}
  </section>`;
}
function newChPop(){
  layerPop('newch','New challenge',`<h2>New challenge</h2><form data-form="newch" style="display:flex;flex-direction:column;gap:12px">
   ${F.text('name','Name','','Summer classics, 5 short books…')}${F.sel('kind','Kind','prompts',[['prompts','A list of prompts to fill with books'],['count','A number of books to reach']])}
   ${two(F.num('goal','Goal (for a number)',5),F.text('note','What counts (optional)','','cozy reads, under 300 pages…'))}
   <div class="racts"><button class="btn pri">Add</button><button type="button" class="btn" data-close>Cancel</button></div></form>`);
}
function promptPop(cid,pid){
  const c=byId(D.challenges,cid),p=c&&byId(c.prompts,pid);if(!p)return;
  const bs=D.books.filter(b=>b.st==='read'||b.st==='reading').sort((x,y)=>(y.end||y.start||'').localeCompare(x.end||x.start||''));
  layerPop('chpick','Choose a book',`<h2>${esc(p.p)}</h2><p class="hint" style="text-align:left">Which book fills this one?</p>
   <div class="rchips rwchips" style="max-height:260px">${bs.map(b=>`<button type="button" data-chset="${cid}|${pid}|${b.id}" aria-pressed="${p.book===b.id}">${esc(b.t)}</button>`).join('')||'<p class="hint">Finish or start a book first.</p>'}</div>
   <div class="racts">${p.book?`<button class="btn" data-chset="${cid}|${pid}|">Clear</button>`:''}<button class="btn" data-close>Close</button></div>`);
}

/* ---------- Quotes ---------- */
function rQuotes(){
  const qs=D.quotes.filter(q=>!U.qbook||q.book===U.qbook);
  if(!byId(qs,U.qh))U.qh=qs.length?qs[Math.floor(Math.random()*qs.length)].id:'';
  const h=byId(qs,U.qh),hb=h&&byId(D.books,h.book);
  const books=D.books.filter(b=>D.quotes.some(q=>q.book===b.id)).sort((x,y)=>x.t.localeCompare(y.t));
  return `<section class="rsec"><div class="rsh"><h2>Quotes</h2><div class="racts">${books.length>1?`<select class="rsel" data-qbook aria-label="Show quotes from"><option value="">All books</option>${books.map(b=>`<option value="${b.id}" ${U.qbook===b.id?'selected':''}>${esc(b.t)}</option>`).join('')}</select>`:''}<button class="btn pri" data-new="quote">+ Add quote</button></div></div>
   ${h?`<article class="rcard rqhero" style="${tint(hb)}"><span class="src">A line you saved</span><blockquote>“${esc(h.text)}”</blockquote>
     <span class="src"><b>${hb?esc(hb.t):''}</b>${h.page?' · p. '+esc(h.page):''}</span>
     <div class="racts">${qs.length>1?'<button class="btn" data-qshuf>↻ Another one</button>':''}<button class="btn" data-qline="${h.id}">Make it line of the month</button></div></article>
    <div class="rqwall">${qs.map(q=>{const b=byId(D.books,q.book);return `<button class="rqc" style="${tint(b)}" data-edit="quote|${q.id}"><p>“${esc(q.text)}”</p><span>${b?esc(b.t):'Unknown book'}${q.page?' · p. '+esc(q.page):''}</span></button>`}).join('')}</div>`
   :'<p class="rempty">No quotes yet. Add one here or on any book page.</p>'}</section>`;
}

/* ---------- Year ---------- */
function rYear(){
  const years=[...new Set(D.books.map(b=>(b.end||'').slice(0,4)).filter(Boolean))].sort().reverse();
  if(!years.length)return `<section class="rsec"><p class="rempty">Finish a book and your year in reading shows up here.</p></section>`;
  const yr=years.includes(U.ry)?U.ry:years.includes(Y)?Y:years[0];
  const bs=D.books.filter(b=>b.st==='read'&&(b.end||'').startsWith(yr));
  const pages=bs.reduce((m,b)=>m+(+b.pages||0),0),rated=bs.filter(b=>avg(b)),ar=rated.length?rated.reduce((m,b)=>m+avg(b),0)/rated.length:0;
  const per=Array.from({length:12},(_,i)=>bs.filter(b=>+b.end.slice(5,7)===i+1).length),top=Math.max(1,...per),big=per.indexOf(Math.max(...per));
  const tc={};bs.forEach(b=>(b.tags||[]).forEach(t=>tc[t]=(tc[t]||0)+1));const tags=Object.keys(tc).sort((a,b)=>tc[b]-tc[a]||a.localeCompare(b)).slice(0,5);
  const fc={};bs.forEach(b=>fc[b.fmt]=(fc[b.fmt]||0)+1);
  const paged=bs.filter(b=>+b.pages).sort((a,b)=>b.pages-a.pages),best=[...rated].sort((a,b)=>avg(b)-avg(a))[0],again=bs.filter(b=>b.rr||(b.past||[]).length).length;
  const spread=[5,4,3,2,1].map(s=>[s,rated.filter(b=>Math.round(avg(b))===s).length]),smax=Math.max(1,...spread.map(x=>x[1]));
  const favs=Object.keys(D.favs).filter(k=>k.startsWith(yr)&&(D.favs[k].book||D.favs[k].character||D.favs[k].line)).sort().reverse();
  const tmax=Math.max(1,...tags.map(t=>tc[t]));
  return `<section class="rsec"><div class="rsh"><h2>Your ${yr}</h2>${years.length>1?`<div class="rchips" role="group" aria-label="Year">${years.slice(0,6).map(y=>`<button data-ry="${y}" aria-pressed="${y===yr}">${y}</button>`).join('')}</div>`:''}</div>
   <div class="rnums">${[[bs.length,bs.length===1?'book':'books'],[fmt(pages),'pages'],[ar?qfmt(Math.round(ar*4)/4):'–','average stars'],[again,again===1?'reread':'rereads']].map(([n,l])=>`<div class="rcard rnum"><b>${n}</b><span class="small">${l}</span></div>`).join('')}</div>
   <div class="rcard rbox"><div class="rsh"><h3>Books each month</h3>${bs.length?`<span class="small">${MONTHS[big]} was your big month</span>`:''}</div>
    <div class="rbars" role="img" aria-label="Books finished each month: ${per.map((n,i)=>MONTHS[i]+' '+n).join(', ')}">${per.map((n,i)=>`<div title="${MONTHS[i]}: ${n}"><span>${n||''}</span><i class="${n?'':'z'}" style="height:${n?Math.max(8,n/top*110):5}px"></i><span>${MONTHS[i][0]}</span></div>`).join('')}</div></div>
   <div class="rtwo">
    <div class="rcard rbox"><h3>Stars you gave</h3>${spread.map(([s,n])=>`<div class="rmeter"><span>${s} ★</span><span class="rbar"><i style="width:${n/smax*100}%"></i></span><span>${n}</span></div>`).join('')}</div>
    <div class="rcard rbox"><h3>Most read tags</h3>${tags.length?tags.map(t=>`<div class="rmeter"><span>${esc(t)}</span><span class="rbar"><i style="width:${tc[t]/tmax*100}%"></i></span><span>${tc[t]}</span></div>`).join(''):'<p class="small">Add tags to your books to see them here.</p>'}</div>
    <div class="rcard rbox"><h3>Good to know</h3><dl class="rfacts2">
     ${best?`<dt>highest rated</dt><dd>${esc(best.t)} · ${qfmt(avg(best))} ★</dd>`:''}
     ${paged.length?`<dt>longest</dt><dd>${esc(paged[0].t)} · ${fmt(paged[0].pages)} pages</dd>`:''}
     ${paged.length>1?`<dt>shortest</dt><dd>${esc(paged[paged.length-1].t)} · ${fmt(paged[paged.length-1].pages)} pages</dd>`:''}
     ${paged.length?`<dt>pages per book</dt><dd>${fmt(Math.round(paged.reduce((m,b)=>m+ +b.pages,0)/paged.length))}</dd>`:''}
     ${Object.keys(fc).length?`<dt>formats</dt><dd>${Object.keys(fc).map(k=>`${fc[k]} ${esc((k||'').toLowerCase())}`).join(' · ')}</dd>`:''}
     <dt>sessions</dt><dd>${D.sessions.filter(s=>(s.d||'').startsWith(yr)).length}</dd></dl></div>
    <div class="rcard rbox"><h3>Month favorites</h3>${favs.length?favs.map(k=>{const f=D.favs[k],b=byId(D.books,f.book);return `<div class="rmeter" style="grid-template-columns:3em 1fr"><span class="small">${monthName(k).slice(0,3)}</span><span>${[b?esc(b.t):'',f.character?esc(f.character):''].filter(Boolean).join(' · ')||esc(f.line||'')}</span></div>`}).join(''):'<p class="small">Pick a book of the month on Now.</p>'}</div>
   </div></section>`;
}

/* ================= a book's page ================= */
function pBook(b){
  const a=avg(b),qs=D.quotes.filter(q=>q.book===b.id),pr=progress(b),det=U.bdet===b.id,past=b.past||[],log=[...(b.log||[])].reverse();
  const dates=(o,pf)=>`<span class="dates"><input type="date" ${pf}start" value="${esc(o.start||'')}" aria-label="Started"><span class="small">to</span><input type="date" ${pf}end" value="${esc(o.end||'')}" aria-label="Finished"></span>`;
  return `<div class="rd rbook"><button class="back" data-go="reading">← Reading</button>
  <article class="rcard rbhead">
   <div class="rbcov">${cover(b)}<button class="link" data-look="books|${b.id}">Other cover</button></div>
   <div class="rcol" style="gap:12px">
    <div>${inlT('books',b,'t','Title')}${inl('books',b,'a','Author','ser','style="margin-top:4px"')}</div>
    <div class="rpills" role="group" aria-label="Status">${Object.entries(ST).map(([k,v])=>`<button data-bst="${b.id}|${k}" aria-pressed="${b.st===k}">${v[0]}</button>`).join('')}</div>
    ${a?`<div style="display:flex;gap:10px;align-items:center">${starsOf(a)}<span class="small">${qfmt(a)} average</span></div>`:''}
    <div class="rmeta">${[b.fmt,b.pages?b.pages+' pages':'',...(b.tags||[])].filter(Boolean).map(x=>`<span>${esc(x)}</span>`).join('')}${b.sh.map(s=>`<span>♡ ${esc(s)}</span>`).join('')}<button class="btn sm" data-bdet="${b.id}" aria-expanded="${det}">${det?'done':'edit details'}</button></div>
    ${det?`<div class="rdet"><dl class="facts">
     <dt>Pages</dt><dd>${inlN('books',b,'pages','Page count',false)}</dd>
     <dt>Format</dt><dd><select data-f="books|${b.id}|fmt" aria-label="Format">${['Physical','Ebook','Audiobook'].map(o=>`<option ${b.fmt===o?'selected':''}>${o}</option>`).join('')}</select></dd>
     <dt>Tags</dt><dd>${(b.tags||[]).map(t=>`<span class="chip tagchip">${esc(t)}<button class="x" data-untag="${b.id}|${esc(t)}" aria-label="Remove ${esc(t)}">×</button></span>`).join('')}<form class="tagadd" data-form="tag|${b.id}"><input name="t" list="taglist" placeholder="+ tag" aria-label="Add a tag"></form><datalist id="taglist">${[...new Set(D.books.flatMap(x=>x.tags||[]))].map(t=>`<option value="${esc(t)}">`).join('')}</datalist></dd>
     <dt>Shelves</dt><dd>${D.shelves.map(s=>`<button class="chip" data-bsh="${b.id}|${esc(s)}" aria-pressed="${b.sh.includes(s)}">${esc(s)}</button>`).join('')}<button class="chip" data-new="shelf|${b.id}">+ shelf</button></dd>
     <dt>Times read</dt><dd><span class="stepper"><button data-times="${b.id}|-1" aria-label="One less">−</button><b style="min-width:26px;text-align:center">${timesRead(b)}</b><button data-times="${b.id}|1" aria-label="One more">+</button></span></dd>
    </dl></div>`:''}
    <div class="rreads"><span class="small">Your reads${timesRead(b)>1?` · read ${timesRead(b)} times`:''}</span>
     <div class="rread">${dates(b,`data-f="books|${b.id}|`)}<span class="small">${b.st==='reading'?'reading now':b.st==='read'?'finished':ST[b.st][0].toLowerCase()}${b.rr?' · reread':''}</span></div>
     ${past.map(p=>`<div class="rread">${dates(p,`data-past="${b.id}|${p.id}|`)}<span class="racts"><span class="small">earlier read</span><button class="x" data-pastdel="${b.id}|${p.id}" aria-label="Remove this read">×</button></span></div>`).join('')}
     <div class="racts">${b.st==='read'?`<button class="btn sm" data-again="${b.id}">+ Read it again</button>`:`<button class="btn sm pri" data-finish="${b.id}">Mark finished</button>`}<label class="rchk"><input type="checkbox" data-rrchk="${b.id}" ${b.rr?'checked':''}> this is a reread</label><button class="link" data-pastadd="${b.id}">+ add an earlier read</button></div>
    </div>
   </div></article>
  <div class="rbgrid"><div>
   ${['reading','paused','dnf'].includes(b.st)?`<div class="rcard rbox"><h3>Progress</h3>
     <div class="seg" role="group" aria-label="Track progress by" style="align-self:flex-start">${[['pages','Pages'],['pct','Percent'],['none','Don\'t track']].map(([k,l])=>`<button data-pmode="${b.id}|${k}" aria-pressed="${b.pmode===k}">${l}</button>`).join('')}</div>
     ${b.pmode==='pages'?`<div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap">On page ${inlN('books',b,'pg','Current page')} of ${inlN('books',b,'pages','Page count')}</div>`:b.pmode==='pct'?`<div style="display:flex;gap:8px;align-items:center">${inlN('books',b,'pct','Percent')} % through</div>`:''}
     ${pr!==null?`<span class="rbar"><i style="width:${pr}%"></i></span>`:''}<div class="racts"><button class="btn sm" data-sess="${b.id}">▶ Reading session</button></div></div>`:''}
   ${b.st==='dnf'?`<div class="rcard rbox"><h3>Why I stopped</h3>${inlA('books',b,'why','A line about why you put it down',2)}</div>`:''}
   <div class="rcard rbox"><h3>Review</h3>${inlA('books',b,'review','What did you think? As long or short as you like.',5)}</div>
   <div class="rcard rbox"><h3>Reading log</h3>
    <form class="rupd" data-form="blog|${b.id}"><input class="rin n" name="pg" type="number" inputmode="numeric" min="0" placeholder="page" aria-label="Page (optional)"><input class="rin w" name="t" placeholder="A thought while reading…" aria-label="A thought"><button class="btn pri">Add</button></form>
    <div class="rlog">${log.map(x=>`<div><span class="small">${nice(x.d)}${x.pg!==''&&x.pg!=null?' · p. '+esc(x.pg):''}</span><span class="t">${esc(x.t||'')}</span><button class="x" data-logdel="${b.id}|${x.id}" aria-label="Remove">×</button></div>`).join('')||'<p class="small">Thoughts you add while reading (here or with Update progress) show up here with the date.</p>'}</div></div>
   <div class="rcard rbox"><h3>Notes</h3>${inlA('books',b,'notes','Anything else: who recommended it, what to look up.',3)}</div>
  </div><div>
   <div class="rcard rbox"><h3>Grades</h3>
    <div class="grades">${GRADES.map(k=>{const v=b.grades[k]||0;return `<b>${k}</b><span class="pick5">${[1,2,3,4,5].map(n=>`<button aria-label="${k} ${n} stars" data-grade="${b.id}|${k}|${n}"><i style="width:${Math.max(0,Math.min(1,v-n+1))*100}%">★</i>★</button>`).join('')}<span class="gv">${v?qfmt(v):''}</span></span>`}).join('')}</div>
    <div class="avg"><b>${a?qfmt(a):'–'}</b><span class="small">${a?'average of '+Object.values(b.grades).filter(Boolean).length+' grades':'no grades yet'}</span></div></div>
   <div class="rcard rbox"><h3>Quotes</h3>
    ${qs.map(q=>`<div class="qitem" style="${tint(b)}"><p>“${esc(q.text)}”</p>${q.page?`<span class="small" style="color:inherit;opacity:.8">p. ${esc(q.page)}</span>`:''}<button class="x" data-del="quote|${q.id}" aria-label="Delete quote">×</button></div>`).join('')}
    <form class="addq" data-form="quote|${b.id}"><textarea name="text" rows="2" placeholder="Copy a line out…" aria-label="Quote"></textarea><span class="row2"><input name="page" placeholder="page" aria-label="Page"><button class="btn pri">Add</button></span></form></div>
   <button class="link danger" style="align-self:flex-start" data-del="book|${b.id}">Delete this book</button>
  </div></div></div>`;
}

/* ================= events ================= */
function startBook(b){b.st='reading';if(!b.start)b.start=TODAY;D.wheel=D.wheel.filter(x=>x!==b.id)}
document.addEventListener('click',e=>{
  const t=e.target.closest('button');if(!t)return;const d=t.dataset;
  if(d.rtab){U.rt=d.rtab;if(location.hash!=='#reading'){go('reading');return}window.scrollTo(0,0)}
  else if(d.rs){U.rs=d.rs}
  else if('rfilter' in d){filterPop();return}
  else if(d.rfc!==undefined){const [k,v]=d.rfc.split('|');U.rf={...U.rf,[k]:v};if(k==='shelf')U.shelf=v;render();filterPop();return}
  else if('rfreset' in d){U.rf={};render();filterPop();return}
  else if(d.rfx){const {[d.rfx]:_,...rest}=U.rf;U.rf=rest}
  else if('rclr' in d){U.rf={};U.rq=''}
  else if(d.rp){U.rp=U.rp===d.rp?'':d.rp;render();setTimeout(()=>document.querySelector('.rupd input')?.focus(),0);return}
  else if('wheel' in d){U.wland='';if(!wheelBooks().length){const w=D.books.filter(b=>b.st==='want').slice(0,12).map(b=>b.id);if(w.length){D.wheel=w;save()}}wheelPop();return}
  else if('spin' in d){spin();return}
  else if(d.tw){if(spinning)return;const i=d.tw;if(D.wheel.includes(i))D.wheel=D.wheel.filter(x=>x!==i);else if(wheelBooks().length<12)D.wheel=[...D.wheel.filter(x=>byId(D.books,x)?.st==='want'),i];else{toast('The wheel holds up to 12 books');return}U.wland='';save();wheelPop();return}
  else if(d.wstart){const b=byId(D.books,d.wstart);if(!b)return;startBook(b);close(false);toast(`Started ${b.t}`);go('book/'+b.id);return}
  else if(d.pre){U.pre=+d.pre}
  else if(d.sess!==undefined){if(RUN){sessPop();return}RUN={book:d.sess||'',min:U.pre||60,t0:Date.now(),pMs:0,paused:false,broke:false};keepRun();sessPop();render();sessPop();return}
  else if('sopen' in d){sessPop();return}
  else if('spause' in d){if(!RUN)return;if(RUN.paused){RUN.pMs+=Date.now()-RUN.pAt;RUN.paused=false}else{RUN.paused=true;RUN.pAt=Date.now();RUN.broke=true}keepRun();sessPop();return}
  else if('scancel' in d){RUN=null;keepRun();close();return}
  else if('send' in d){if(!RUN)return;const secs=runSecs(),full=secs>=RUN.min*60,bk=RUN.book;
    if(secs>=60)D.sessions.push({id:id(),d:TODAY,book:bk,min:RUN.min,secs,full,nonstop:full&&!RUN.broke});
    RUN=null;keepRun();close(false);
    toast(full?'Session done 🎉':secs>=60?`Saved ${Math.round(secs/60)} minutes of reading`:'Too short to save');
    if(bk&&byId(D.books,bk)?.st==='reading'){U.rt='now';U.rp=bk;go('reading');setTimeout(()=>document.querySelector('.rupd input')?.focus(),50);return}}
  else if('newch' in d){newChPop();return}
  else if(d.chedit){U.chedit=U.chedit===d.chedit?'':d.chedit}
  else if(d.chp){const [c,p]=d.chp.split('|');promptPop(c,p);return}
  else if(d.chset!==undefined){const [c,p,b]=d.chset.split('|'),ch=byId(D.challenges,c),pr=ch&&byId(ch.prompts,p);if(pr)pr.book=b;close();return}
  else if(d.chpdel){const [c,p]=d.chpdel.split('|'),ch=byId(D.challenges,c);ch.prompts=ch.prompts.filter(x=>x.id!==p)}
  else if(d.chn){const [c,n]=d.chn.split('|'),ch=byId(D.challenges,c);ch.n=Math.max(0,(+ch.n||0)+(+n))}
  else if(d.chdel){if(!t.dataset.armed){t.dataset.armed='1';t.textContent='Tap again to delete';setTimeout(()=>{if(t.isConnected){t.textContent='Delete this challenge';delete t.dataset.armed}},4000);return}
    D.challenges=D.challenges.filter(x=>x.id!==d.chdel);U.chedit='';toast('Challenge deleted')}
  else if('qshuf' in d){const qs=D.quotes.filter(q=>!U.qbook||q.book===U.qbook);if(qs.length>1){let k;do{k=qs[Math.floor(Math.random()*qs.length)].id}while(k===U.qh);U.qh=k}}
  else if(d.qline){const q=byId(D.quotes,d.qline);if(!q)return;D.favs[YM]={...(D.favs[YM]||{}),line:q.text};toast(`Line of ${monthName(YM)} saved`)}
  else if(d.bdet){U.bdet=U.bdet===d.bdet?'':d.bdet}
  else if(d.again){const b=byId(D.books,d.again);b.past=[...(b.past||[]),{id:id(),start:b.start||'',end:b.end||''}];b.rr=true;startBook(b);b.start=TODAY;b.end='';b.pg='';b.pct='';toast('Reread started')}
  else if(d.pastadd){const b=byId(D.books,d.pastadd);b.past=[...(b.past||[]),{id:id(),start:'',end:''}]}
  else if(d.pastdel){const [i,p]=d.pastdel.split('|'),b=byId(D.books,i);b.past=b.past.filter(x=>x.id!==p)}
  else if(d.logdel){const [i,l]=d.logdel.split('|'),b=byId(D.books,i);b.log=b.log.filter(x=>x.id!==l)}
  else return;
  render();
});
document.addEventListener('change',e=>{
  const x=e.target,d=x.dataset;
  if(d.past){const [i,p,f]=d.past.split('|'),b=byId(D.books,i),r=b&&byId(b.past||[],p);if(r){r[f]=x.value;save()}return}
  if(d.rrchk){const b=byId(D.books,d.rrchk);b.rr=x.checked;render();return}
  if(d.chpt){const [c,p]=d.chpt.split('|'),pr=byId(byId(D.challenges,c).prompts,p);if(x.value.trim())pr.p=x.value.trim();save();return}
  if(d.chf){const [c,f]=d.chf.split('|'),ch=byId(D.challenges,c);ch[f]=f==='goal'?Math.max(1,+x.value||1):x.value;save();if(f==='goal')render();return}
  if('qbook' in d){U.qbook=x.value;U.qh='';render();return}
  if('sessbook' in d){U.sessbook=x.value;render();return}
});
document.addEventListener('submit',e=>{
  const f=e.target,[k,ref]=(f.dataset.form||'').split('|'),v=readForm(f),T=s=>(s||'').trim();
  if(k==='rprog'){const b=byId(D.books,ref);if(!b)return;const has=v.v!==undefined&&v.v!=='';
    if(has){const n=Math.max(0,Number(v.v));if(b.pmode==='pct')b.pct=Math.min(n,100);else b.pg=b.pages?Math.min(n,+b.pages):n}
    if(has||T(v.t))b.log=[...(b.log||[]),{id:id(),d:TODAY,pg:has&&b.pmode!=='pct'?b.pg:'',t:T(v.t)}];
    U.rp='';toast(b.pmode==='pages'&&b.pages&&+b.pg>=+b.pages?'Last page! Mark it finished on the book':'Saved');render();return}
  if(k==='blog'){const b=byId(D.books,ref);if(!b||(!T(v.t)&&v.pg===''))return;b.log=[...(b.log||[]),{id:id(),d:TODAY,pg:v.pg===''?'':Math.max(0,+v.pg),t:T(v.t)}];
    if(v.pg!==''&&b.pmode==='pages'&&+v.pg>(+b.pg||0))b.pg=b.pages?Math.min(+v.pg,+b.pages):+v.pg;render();setTimeout(()=>document.querySelector(`form[data-form="blog|${ref}"] input[name=t]`)?.focus(),0);return}
  if(k==='chp'){const c=byId(D.challenges,ref);if(!c||!T(v.p))return;c.prompts.push({id:id(),p:T(v.p),book:''});render();setTimeout(()=>document.querySelector(`form[data-form="chp|${ref}"] input`)?.focus(),0);return}
  if(k==='newch'){if(!T(v.name))return;const c={id:id(),name:T(v.name),kind:v.kind,prompts:[],goal:Math.max(1,+v.goal||1),n:0,note:T(v.note)};D.challenges.push(c);if(c.kind==='prompts')U.chedit=c.id;close();U.rt='chal';go('reading');return}
});
