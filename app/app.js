/* ================= data ================= */
const DAY=864e5;
const iso=d=>{const x=new Date(d);return x.getFullYear()+'-'+String(x.getMonth()+1).padStart(2,'0')+'-'+String(x.getDate()).padStart(2,'0')};
let TODAY,YM,Y,CUR;
function setDay(){TODAY=iso(Date.now());YM=TODAY.slice(0,7);Y=TODAY.slice(0,4);CUR={year:Y,quarter:Y+'-Q'+(Math.floor((+TODAY.slice(5,7)-1)/3)+1),month:YM}}
setDay();
const off=n=>iso(Date.now()+n*DAY);
const ymOff=n=>{const d=new Date();d.setDate(1);d.setMonth(d.getMonth()+n);return iso(d).slice(0,7)};
/* ids must never clash between phone and computer */
const id=()=>(self.crypto&&crypto.randomUUID?crypto.randomUUID().replace(/-/g,''):Math.random().toString(36).slice(2)+Date.now().toString(36)).slice(0,14);
const SUB={year:p=>[1,2,3,4].map(q=>p+'-Q'+q),quarter:p=>{const q=+p.slice(-1);return [1,2,3].map(i=>p.slice(0,4)+'-'+String((q-1)*3+i).padStart(2,'0'))}};
const SUBLVL={year:'quarter',quarter:'month'};
const lvlOf=p=>p.length===4?'year':p.includes('Q')?'quarter':'month';
const inPer=(d,p)=>{if(!d)return false;if(p.includes('Q'))return d.slice(0,4)===p.slice(0,4)&&Math.floor((+d.slice(5,7)-1)/3)+1===+p.slice(-1);return d.startsWith(p)};
const GRADES=['Characters','Writing','Plot','Enjoyment'];
function blank(){return {shelves:['favorites'],books:[],quotes:[],favs:{},projects:[],notes:[],tasks:[],dates:[],rhythm:[],rlog:{},goals:[]}}
/* fill in anything missing so older or partial data never breaks a page */
function fix(d){const b=blank();d=d&&typeof d==='object'&&!Array.isArray(d)?d:{};for(const k in b)if(!d[k]||typeof d[k]!=='object'||Array.isArray(d[k])!==Array.isArray(b[k]))d[k]=b[k];
  d.books.forEach(x=>{x.sh=Array.isArray(x.sh)?x.sh:[];x.grades=x.grades&&typeof x.grades==='object'?x.grades:{}});d.projects.forEach(x=>{x.sessions=Array.isArray(x.sessions)?x.sessions:[];if(!Array.isArray(x.docs)){x.docs=x.file?[{id:'doc'+x.id,name:'Scrivener',url:x.file}]:[];delete x.file}});return d}
let D=fix(Store.load());
/* yesterday's unfinished picks quietly go back to their list */
function newDay(){D.tasks.forEach(t=>{if(t.pick&&t.pick!==TODAY&&!t.done)t.pick=''})}
newDay();
function save(){Store.save(D)}
const U={gedit:'',filter:'all',shelf:'',nf:'all',glvl:'year',gper:{...CUR},pop:null,undo:null,doneOpen:false,qi:-1};

/* ================= helpers ================= */
const esc=s=>String(s??'').replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const fmt=n=>Number(n||0).toLocaleString('en-US');
const pct=(a,b)=>b?Math.max(0,Math.min(100,Math.round(a/b*100))):0;
const byId=(arr,i)=>arr.find(x=>x.id===i);
const MONTHS=['January','February','March','April','May','June','July','August','September','October','November','December'];
const parse=s=>{const [y,m,d]=s.split('-').map(Number);return {y,m,d}};
const nice=s=>{if(!s)return'';const p=parse(s);return `${MONTHS[p.m-1].slice(0,3)} ${p.d}`};
const monthName=ym=>MONTHS[Number(ym.slice(5,7))-1];
const ago=s=>{if(!s)return'never';const n=Math.round((new Date(TODAY)-new Date(s))/DAY);return n<=0?'today':n===1?'yesterday':n<14?n+' days ago':n<60?Math.round(n/7)+' weeks ago':Math.round(n/30)+' months ago'};
const ST={want:['To read','s-want'],reading:['Reading','s-reading'],paused:['Paused','s-paused'],read:['Read','s-read'],dnf:['Did not finish','s-dnf']};
const PHASES={plotting:'Plotting',writing:'Writing',editing:'Editing',revising:'Revising',done:'Finished'};
const hash=s=>{let h=7;for(const c of s)h=(h*31+c.charCodeAt(0))>>>0;return h};
/* made-up covers: picked from the title (and a "look" number you can change), so they stay the same on every device */
const CPAL=[['#4E6278','#F2D49B','#FFFFFF'],['#E9C9C4','#7A3B3B','#2A1E1E'],['#3E7C62','#F3E6C8','#F7F2E6'],['#F2D49B','#4E6278','#2A2418'],['#B07F3E','#F6E9D2','#FFF8EC'],['#2F3A4A','#D98E6A','#F1E8DA'],['#D5E2D0','#3E6B4E','#1F2A22'],['#E3D3EE','#6A4C7A','#251C2B'],['#7A3B3B','#F1C9B0','#FBEFE6'],['#CDE7E3','#2F6F68','#16302D'],['#F3D7C2','#C46A4A','#3A2118'],['#1F2A22','#C9A36A','#EDE6D6']];
const seedOf=x=>hash((x.t||'')+'|'+(x.look||0));
function cover(b){
  const h=seedOf(b),[g,a,i]=CPAL[h%CPAL.length],T=esc(b.t),A=esc(b.a);
  const inner=(h>>5)%2
   ?`<div class="cv-pb" style="background:${g}"><span class="pbtop"><i></i></span><span class="pbmid"><span class="ct">${T}</span></span><span class="pbbot" style="color:${i}"><span class="ca">${A}</span></span></div>`
   :`<div class="cv-mb" style="background:${Array.from({length:7},(_,k)=>`radial-gradient(ellipse ${30+k*6}% ${18+k*4}% at ${(h>>(k*3))%100}% ${(h>>(k*2+1))%100}%, ${k%2?a:g} 0 40%, transparent 41%)`).join(',')},repeating-radial-gradient(circle at ${h%100}% ${(h>>5)%100}%, ${g} 0 6cqw, ${a} 6cqw 9cqw, ${g} 9cqw 15cqw)"><span class="mblabel"><span class="ct">${T}</span><span class="ca">${A}</span></span></div>`;
  const img=b.cover&&b.cover!=='none'?`<img class="real" src="${esc(b.cover)}" alt="" loading="lazy" onerror="this.remove()">`:'';
  return `<div class="cover" aria-hidden="true">${inner}${img}</div>`;
}
/* real covers from Open Library (free, no account) */
const OL='https://openlibrary.org/search.json';
const olCover=i=>i?`https://covers.openlibrary.org/b/id/${i}-L.jpg`:'';
async function olSearch(q,limit=6){
  const r=await fetch(`${OL}?q=${encodeURIComponent(q)}&limit=${limit}&fields=title,author_name,cover_i,number_of_pages_median,first_publish_year`);
  if(!r.ok)throw new Error('search failed');
  return ((await r.json()).docs||[]).map(d=>({title:d.title||'',author:(d.author_name||[])[0]||'',cover:olCover(d.cover_i),pages:d.number_of_pages_median||'',year:d.first_publish_year||''}));
}
async function findCover(b,force){
  if(!b||(!force&&b.cover))return false;
  try{const r=(await olSearch(`${b.t} ${b.a}`.trim(),5)).find(x=>x.cover);
    if(!r){if(!b.cover)b.cover='none';save();return false}
    b.cover=r.cover;if(!b.pages&&r.pages)b.pages=r.pages;save();return true}catch(e){return false}
}
function gen(p){
  const h=seedOf(p),[g,a,i]=CPAL[h%CPAL.length],T=esc(p.t);
  if((h>>4)%2){const L=esc((p.t||'?').replace(/^(the|a|an)\s+/i,'')[0]||'?');
    return `<div class="gen gi" style="background:${g};color:${i}" aria-hidden="true"><span class="gl" style="color:${a}">${L}</span><span class="gt">${T}</span></div>`}
  const k=(h>>7)%3,art=k===0?`<span class="sun" style="background:${a}"></span><span class="hz" style="background:${i}"></span>`:k===1?`<span class="arch" style="background:${a}"></span>`:`<span class="waves" style="background:repeating-radial-gradient(circle at 50% 120%, ${a} 0 5cqw, transparent 5cqw 10cqw)"></span>`;
  return `<div class="gen gs" style="background:${g};color:${i}" aria-hidden="true">${art}<span class="gt">${T}</span></div>`;
}
/* grades go in quarter stars; the average is rounded to the nearest quarter too */
const avg=b=>{const v=Object.values(b.grades||{}).filter(Boolean);return v.length?Math.round(v.reduce((m,x)=>m+x,0)/v.length*4)/4:0};
const qfmt=n=>n.toFixed(2).replace(/0$/,'');
const starsOf=n=>n?`<span class="stars" aria-label="${qfmt(n)} stars">★★★★★<i style="width:${n/5*100}%">★★★★★</i></span>`:'';
const progress=b=>b.pmode==='pages'&&b.pages?pct(b.pg,b.pages):b.pmode==='pct'?Number(b.pct||0):null;
const progTxt=b=>b.pmode==='pages'&&b.pages?`p. ${b.pg||0} of ${b.pages}`:b.pmode==='pct'?`${b.pct||0}%`:'not tracking pages';
const perLabel=p=>{const L=lvlOf(p);if(L==='year')return p;if(L==='quarter'){const q=+p.slice(-1);return `Q${q} · ${MONTHS[(q-1)*3].slice(0,3)} to ${MONTHS[(q-1)*3+2].slice(0,3)}`}return MONTHS[+p.slice(5,7)-1]};
const perShort=p=>{const L=lvlOf(p);return L==='year'?p:L==='quarter'?'Q'+p.slice(-1):MONTHS[+p.slice(5,7)-1].slice(0,3)};
const kidsOf=g=>D.goals.filter(k=>k.parent===g.id);
function gval(g){
  if(g.auto)return D.books.filter(b=>b.st==='read'&&inPer(b.end,g.per)).length;
  const ks=kidsOf(g).filter(k=>k.kind==='number');
  return ks.length?ks.reduce((m,k)=>m+gval(k),0):Number(g.v||0);
}
const stepDone=s=>{const c=s.child&&byId(D.goals,s.child);return c?gp(c).p>=100:!!s.done};
function gp(g){
  if(g.kind==='number'){const v=gval(g);return {p:pct(v,g.target),txt:`${v} of ${g.target||0}${g.unit?' '+g.unit:''}`}}
  if(g.kind==='steps'){const st=g.steps||[],n=st.filter(stepDone).length;return {p:pct(n,st.length),txt:st.length?`${n} of ${st.length} steps`:'no steps yet'}}
  return {p:g.done?100:0,txt:g.done?'done':'not yet'};
}
const picked=t=>t.pick===TODAY&&!t.done;
const pickedToday=t=>t.pick===TODAY;
const pickRow=(t,cls)=>`<div class="${cls} ${t.done?'done':''}"><input type="checkbox" class="tick" ${t.done?`checked data-undone="${t.id}"`:`data-done="${t.id}"`} aria-label="${t.done?'Not done':'Done'}: ${esc(t.t)}">`;
const lastWritten=p=>(p.sessions||[]).reduce((m,s)=>s.d>m?s.d:m,'');
const plotOpen=p=>p.plot!==''&&p.plot!=null&&+p.plot<100;
const phaseTxt=p=>PHASES[p.phase]+(p.phase==='plotting'&&plotOpen(p)?` · ${+p.plot}%`:'')+(p.ch&&p.phase!=='done'&&p.phase!=='plotting'?` · ch. ${esc(p.ch)}`:'');
/* the stage chip, plus a small tag when writing has started before the plot is finished */
const stageChips=(p,st='')=>`<span class="phase ph-${p.phase}" ${st}>${phaseTxt(p)}</span>${['writing','editing','revising'].includes(p.phase)&&plotOpen(p)?`<span class="phase ph-plotting" ${st}>plot ${+p.plot}%</span>`:''}`;

/* click-to-type fields */
const inl=(c,o,f,ph,cls='',extra='')=>`<input class="inl ${cls}" data-f="${c}|${o.id}|${f}" value="${esc(o[f]??'')}" placeholder="${esc(ph)}" aria-label="${esc(ph)}" ${extra}>`;
const inlA=(c,o,f,ph,rows=3)=>`<textarea class="inl" data-f="${c}|${o.id}|${f}" placeholder="${esc(ph)}" aria-label="${esc(ph)}" rows="${rows}">${esc(o[f]??'')}</textarea>`;
const inlT=(c,o,f,ph)=>`<textarea class="inl big" rows="1" data-f="${c}|${o.id}|${f}" placeholder="${esc(ph)}" aria-label="${esc(ph)}">${esc(o[f]??'')}</textarea>`;
const inlW=(c,o,f,ph)=>`<textarea class="inl tname" rows="1" data-f="${c}|${o.id}|${f}" placeholder="${esc(ph)}" aria-label="${esc(ph)}">${esc(o[f]??'')}</textarea>`;
const inlN=(c,o,f,ph,rr=true)=>`<input class="inl num" type="number" inputmode="numeric" min="0" data-f="${c}|${o.id}|${f}" data-num ${rr?'data-rr':''} value="${esc(o[f]??'')}" aria-label="${esc(ph)}">`;

/* ================= routing ================= */
const ROOMS=[['home','Today','--c-home'],['reading','Reading','--c-read'],['writing','Writing','--c-write'],['days','Days','--c-days'],['goals','Goals','--c-goals']];
function route(){
  const [a,b]=(location.hash.slice(1)||'home').split('/');
  if(a==='book'&&byId(D.books,b))return {room:'reading',view:()=>pBook(byId(D.books,b))};
  if(a==='project'&&byId(D.projects,b))return {room:'writing',view:()=>pProject(byId(D.projects,b))};
  if(a==='card'&&byId(D.notes,b))return {room:'writing',view:()=>pCard(byId(D.notes,b))};
  if(a==='goal'&&byId(D.goals,b))return {room:'goals',view:()=>pGoal(byId(D.goals,b))};
  const r=ROOMS.find(x=>x[0]===a)?a:'home';
  return {room:r,view:{home:vHome,reading:vReading,writing:vWriting,days:vDays,goals:vGoals}[r]};
}
function go(h){if((location.hash.slice(1)||'home')===h)render();else location.hash=h}
function head(title){return `<section class="head"><h1>${title}</h1></section>`}

/* ================= today ================= */
const POEMS=[
 ['Hope is the thing with feathers\nThat perches in the soul','Emily Dickinson'],
 ['Forever – is composed of Nows –','Emily Dickinson'],
 ['Tell all the truth but tell it slant','Emily Dickinson'],
 ['A thing of beauty is a joy for ever:\nIts loveliness increases','John Keats'],
 ['Life has loveliness to sell,\nAll beautiful and splendid things','Sara Teasdale, “Barter”'],
 ['I exist as I am, that is enough','Walt Whitman'],
 ['The world is too much with us; late and soon','William Wordsworth']
];
function quotePool(){return [...D.quotes.map(q=>{const b=byId(D.books,q.book);return {text:q.text,src:b?b.t:'',kind:'From your quotes',book:q.book}}),...POEMS.map(([text,src])=>({text,src,kind:'A little poem'}))]}
function vHome(){
  const now=new Date(),hr=now.getHours();
  const hi=hr<12?'Good morning':hr<18?'Good afternoon':'Good evening';
  const picks=D.tasks.filter(pickedToday),left=picks.filter(t=>!t.done).length;
  const upcoming=D.dates.filter(d=>d.date>=TODAY).sort((a,b)=>a.date.localeCompare(b.date));
  const reading=D.books.filter(b=>b.st==='reading');
  const pins=D.projects.filter(p=>p.pin);
  const log=D.rlog[TODAY]||{};
  const doneN=D.rhythm.filter(r=>log[r.id]).length;
  const pool=quotePool();if(U.qi<0||U.qi>=pool.length)U.qi=Math.floor(Math.random()*pool.length);
  const q=pool[U.qi];
  const sub=[picks.length?`${left} of ${picks.length} picked thing${picks.length>1?'s':''} left`:'nothing picked for today',upcoming[0]?`${upcoming[0].t.toLowerCase()} on ${nice(upcoming[0].date)}`:''].filter(Boolean).join(', and ');
  return `<section class="hello"><div><p class="label" style="font-size:.85rem">${hi}, izzie</p><h1>${now.toLocaleDateString('en-US',{weekday:'long'})}, <em>${now.toLocaleDateString('en-US',{month:'long',day:'numeric'})}</em></h1></div></section>
  ${q?`<section class="qcard"><p class="kind">${q.kind}</p><blockquote>“${esc(q.text)}”</blockquote><p class="src">${q.book?`<button class="link" style="color:inherit;font-size:1rem" data-go="book/${q.book}">${esc(q.src)}</button>`:esc(q.src)}</p><button class="again" data-shuffle>another one</button></section>`:''}
  <div class="tiles">
   <section class="tile t-days w4 wide"><div class="th"><h2>Your day</h2><button class="link" data-go="days">open Days</button></div>
    <div class="split">
     <div><p class="label">Picked for today</p>${picks.length?picks.map(t=>`${pickRow(t,'row')}<span class="txt">${esc(t.t)}</span></div>`).join(''):'<p class="empty">Nothing picked. That\'s allowed.</p>'}</div>
     <div><p class="label" style="margin-bottom:8px">Every day · ${doneN} of ${D.rhythm.length}</p><div class="stickers">${D.rhythm.map(r=>`<button data-rhb="${r.id}" aria-pressed="${!!log[r.id]}">${esc(r.t)}</button>`).join('')}</div>
      <div class="week" aria-label="Last seven days">${[6,5,4,3,2,1,0].map(i=>{const k=off(-i),l=D.rlog[k]||{},n=D.rhythm.filter(r=>l[r.id]).length;return `<div><span class="label">${new Date(Date.now()-i*DAY).toLocaleDateString('en-US',{weekday:'narrow'})}</span><i class="${D.rhythm.length&&n>=Math.ceil(D.rhythm.length/2)?'on':''}" title="${n} done"></i></div>`}).join('')}</div></div>
    </div></section>
   <section class="tile w2" style="background:#fff;border:1px solid var(--line)"><div class="th"><h2>Coming up</h2></div>
    ${upcoming.slice(0,3).map(d=>{const p=parse(d.date);return `<button class="minidate" data-go="days"><b>${p.d}<small>${MONTHS[p.m-1].slice(0,3)}</small></b><span><span style="display:block">${esc(d.t)}</span><span class="label">${esc(d.tag||'')}${d.time?' · '+esc(d.time):''}</span></span></button>`}).join('')||'<p class="empty">Nothing fixed ahead.</p>'}</section>
   <section class="tile t-read w3"><div class="th"><h2>Reading now</h2><button class="link" data-go="reading">library</button></div>
    ${reading.map(b=>{const pr=progress(b);return `<button class="mini" data-go="book/${b.id}"><span>${cover(b)}</span><span><span class="tt">${esc(b.t)}</span><span class="label">${progTxt(b)}</span>${pr!==null?`<span class="bar" style="display:block;margin-top:6px"><i style="width:${pr}%"></i></span>`:''}</span></button>`}).join('')||'<p class="empty">Nothing open right now.</p>'}</section>
   <section class="tile t-write w3"><div class="th"><h2>On the desk</h2><button class="link" data-go="writing">all projects</button></div>
    ${pins.map(p=>`<button class="mini" data-go="project/${p.id}"><span>${gen(p)}</span><span><span class="tt">${esc(p.t)}</span><span class="chiprow">${stageChips(p)}</span><span class="label" style="display:block;margin-top:4px">${esc(p.at||'')}</span></span></button>`).join('')||'<p class="empty">Nothing pinned. Pin a project in Writing.</p>'}</section>
  </div>`;
}

/* ================= reading ================= */
function vReading(){
  const open=D.books.filter(b=>b.st==='reading');
  const g=D.goals.find(x=>x.kind==='number'&&x.auto&&x.per===Y);
  const n=g?gval(g):0;
  const F=U.filter;
  const lib=D.books.filter(b=>(F==='all'||b.st===F)&&(!U.shelf||b.sh.includes(U.shelf)));
  const fv=D.favs[YM]||{};
  const pastM=Object.keys(D.favs).filter(k=>k<YM).sort().reverse();
  const opts=D.books.filter(b=>b.st==='read'||b.st==='reading');
  return `<section class="head rtop"><div style="display:flex;flex-direction:column;gap:8px"><h1 style="font-family:var(--display);font-size:clamp(3rem,8vw,5.2rem);line-height:.95">Reading</h1></div>
   ${g?`<button class="ring" style="--p:${pct(n,g.target)}" data-go="goals" title="Your reading goal, also in Goals"><span><span><b>${n}</b><span class="label">of ${g.target} this year</span></span></span></button>`:`<button class="btn" data-new="goal|books">Set a reading goal</button>`}</section>
  <section class="sec"><div class="sh"><h2>Currently reading</h2><div class="acts"><button class="btn" data-new="book">+ Book</button></div></div>
   <div class="now">${open.map(b=>{const pr=progress(b);return `<button class="nowcard" data-go="book/${b.id}"><span>${cover(b)}</span><span style="display:flex;flex-direction:column;gap:6px;min-width:0"><span class="bt">${esc(b.t)}</span><span style="color:var(--mute)">${esc(b.a)}</span>${pr!==null?`<span class="bar"><i style="width:${pr}%"></i></span>`:''}<span class="label">${progTxt(b)} · ${esc(b.fmt.toLowerCase())}${b.start?' · since '+nice(b.start):''}</span></span></button>`}).join('')||'<p class="empty">Nothing open. Start something from your shelves.</p>'}</div></section>
  <section class="sec"><div class="sh"><h2>${monthName(YM)} favorites</h2></div>
   <div class="favs">
    <div class="fav"><span class="label">Book of the month</span><select data-fav="book" aria-label="Book of the month"><option value="">Pick one…</option>${opts.map(b=>`<option value="${b.id}" ${fv.book===b.id?'selected':''}>${esc(b.t)}</option>`).join('')}</select></div>
    <div class="fav"><span class="label">Character of the month</span><input class="inl" data-fav="character" value="${esc(fv.character||'')}" placeholder="Who stuck with you?"></div>
    <div class="fav"><span class="label">Line of the month</span><input class="inl" data-fav="line" value="${esc(fv.line||'')}" placeholder="A line you keep thinking about"></div>
   </div>
   ${pastM.length?`<div class="past">${pastM.map(k=>{const f=D.favs[k],b=byId(D.books,f.book);return `<span class="label"><b style="color:var(--ink);font-weight:500">${monthName(k)}:</b> ${[b?esc(b.t):'',f.character?esc(f.character):''].filter(Boolean).join(' · ')}</span>`}).join('')}</div>`:''}</section>
  <section class="sec"><div class="sh"><h2>Shelves</h2><div class="acts"><span class="label">${lib.length} books</span><button class="link" data-new="import">Import from Goodreads</button></div></div>
   <div class="tabs" role="group" aria-label="Status">${[['all','All'],...Object.entries(ST).map(([k,v])=>[k,v[0]])].map(([k,l])=>`<button data-filter="${k}" aria-pressed="${F===k}">${l}</button>`).join('')}</div>
   <div class="tabs" role="group" aria-label="Shelf">${D.shelves.map(s=>`<button data-shelf="${esc(s)}" aria-pressed="${U.shelf===s}">${esc(s)}</button>`).join('')}<button class="dash" data-new="shelf">+ shelf</button></div>
   <div class="grid">${lib.map(b=>`<button class="gbook" data-go="book/${b.id}">${cover(b)}<span class="bt">${esc(b.t)}</span><span class="ba">${esc(b.a)}</span>${b.st==='read'?starsOf(avg(b)):`<span class="st ${ST[b.st][1]}">${ST[b.st][0]}</span>`}</button>`).join('')||'<p class="empty">No books here yet.</p>'}</div></section>
  <section class="sec"><div class="sh"><h2>Copied out</h2><div class="acts"><button class="btn" data-new="quote">+ Quote</button></div></div>
   <div class="quotes">${D.quotes.map(q=>{const b=byId(D.books,q.book);return `<article><blockquote>“${esc(q.text)}”</blockquote><div class="qa">${b?`<button class="link" data-go="book/${b.id}">${esc(b.t)}</button>`:'<span class="label">Unknown book</span>'}${q.page?`<span class="label">p. ${esc(q.page)}</span>`:''}<button class="link" data-edit="quote|${q.id}">edit</button></div></article>`}).join('')||'<p class="empty">No quotes yet.</p>'}</div></section>`;
}

function pBook(b){
  const a=avg(b),qs=D.quotes.filter(q=>q.book===b.id),pr=progress(b);
  return `<button class="back" data-go="reading">← Reading</button>
  <div class="bpage">
   <aside><div>${cover(b)}<div class="coverlinks"><button class="link" data-findcover="${b.id}">${b.cover&&b.cover!=='none'?'Other cover':'Find cover'}</button><button class="link" data-linkcover="${b.id}">Image link</button>${!b.cover||b.cover==='none'?`<button class="link" data-look="books|${b.id}">Other look</button>`:''}${b.cover&&b.cover!=='none'?`<button class="link" data-nocover="${b.id}">No cover</button>`:''}</div></div>
    <div style="display:flex;flex-direction:column;gap:10px">
     <div class="tabs" role="group" aria-label="Status" style="gap:5px">${Object.entries(ST).map(([k,v])=>`<button data-bst="${b.id}|${k}" aria-pressed="${b.st===k}">${v[0]}</button>`).join('')}</div>
     ${b.st!=='read'?`<button class="btn" style="border-color:#fff;align-self:flex-start" data-finish="${b.id}">Mark finished</button>`:''}
    </div></aside>
   <div style="display:flex;flex-direction:column;gap:22px;min-width:0">
    <div>${inlT('books',b,'t','Title')}${inl('books',b,'a','Author','ser','style="color:var(--mute);margin-top:4px"')}
     ${a?`<div style="margin-top:8px;display:flex;gap:10px;align-items:center">${starsOf(a)}<span class="label">${qfmt(a)} average</span></div>`:''}</div>
    ${['reading','paused','dnf'].includes(b.st)?`<div class="box"><h3>Progress</h3>
     <div class="seg" role="group" aria-label="Track progress by" style="align-self:flex-start">${[['pages','Pages'],['pct','Percent'],['none','Don\'t track']].map(([k,l])=>`<button data-pmode="${b.id}|${k}" aria-pressed="${b.pmode===k}">${l}</button>`).join('')}</div>
     ${b.pmode==='pages'?`<div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap">On page ${inlN('books',b,'pg','Current page')} of ${inlN('books',b,'pages','Page count')}</div>`:b.pmode==='pct'?`<div style="display:flex;gap:8px;align-items:center">${inlN('books',b,'pct','Percent')} % through</div>`:''}
     ${pr!==null?`<div class="bar" style="height:6px"><i style="width:${pr}%"></i></div>`:''}</div>`:''}
    <dl class="facts">
     <dt>Started</dt><dd><input type="date" data-f="books|${b.id}|start" value="${esc(b.start)}" aria-label="Date started"></dd>
     <dt>Finished</dt><dd><input type="date" data-f="books|${b.id}|end" value="${esc(b.end)}" aria-label="Date finished"></dd>
     <dt>Times read</dt><dd><span class="stepper"><button data-times="${b.id}|-1" aria-label="One less">−</button><b style="min-width:26px;text-align:center">${b.times||0}</b><button data-times="${b.id}|1" aria-label="One more">+</button></span></dd>
     <dt>Pages</dt><dd>${inlN('books',b,'pages','Page count',false)}</dd>
     <dt>Genre</dt><dd>${inl('books',b,'genre','Add a genre')}</dd>
     <dt>Format</dt><dd><select data-f="books|${b.id}|fmt" aria-label="Format">${['Physical','Ebook','Audiobook'].map(o=>`<option ${b.fmt===o?'selected':''}>${o}</option>`).join('')}</select></dd>
     <dt>Shelves</dt><dd>${D.shelves.map(s=>`<button class="chip" style="border:0;${b.sh.includes(s)?'background:#fff;color:#1D1C1A':''}" data-bsh="${b.id}|${esc(s)}" aria-pressed="${b.sh.includes(s)}">${esc(s)}</button>`).join('')}</dd>
    </dl>
    <div class="box"><h3>Your grades</h3>
     <div class="grades">${GRADES.map(k=>{const v=b.grades[k]||0;return `<b>${k}</b><span class="pick5">${[1,2,3,4,5].map(n=>`<button aria-label="${k} ${n} stars" data-grade="${b.id}|${k}|${n}"><i style="width:${Math.max(0,Math.min(1,v-n+1))*100}%">★</i>★</button>`).join('')}<span class="gv">${v?qfmt(v):''}</span></span>`}).join('')}</div>
     <div class="avg"><b>${a?qfmt(a):'–'}</b><span class="label">${a?'average of '+Object.values(b.grades).filter(Boolean).length+' grades':'no grades yet'}</span></div></div>
    <div class="box"><h3>Review</h3>${inlA('books',b,'review','Write what you thought. As long or short as you like.',5)}</div>
    <div class="box"><h3>Quotes</h3>
     ${qs.map(q=>`<div class="qitem"><p>“${esc(q.text)}”</p><button class="x" data-del="quote|${q.id}" aria-label="Delete quote">×</button>${q.page?`<span class="label">p. ${esc(q.page)}</span>`:''}</div>`).join('')||'<p class="label">None yet.</p>'}
     <form class="addq" data-form="quote|${b.id}"><textarea name="text" rows="2" placeholder="Copy a line out…" aria-label="Quote"></textarea><input name="page" placeholder="page" aria-label="Page"><button class="btn" style="border-color:#fff">Add</button></form></div>
    <div class="box"><h3>Notes</h3>${inlA('books',b,'notes','Anything else: who recommended it, what to look up, thoughts while reading.',3)}</div>
    <button class="link danger" style="align-self:flex-start" data-del="book|${b.id}">Delete this book</button>
   </div></div>`;
}

/* ================= writing ================= */
function board(cards,ref){
  return `<div class="board">${cards.map(c=>{const n=D.notes.filter(x=>x.parent===c.id).length;return `<button class="icard" data-go="card/${c.id}"><span class="ic-t">${c.title?esc(c.title):'<i style="opacity:.5">Untitled</i>'}</span><span class="ic-b">${esc(c.body)}</span>${n?`<span class="ic-n">+${n}</span>`:''}</button>`}).join('')}<button class="icard add" data-newcard="${ref}">+ Card</button></div>`;
}
function vWriting(){
  const pins=D.projects.filter(p=>p.pin);
  const rest=D.projects.filter(p=>!p.pin).sort((a,b)=>(b.opened||'').localeCompare(a.opened||''));
  const tops=D.notes.filter(n=>!n.parent),NF=U.nf;
  const shown=tops.filter(n=>NF==='all'||(NF==='loose'?!n.proj:n.proj===NF));
  const projs=D.projects.filter(p=>tops.some(n=>n.proj===p.id));
  return head('Writing')+`
  <section class="sec"><div class="sh"><h2>Pinned</h2><div class="acts"><button class="btn" data-new="project">+ Project</button></div></div>
   <div class="pins">${pins.map(p=>`<button class="pin" data-go="project/${p.id}"><span>${gen(p)}</span><span style="display:flex;flex-direction:column;gap:6px;min-width:0"><h3>${esc(p.t)}</h3><span class="chiprow">${stageChips(p)}${p.words?`<span class="label">${fmt(p.words)} words</span>`:''}</span><p>${esc(p.at||'')}</p></span></button>`).join('')||'<p class="empty">Nothing pinned.</p>'}</div></section>
  <section class="sec"><div class="sh"><h2>Everything else</h2></div>
   <div class="files">${rest.map(p=>{const [a,c]=CPAL[seedOf(p)%CPAL.length];return `<div class="file"><span class="ic" style="background:linear-gradient(180deg,${a} 0 50%,${c} 50%)"></span><button class="nm" data-go="project/${p.id}">${esc(p.t)}<small>${esc(p.k)}</small></button><span class="chiprow">${stageChips(p)}</span><span class="label op">${ago(p.opened)}</span><button class="pinbtn" data-pin="${p.id}" aria-label="Pin ${esc(p.t)}" title="Pin">☆</button></div>`}).join('')}</div></section>
  <section class="sec"><div class="sh"><h2>Ideas</h2></div>
   <div class="chips" role="group" aria-label="Show">${[['all','All'],['loose','Loose'],...projs.map(p=>[p.id,p.t])].map(([k,l])=>`<button data-nf="${k}" aria-pressed="${NF===k}">${esc(l)}</button>`).join('')}</div>
   ${board(shown,NF!=='all'&&NF!=='loose'?'@'+NF:'')}</section>`;
}
function pCard(c){
  const kids=D.notes.filter(x=>x.parent===c.id),par=byId(D.notes,c.parent),p=byId(D.projects,c.proj);
  const back=par?['card/'+par.id,par.title||'Untitled']:p?['project/'+p.id,p.t]:['writing','Writing'];
  return `<button class="back" data-go="${back[0]}">← ${esc(back[1])}</button>
  <div class="note">${inlT('notes',c,'title','Title')}<textarea class="inl notebody" data-f="notes|${c.id}|body" placeholder="Write anything…" aria-label="Card text">${esc(c.body)}</textarea></div>
  <section class="sec"><div class="sh"><h2>Cards inside</h2></div>${board(kids,c.id)}</section>
  <div class="pmeta" style="margin-top:32px">${!c.parent?`<select class="pselect" data-f="notes|${c.id}|proj" aria-label="Project"><option value="">No project</option>${D.projects.map(x=>`<option value="${x.id}" ${c.proj===x.id?'selected':''}>${esc(x.t)}</option>`).join('')}</select>${!c.proj?`<button class="link" data-promote="${c.id}">Start a project from this</button>`:''}`:''}<button class="link danger" data-del="note|${c.id}">Delete card</button></div>`;
}
function pProject(p){
  const cards=D.notes.filter(n=>n.proj===p.id&&!n.parent);
  const ses=[...(p.sessions||[])].sort((a,b)=>b.d.localeCompare(a.d));
  return `<button class="back" data-go="writing">← Writing</button>
  <div class="ptop"><div>${gen(p)}<button class="link" style="margin-top:6px;font-size:.8rem" data-look="projects|${p.id}">Other look</button></div><div style="min-width:0">${inlT('projects',p,'t','Title')}
   <div class="pmeta">${inl('projects',p,'k','Kind','', 'style="width:7em"')}<button class="link" data-pin="${p.id}">${p.pin?'★ pinned':'☆ pin'}</button>${(p.docs||[]).map(x=>`<span class="doc"><button class="link" data-opendoc="${p.id}|${x.id}">${esc(x.name||'Document')} ↗</button><button class="ib" data-editdoc="${p.id}|${x.id}" aria-label="Edit ${esc(x.name)}" title="Edit link">✎</button></span>`).join('')}<button class="link" data-newdoc="${p.id}">+ document</button></div></div></div>
  <div class="ppage">
   <div style="display:flex;flex-direction:column;gap:22px;min-width:0">
    <div class="box" style="border:1px solid var(--line)"><h3>Where I'm at</h3>
     <div class="phases" role="group" aria-label="Stage">${Object.entries(PHASES).map(([k,l])=>`<button data-phase="${p.id}|${k}" aria-pressed="${p.phase===k}">${l}</button>`).join('')}</div>
     ${['writing','editing','revising'].includes(p.phase)?`<div style="display:flex;gap:8px;align-items:center">Chapter ${inl('projects',p,'ch','#','', 'style="width:4em;border-bottom-color:var(--line);text-align:center"')}</div>`:''}
     ${p.phase!=='done'?`<div class="plotline">Plot ${inlN('projects',p,'plot','Plot done, percent')}% done${p.plot!==''&&p.plot!=null?`<span class="bar"><i style="width:${Math.min(100,+p.plot)}%"></i></span>`:''}</div>`:''}
     <div style="display:flex;gap:8px;align-items:center">Words so far ${inlN('projects',p,'words','Words so far',false)}</div>
     ${inlA('projects',p,'at','Where you left off',2)}</div>
    <div class="box" style="border:1px solid var(--line)"><h3>Sessions</h3>
     <form class="logf" data-form="log|${p.id}"><select name="type" class="form-in" aria-label="Kind of session" style="width:auto">${['writing','plotting','editing','revising'].map(k=>`<option value="${k}" ${k===(p.phase==='done'?'writing':p.phase)?'selected':''}>${PHASES[k]}</option>`).join('')}</select><input name="w" class="form-in" type="number" inputmode="numeric" placeholder="words" aria-label="Words written"><input name="n" class="form-in note" placeholder="note" aria-label="Note"><button class="btn solid">Log</button></form>
     <div class="hist">${ses.map(s=>`<div><span>${nice(s.d)}</span><span>${s.type==='writing'&&s.w?'+'+fmt(s.w)+' words':PHASES[s.type]||''}</span><span>${esc(s.n||'')}</span></div>`).join('')}</div></div>
   </div>
   <div class="box" style="border:1px solid var(--line)"><h3>Notes</h3>${inlA('projects',p,'notes','',8)}</div>
  </div>
  <section class="sec"><div class="sh"><h2>Index cards</h2></div>${board(cards,'@'+p.id)}</section>
  <button class="link danger" style="margin-top:32px" data-del="project|${p.id}">Delete project</button>`;
}

/* ================= days ================= */
function vDays(){
  const fut=D.dates.filter(d=>d.date>=TODAY).sort((a,b)=>a.date.localeCompare(b.date));
  const past=D.dates.filter(d=>d.date<TODAY).sort((a,b)=>b.date.localeCompare(a.date));
  const cols=[['now','Now'],['soon','Soon'],['later','Later']];
  const done=D.tasks.filter(t=>t.done);
  const log=D.rlog[TODAY]||{};
  return head('Days')+`
  <section class="sec"><div class="sh"><h2>Fixed dates</h2><div class="acts"><button class="btn" data-new="date">+ Fixed date</button></div></div>
   <div class="dates">${fut.map(dcard).join('')||'<p class="empty">No fixed dates ahead.</p>'}</div>
   ${past.length?`<p class="label">Passed: ${past.slice(0,3).map(d=>`<button class="link" data-edit="date|${d.id}">${esc(d.t)} (${nice(d.date)})</button>`).join(', ')}</p>`:''}</section>
  <div class="cols two">
   <section class="sec"><div class="sh"><h2>Picked for today</h2></div>
    <div>${D.tasks.filter(pickedToday).map(t=>`${pickRow(t,'task2')}${t.done?`<span class="txt">${esc(t.t)}</span>`:inlW('tasks',t,'t','Task')}<span class="tacts">${t.done?'':`<button class="ib on" data-pick="${t.id}" aria-label="Unpick" title="Unpick">☀</button>`}</span></div>`).join('')||'<p class="empty">Nothing picked.</p>'}</div></section>
   <section class="sec"><div class="sh"><h2>Every day</h2><span class="label">${D.rhythm.filter(r=>log[r.id]).length}/${D.rhythm.length}</span></div>
    <div>${D.rhythm.map(r=>`<div class="task2 ${log[r.id]?'done':''}"><input type="checkbox" class="tick" data-rh="${r.id}" ${log[r.id]?'checked':''} aria-label="${esc(r.t)}">${inl('rhythm',r,'t','Daily item')}<span class="tacts"><button class="ib" data-del="rhythm|${r.id}" aria-label="Remove ${esc(r.t)}">×</button></span></div>`).join('')}
    <form class="addline" data-form="rhythm"><input name="t" placeholder="+ Add" aria-label="New daily item"></form></div></section>
  </div>
  <section class="sec"><div class="sh"><h2>Everything else</h2></div>
   <div class="cols">${cols.map(([k,l],ci)=>{const ts=D.tasks.filter(t=>t.when===k&&!t.done);return `<div class="col"><h3>${l}</h3>
    ${ts.map(t=>{const st=t.steps||[],meta=[t.cat,st.length?`${st.filter(x=>x.done).length}/${st.length}`:''].filter(Boolean).join(' · ');return `<div class="task3"><input type="checkbox" class="tick" data-done="${t.id}" aria-label="Done: ${esc(t.t)}">${inlW('tasks',t,'t','Task')}
     <div class="tline"><span class="tmeta">${esc(meta)}</span><span class="tacts">${ci>0?`<button class="ib" data-mv="${t.id}|-1" aria-label="Move to ${cols[ci-1][1]}" title="Move to ${cols[ci-1][1]}">←</button>`:''}${ci<2?`<button class="ib" data-mv="${t.id}|1" aria-label="Move to ${cols[ci+1][1]}" title="Move to ${cols[ci+1][1]}">→</button>`:''}<button class="ib ${picked(t)?'on':''}" data-pick="${t.id}" aria-label="Pick for today" title="Pick for today">☀</button><button class="ib" data-edit="task|${t.id}" aria-label="More" title="Notes, steps, category">⋯</button></span></div></div>`}).join('')}
    <form class="addline" data-form="task|${k}"><input name="t" placeholder="+ Add" aria-label="New task in ${l}"></form></div>`}).join('')}</div>
   ${done.length?`<div style="margin-top:10px"><button class="link" data-doneopen>${U.doneOpen?'Hide':'Show'} ${done.length} done</button>${U.doneOpen?`<div>${done.map(t=>`<div class="task2 done"><input type="checkbox" class="tick" checked data-undone="${t.id}" aria-label="Not done: ${esc(t.t)}"><span class="txt">${esc(t.t)}</span><span class="label">${nice(t.done)}</span></div>`).join('')}<button class="link" data-cleardone style="margin-top:8px">Clear done</button></div>`:''}</div>`:''}</section>`;
}
function dcard(d){const p=parse(d.date);return `<button class="dcard" data-edit="date|${d.id}"><span class="tb">${esc(d.tag||'Date')}</span><span class="dd"><b>${p.d}</b><span>${MONTHS[p.m-1]} ${p.y}</span></span><span class="dt">${esc(d.t)}${d.time?`<br><span style="font-weight:400;opacity:.8">${esc(d.time)}</span>`:''}</span></button>`}

/* ================= goals ================= */
function gRow(g){const pr=gp(g),par=byId(D.goals,g.parent),ks=kidsOf(g);
  return `<button class="grow" data-go="goal/${g.id}"><span class="gt">${esc(g.t)}${par?`<small>part of ${esc(par.t)}</small>`:''}</span><span class="gpr"><span class="bar"><i style="width:${pr.p}%"></i></span><span class="label">${pr.txt}${ks.length?` · ${ks.length} under it`:''}</span></span></button>`}
function vGoals(){
  const L=U.glvl,P=U.gper[L];
  const pers=L==='year'?[Y]:L==='quarter'?SUB.year(Y):Array.from({length:12},(_,i)=>Y+'-'+String(i+1).padStart(2,'0'));
  const list=D.goals.filter(g=>g.per===P);
  return head('Goals')+`
  <div class="seg" role="group" aria-label="Time frame">${[['year','Year'],['quarter','Quarter'],['month','Month']].map(([k,l])=>`<button data-glvl="${k}" aria-pressed="${L===k}">${l}</button>`).join('')}</div>
  ${L!=='year'?`<div class="chips" style="margin-top:12px" role="group" aria-label="Which ${L}">${pers.map(p=>`<button data-gper="${p}" aria-pressed="${p===P}">${perShort(p)}</button>`).join('')}</div>`:''}
  <section class="sec"><div class="sh"><h2>${perLabel(P)}</h2><div class="acts"><button class="btn" data-new="goal|${P}">+ Goal</button></div></div>
   <div>${list.map(gRow).join('')||'<p class="empty">No goals here yet.</p>'}</div></section>`;
}
/* does period a hold period b? (a year holds its quarters and months, a quarter its months) */
const holds=(a,b)=>{const L=lvlOf(a);return a!==b&&(L==='year'?b.startsWith(a):L==='quarter'?SUB.quarter(a).includes(b):false)};
const planOpts=g=>{const L=lvlOf(g.per);return L==='year'?SUB.year(g.per).map(q=>[q,SUB.quarter(q)]):L==='quarter'?[[null,SUB.quarter(g.per)]]:[]};
function sgCard(k,small){const kp=gp(k);return `<button class="sg ${small?'sm':''}" data-go="goal/${k.id}"><span>${small?`<span class="label">${perShort(k.per)}</span> `:''}${esc(k.t)}</span><span class="bar"><i style="width:${kp.p}%"></i></span><span class="label">${kp.txt}</span></button>`}
function pGoal(g){
  const L=lvlOf(g.per),pr=gp(g),ks=kidsOf(g),ed=U.gedit===g.id;
  const parents=L==='year'?[]:D.goals.filter(x=>x.id!==g.id&&holds(x.per,g.per));
  const perOpts=L==='year'?[Y,String(+Y+1)]:L==='quarter'?SUB.year(Y):Array.from({length:12},(_,i)=>Y+'-'+String(i+1).padStart(2,'0'));
  const numKids=ks.some(k=>k.kind==='number'),manual=g.kind==='number'&&!g.auto&&!numKids;
  const opts=planOpts(g),optHTML=c=>opts.map(([q,ms])=>q?`<optgroup label="Q${q.slice(-1)}"><option value="${q}" ${c&&c.per===q?'selected':''}>Q${q.slice(-1)} (whole)</option>${ms.map(m=>`<option value="${m}" ${c&&c.per===m?'selected':''}>${perShort(m)}</option>`).join('')}</optgroup>`:ms.map(m=>`<option value="${m}" ${c&&c.per===m?'selected':''}>${perShort(m)}</option>`).join('')).join('');
  const sum=`<div class="gsum">
     <div class="gsumtop">${g.kind==='number'?`<b class="big-n">${gval(g)}</b><span>of ${g.target||0}${g.unit?' '+esc(g.unit):''}</span>${manual?`<span class="stepper"><button data-gc="${g.id}|-1" aria-label="Minus one">−</button><button data-gc="${g.id}|1" aria-label="Plus one">+</button></span>`:''}`
       :g.kind==='once'?`<label class="chk"><input type="checkbox" data-gdone="${g.id}" ${g.done?'checked':''}> Done</label>`:`<span>${pr.txt}</span>`}
      <button class="link" data-gedit="${g.id}" style="margin-left:auto">${ed?'Close':'Edit'}</button></div>
     <div class="bar" style="height:6px"><i style="width:${pr.p}%"></i></div></div>`;
  const editor=ed?`<div class="box gbox">
    <div class="seg" role="group" aria-label="Track by" style="align-self:flex-start">${[['number','A number'],['steps','Steps'],['once','Done or not']].map(([k,l])=>`<button data-gkind="${g.id}|${k}" aria-pressed="${g.kind===k}">${l}</button>`).join('')}</div>
    ${g.kind==='number'?`<div class="count">${manual?`Now at ${inlN('goals',g,'v','Current')}`:''}<span>Target</span>${inlN('goals',g,'target','Target')}${inl('goals',g,'unit','books, days…','', 'style="width:8em"')}</div>
      <label class="chk"><input type="checkbox" data-gauto="${g.id}" ${g.auto?'checked':''}> Count books I finish in Reading</label>`:''}
   </div>`:'';
  const steps=g.kind==='steps'?`<div class="steps">${(g.steps||[]).map((st,i)=>{const c=st.child&&byId(D.goals,st.child),dn=stepDone(st);return `<div class="row ${dn?'done':''}"><input type="checkbox" class="tick" data-gstep="${g.id}|${i}" ${dn?'checked':''} ${c?'disabled':''} aria-label="${esc(st.t)}"><input class="inl" data-gstept="${g.id}|${i}" value="${esc(st.t)}" aria-label="Step">${opts.length?`<select class="pselect when" data-gsper="${g.id}|${i}" aria-label="Plan it for"><option value="">—</option>${optHTML(c)}</select>`:''}${c?`<button class="ib" data-go="goal/${c.id}" aria-label="Open ${esc(st.t)}">↗</button>`:''}<button class="ib" data-gsdel="${g.id}|${i}" aria-label="Remove step">×</button></div>`}).join('')}
       <form class="addline" data-form="gstep|${g.id}"><input name="t" placeholder="+ Add a step" aria-label="Add a step"></form></div>`:'';
  let breakdown='';
  if(L==='year'){
    breakdown=`<section class="sec"><div class="sh"><h2>Quarters and months</h2>${g.kind==='number'&&g.target?`<div class="acts"><button class="btn sm" data-split="${g.id}|q">Split into quarters</button><button class="btn sm" data-split="${g.id}|m">…and months</button></div>`:''}</div>
     <div class="slots">${SUB.year(g.per).map(q=>{const qk=ks.filter(k=>k.per===q),mk=ks.filter(k=>holds(q,k.per));
       return `<div class="slot"><span class="label">${perLabel(q)}</span>${qk.map(k=>sgCard(k)+kidsOf(k).filter(m=>holds(q,m.per)).map(m=>sgCard(m,true)).join('')).join('')}${mk.map(m=>sgCard(m,true)).join('')}<button class="link" data-addsub="${g.id}|${q}">+ add</button></div>`}).join('')}</div></section>`;
  }else if(L==='quarter'){
    breakdown=`<section class="sec"><div class="sh"><h2>Months</h2>${g.kind==='number'&&g.target?`<button class="btn sm" data-split="${g.id}|m">Split into months</button>`:''}</div>
     <div class="slots">${SUB.quarter(g.per).map(m=>`<div class="slot"><span class="label">${perLabel(m)}</span>${ks.filter(k=>k.per===m).map(k=>sgCard(k)).join('')}<button class="link" data-addsub="${g.id}|${m}">+ add</button></div>`).join('')}</div></section>`;
  }
  return `<button class="back" data-go="goals">← Goals</button>
  <div class="gpage">
   ${inlT('goals',g,'t','Goal')}
   <div class="pmeta"><select class="pselect" data-gperset="${g.id}" aria-label="When">${perOpts.map(p=>`<option value="${p}" ${p===g.per?'selected':''}>${perLabel(p)}</option>`).join('')}</select>
    ${L!=='year'?`<select class="pselect" data-f="goals|${g.id}|parent" aria-label="Part of"><option value="">Stands alone</option>${parents.map(x=>`<option value="${x.id}" ${g.parent===x.id?'selected':''}>Part of: ${esc(x.t)} (${perShort(x.per)})</option>`).join('')}</select>`:''}</div>
   ${sum}${editor}${steps}${breakdown}
   <button class="link danger" style="margin-top:32px;align-self:flex-start" data-del="goal|${g.id}">Delete goal</button>
  </div>`;
}
/* split a number goal evenly into the next level down; "m" on a year goal goes all the way to months */
function splitGoal(g,deep){
  const L=lvlOf(g.per),subs=SUB[L](g.per),n=subs.length,base=Math.floor((g.target||0)/n),extra=(g.target||0)%n;
  subs.forEach((sp,ix)=>{let k=kidsOf(g).find(x=>x.per===sp&&x.kind==='number');
    if(!k){const share=base+(ix<extra?1:0);let t=g.t.includes(String(g.target))?g.t.replace(String(g.target),share):`${g.t} (${perShort(sp)})`;if(share===1)t=t.replace(/\b1 (\w+)s\b/,'1 $1');k={id:id(),per:sp,parent:g.id,t,kind:'number',target:share,unit:g.unit,auto:g.auto,v:0,steps:[]};D.goals.push(k)}
    if(deep&&lvlOf(sp)==='quarter')splitGoal(k,false)});
}

/* ================= Goodreads import ================= */
function parseCSV(txt){
  const rows=[];let row=[],cur='',q=false;
  for(let i=0;i<txt.length;i++){const c=txt[i];
    if(q){if(c==='"'){if(txt[i+1]==='"'){cur+='"';i++}else q=false}else cur+=c}
    else if(c==='"')q=true;else if(c===','){row.push(cur);cur=''}
    else if(c==='\n'||c==='\r'){if(c==='\r'&&txt[i+1]==='\n')i++;row.push(cur);rows.push(row);row=[];cur=''}
    else cur+=c}
  if(cur||row.length){row.push(cur);rows.push(row)}
  return rows.filter(r=>r.some(x=>x.trim()));
}
function importGoodreads(txt,which){
  const rows=parseCSV(txt.replace(/^\uFEFF/,''));if(rows.length<2)return {added:0,error:'That file looks empty'};
  const H=rows[0].map(h=>h.trim()),col=n=>H.indexOf(n);
  if(col('Title')<0||col('Exclusive Shelf')<0)return {added:0,error:'That doesn\'t look like a Goodreads export'};
  const g=(r,n)=>{const i=col(n);return i<0?'':(r[i]||'').trim()};
  const key=(t,a)=>(t+'|'+a).toLowerCase().replace(/[^a-z0-9|]/g,'');
  const have=new Set(D.books.map(b=>key(b.t,b.a)));
  const EXCL={read:'read','currently-reading':'reading','to-read':'want'};
  let added=0,skipped=0;const noIsbn=[];
  for(const r of rows.slice(1)){
    const sh=g(r,'Exclusive Shelf'),st=EXCL[sh]||(/dnf|did-not-finish|abandon/i.test(sh)?'dnf':'want');
    const end=g(r,'Date Read').replace(/\//g,'-');
    if(which!=='all'&&!(st==='reading'||(st==='read'&&end.startsWith(Y))))continue;
    const t=g(r,'Title').replace(/\s*\([^)]*#[^)]*\)\s*$/,''),a=g(r,'Author');if(!t)continue;
    if(have.has(key(t,a))){skipped++;continue}have.add(key(t,a));
    const isbn=(g(r,'ISBN13')||g(r,'ISBN')).replace(/[^0-9X]/gi,'');
    const bind=g(r,'Binding'),rating=+g(r,'My Rating')||0;
    const shelves=g(r,'Bookshelves').split(',').map(x=>x.trim().toLowerCase()).filter(x=>x&&!EXCL[x]&&x!==sh);
    shelves.forEach(x=>{if(!D.shelves.includes(x))D.shelves.push(x)});
    const b={id:id(),t,a,st,fmt:/kindle|ebook|nook/i.test(bind)?'Ebook':/audio/i.test(bind)?'Audiobook':'Physical',sh:shelves,times:+g(r,'Read Count')||(st==='read'?1:0),
      grades:rating?{Enjoyment:rating}:{},review:g(r,'My Review').replace(/<br\s*\/?>/gi,'\n').replace(/<[^>]+>/g,''),notes:g(r,'Private Notes'),genre:'',
      pages:+g(r,'Number of Pages')||'',pmode:'pages',pg:'',pct:'',start:'',end:st==='read'?end:'',
      cover:isbn?`https://covers.openlibrary.org/b/isbn/${isbn}-L.jpg?default=false`:''};
    D.books.push(b);added++;if(!isbn)noIsbn.push(b);
  }
  /* look up covers for books without an ISBN, one at a time so Open Library isn't flooded */
  (async()=>{for(const b of noIsbn){await findCover(b);await new Promise(r=>setTimeout(r,300))}if(noIsbn.length)render()})();
  return {added,skipped};
}

/* ================= centered popups (small things) ================= */
const F={
 text:(k,l,v,ph='')=>`<label class="f"><span>${l}</span><input name="${k}" value="${esc(v)}" placeholder="${esc(ph)}"></label>`,
 area:(k,l,v,ph='')=>`<label class="f"><span>${l}</span><textarea name="${k}" placeholder="${esc(ph)}">${esc(v)}</textarea></label>`,
 num:(k,l,v)=>`<label class="f"><span>${l}</span><input name="${k}" type="number" inputmode="numeric" value="${esc(v??'')}"></label>`,
 date:(k,l,v)=>`<label class="f"><span>${l}</span><input name="${k}" type="date" value="${esc(v||'')}"></label>`,
 sel:(k,l,v,opts)=>`<label class="f"><span>${l}</span><select name="${k}">${opts.map(o=>{const [val,lab]=Array.isArray(o)?o:[o,o];return `<option value="${esc(val)}" ${String(v)===String(val)?'selected':''}>${esc(lab)}</option>`}).join('')}</select></label>`
};
const two=(a,b)=>`<div class="f2">${a}${b}</div>`;
const DOCHINT='<p class="hint"><b>Scrivener:</b> click the Draft folder, then Edit → Copy Special → Copy Document Link.<br><b>Pages:</b> save it in iCloud Drive, then Share → Copy Link.</p>';
function pop(kind,obj,isNew){
  let title='',body='';
  if(kind==='book'){title='Add a book';body=`<label class="f"><span>Search</span><input name="q" type="search" placeholder="Title or author" data-olq autocomplete="off"></label><div class="olres" aria-live="polite"></div>`+two(F.text('t','Title',''),F.text('a','Author',''))+F.sel('st','Status','want',Object.entries(ST).map(([k,v])=>[k,v[0]]))}
  if(kind==='project'){title='New project';body=F.text('t','Title',obj.t||'')+F.text('k','Kind','Novel','Novel, short story, poetry…')+two(F.text('name','Document name (optional)','Scrivener'),F.text('url','Link (optional)','','Paste the link'))+DOCHINT}
  if(kind==='doc'){title=isNew?'Add a document':'Document';body=F.text('name','Name',obj.name,'Scrivener, Pages draft…')+F.text('url','Link',obj.url,'Paste the link')+DOCHINT}
  if(kind==='import'){title='Import from Goodreads';body=`<label class="f"><span>Goodreads export file (.csv)</span><input type="file" name="file" accept=".csv,text/csv" required></label>`+F.sel('which','Which books','year',[['year',`Read in ${Y}, plus what you're reading now`],['all','Everything in the file']])+'<p class="hint">On Goodreads: My Books → Import and export → Export Library. Books you already have here are skipped.</p>'}
  if(kind==='cover'){title='Cover image';body=F.text('cover','Image link',obj.cover==='none'?'':obj.cover,'https://…')+'<p class="hint">Right-click a cover image anywhere online, copy the image address, and paste it here.</p>'}
  if(kind==='quote'){title=isNew?'Add a quote':'Quote';body=F.area('text','Quote',obj.text)+two(F.sel('book','Book',obj.book,D.books.map(b=>[b.id,b.t])),F.text('page','Page',obj.page))}
  if(kind==='shelf'){title='New shelf';body=F.text('name','Shelf name','','cozy, rereads, summer…')}
  if(kind==='task'){const st=obj.steps||[];title='Task';body=F.text('t','What',obj.t)+two(F.sel('when','When',obj.when,[['now','Now'],['soon','Soon'],['later','Later']]),F.text('cat','Category (optional)',obj.cat,'home, school, work…'))+F.area('note','Note (optional)',obj.note)
    +`<div class="f"><span>Small steps (optional)</span><div class="msteps">${st.map((s,i)=>`<label><input type="checkbox" name="sd" value="${i}" ${s.done?'checked':''} aria-label="Step done"><input type="text" name="s${i}" value="${esc(s.t)}" aria-label="Step"></label>`).join('')}<label><span style="width:13px"></span><input type="text" name="snew" placeholder="Add a step"></label></div></div>`
    +F.date('due','Soft "by" date (optional)',obj.due)}
  if(kind==='date'){title=isNew?'New fixed date':'Fixed date';body=F.text('t','What',obj.t,'Pay rent')+two(F.date('date','Date',obj.date||TODAY),F.text('time','Time (optional)',obj.time,'2:30 pm'))+F.text('tag','Label',obj.tag,'Bill, appointment, deadline…')}
  if(kind==='goal'){title='New goal';body=F.text('t','Goal','')+`<p class="hint">${perLabel(obj.per)}${obj.parent?' · part of '+esc(byId(D.goals,obj.parent)?.t||''):''}</p>`
    +F.sel('kind','Track by',obj.kind||'steps',[['number','A number'],['steps','Steps'],['once','Done or not']])
    +two(F.num('target','Target (for a number)',obj.target),F.text('unit','Unit',obj.unit||'','books, days…'))}
  U.pop={kind,id:obj.id,isNew,obj};
  const canDel=!isNew&&['quote','task','date','doc'].includes(kind);
  document.getElementById('layer').innerHTML=`<div class="scrim" data-scrim><div class="modal" role="dialog" aria-modal="true" aria-label="${esc(title)}">
   <h2>${esc(title)}</h2>
   <form data-form="pop" style="display:flex;flex-direction:column;gap:12px">${body}
    <div class="bar2"><button class="btn solid">${isNew?'Add':'Save'}</button><button type="button" class="btn" data-close>Cancel</button>${canDel?`<button type="button" class="del" data-delpop>Delete</button>`:''}</div></form></div></div>`;
  document.querySelector('.modal input:not([type=checkbox]),.modal textarea')?.focus();
}
const COLL={book:'books',quote:'quotes',project:'projects',note:'notes',task:'tasks',date:'dates',rhythm:'rhythm',goal:'goals'};
function readForm(f){const o={};const fd=new FormData(f);for(const [k,v] of fd.entries()){if(o[k]!==undefined){o[k]=[].concat(o[k],v)}else o[k]=v}return o}
function applyPop(f){
  const {kind,id:oid,isNew}=U.pop;const v=readForm(f);const T=s=>(s||'').trim();
  if(kind==='shelf'){const n=T(v.name).toLowerCase();if(n&&!D.shelves.includes(n))D.shelves.push(n);return close()}
  if(kind==='book'){if(!T(v.a)&&!T(v.t))return;const ol=U.pop.ol&&U.pop.ol.title===T(v.t)?U.pop.ol:null;const b={id:id(),t:T(v.t)||'Untitled',a:T(v.a),st:v.st,fmt:'Physical',sh:[],own:'Own it',times:0,grades:{},review:'',notes:'',genre:'',pages:ol&&ol.pages||'',pmode:'pages',pg:'',pct:'',start:v.st==='reading'?TODAY:'',end:'',cover:ol&&ol.cover||''};D.books.push(b);close(false);toast('Added');if(!b.cover)findCover(b).then(ok=>{if(ok)render()});return go('book/'+b.id)}
  if(kind==='doc'){const p=byId(D.projects,U.pop.proj);if(!p||!T(v.url))return;p.docs=p.docs||[];if(isNew)p.docs.push({id:id(),name:T(v.name)||'Document',url:T(v.url)});else Object.assign(byId(p.docs,oid)||{},{name:T(v.name)||'Document',url:T(v.url)});return close()}
  if(kind==='import'){const file=f.file.files[0];if(!file)return;file.text().then(txt=>{const r=importGoodreads(txt,v.which);close();toast(r.added?`Added ${r.added} book${r.added>1?'s':''}${r.skipped?`, skipped ${r.skipped} already here`:''}`:r.error||'No new books found in that file')}).catch(()=>toast('Couldn\'t read that file'));return}
  if(kind==='cover'){const b=byId(D.books,oid);if(b)b.cover=T(v.cover)||'none';return close()}
  if(kind==='project'){if(!T(v.t))return;const p={id:id(),t:T(v.t),k:T(v.k),pin:false,phase:'plotting',ch:'',at:U.pop.seed||'',notes:'',docs:T(v.url)?[{id:id(),name:T(v.name)||'Scrivener',url:T(v.url)}]:[],plot:'',words:'',opened:TODAY,sessions:[]};D.projects.push(p);if(U.pop.idea){const i=byId(D.notes,U.pop.idea);if(i)i.proj=p.id}close(false);toast('Project started');return go('project/'+p.id)}
  if(kind==='goal'){if(!T(v.t))return;const o=U.pop.obj,g={id:id(),t:T(v.t),per:o.per,parent:o.parent||'',kind:v.kind,target:Number(v.target||0),unit:T(v.unit),auto:!!o.auto&&v.kind==='number',v:0,steps:[],done:false};D.goals.push(g);close(false);toast('Goal added');return go('goal/'+g.id)}
  const coll=D[COLL[kind]];let o=isNew?{id:id()}:byId(coll,oid);
  if(kind==='quote'){if(!T(v.text))return;Object.assign(o,{text:T(v.text),book:v.book,page:v.page})}
  if(kind==='task'){if(!T(v.t))return;const steps=(o.steps||[]).map((s,i)=>({t:T(v['s'+i]),done:[].concat(v.sd||[]).includes(String(i))})).filter(s=>s.t);if(T(v.snew))steps.push({t:T(v.snew),done:false});Object.assign(o,{t:T(v.t),when:v.when,cat:T(v.cat),note:T(v.note),due:v.due,steps})}
  if(kind==='date'){if(!T(v.t)||!v.date)return;Object.assign(o,{t:T(v.t),date:v.date,time:v.time,tag:v.tag})}
  if(isNew)coll.push(o);
  toast(isNew?'Added':'Saved');close();
}
function remove(kind,oid){
  const key=COLL[kind],coll=D[key],i=coll.findIndex(x=>x.id===oid);if(i<0)return;
  const [it]=coll.splice(i,1);const snap={key,i,it,extra:[]};
  if(kind==='book'){snap.extra=D.quotes.filter(q=>q.book===oid).map(x=>['quotes',x]);D.quotes=D.quotes.filter(q=>q.book!==oid)}
  if(kind==='note'){snap.extra=D.notes.filter(x=>x.parent===oid).map(x=>['notes',x]);D.notes=D.notes.filter(x=>x.parent!==oid)}
  if(kind==='goal')D.goals.forEach(g=>{if(g.parent===oid)g.parent='';(g.steps||[]).forEach(x=>{if(x.child===oid)x.child=''})});
  if(kind==='project')D.notes.forEach(x=>{if(x.proj===oid)x.proj=''});
  U.undo=snap;toast(`Deleted “${(it.t||it.text||'item').slice(0,40)}”`,true);
  const it2=it;if(kind==='book')go('reading');else if(kind==='project')go('writing');else if(kind==='note')go(it2.parent?'card/'+it2.parent:it2.proj?'project/'+it2.proj:'writing');else if(kind==='goal')go('goals');else render();
}
function undo(){const s=U.undo;if(!s)return;D[s.key].splice(s.i,0,s.it);s.extra.forEach(([k,x])=>D[k].push(x));U.undo=null;toast('Restored');if(s.key==='books')go('book/'+s.it.id);else if(s.key==='projects')go('project/'+s.it.id);else render()}
let tt;function toast(msg,canUndo){document.getElementById('toast').innerHTML=`<div class="toast" role="status"><span>${esc(msg)}</span>${canUndo?'<button data-undo>Undo</button>':''}</div>`;clearTimeout(tt);tt=setTimeout(()=>document.getElementById('toast').innerHTML='',canUndo?6000:2200)}
function close(r=true){U.pop=null;document.getElementById('layer').innerHTML='';if(r)render()}

/* ================= render & events ================= */
let shownDay=TODAY;
function render(){
  setDay();if(TODAY!==shownDay){shownDay=TODAY;newDay();U.gper={...CUR};U.qi=-1}
  const a=document.activeElement,keep=a&&a.dataset&&(a.dataset.f||a.dataset.fav||a.dataset.gstept),ks=a&&a.selectionStart;
  const R=route();
  if(R.room==='writing'&&location.hash.startsWith('#project/')){const p=byId(D.projects,location.hash.split('/')[1]);if(p&&p.opened!==TODAY)p.opened=TODAY}
  save();
  document.body.dataset.room=R.room;
  document.getElementById('nav').innerHTML=ROOMS.map(([k,l,c])=>`<button data-go="${k}" ${R.room===k?'aria-current="page"':''}><i style="background:var(${c})"></i>${l}</button>`).join('');
  document.getElementById('main').innerHTML=R.view();
  if(keep){const el=document.querySelector(`[data-f="${keep}"],[data-fav="${keep}"],[data-gstept="${keep}"]`);if(el){el.focus();try{el.setSelectionRange(ks,ks)}catch(e){}}}
  showStatus();
}
window.addEventListener('hashchange',()=>{close(false);window.scrollTo(0,0);render()});
document.addEventListener('click',e=>{
  if(e.target.matches('[data-scrim]')){close();return}
  const t=e.target.closest('button');if(!t)return;const d=t.dataset;
  if(d.go){go(d.go);return}
  if('close' in d){close();return}
  if('undo' in d){undo();return}
  if(d.edit){const [k,i]=d.edit.split('|');const o=byId(D[COLL[k]],i);if(o)pop(k,o,false);return}
  if(d.new){const [k,ref]=d.new.split('|');const o=k==='goal'?(ref==='books'?{per:Y,kind:'number',unit:'books',auto:true,target:12}:{per:ref||U.gper[U.glvl],kind:'steps'}):k==='quote'?{text:'',book:D.books.find(b=>b.st==='reading')?.id||D.books[0]?.id,page:''}:k==='date'?{t:'',date:TODAY,tag:''}:{kind:ref};pop(k,o,true);return}
  if('delpop' in d){const {kind,id:oid}=U.pop;if(kind==='doc'){const p=byId(D.projects,U.pop.proj);p.docs=p.docs.filter(x=>x.id!==oid);close();toast('Link removed');return}close(false);remove(kind,oid);return}
  if(d.del){const [k,i]=d.del.split('|');remove(k,i);return}
  if(d.promote){const s=byId(D.notes,d.promote);pop('project',{t:s.title},true);U.pop.idea=s.id;return}
  if('newcard' in d){const r=d.newcard,n={id:id(),title:'',body:'',proj:r.startsWith('@')?r.slice(1):'',parent:r&&!r.startsWith('@')?r:''};D.notes.push(n);save();go('card/'+n.id);setTimeout(()=>document.querySelector('textarea.big')?.focus(),50);return}
  if(d.addsub){const [gi,per]=d.addsub.split('|');pop('goal',{per,parent:gi,kind:'steps'},true);return}
  if(d.newdoc){pop('doc',{name:'',url:''},true);U.pop.proj=d.newdoc;return}
  if(d.editdoc){const [pi,di]=d.editdoc.split('|');pop('doc',byId(byId(D.projects,pi).docs,di),false);U.pop.proj=pi;return}
  if(d.opendoc){const [pi,di]=d.opendoc.split('|');const p=byId(D.projects,pi),x=byId(p.docs,di);p.opened=TODAY;save();if(/^https?:/i.test(x.url))window.open(x.url,'_blank','noopener');else location.href=x.url;return}
  if('shuffle' in d){const n=quotePool().length;if(n>1){let k;do{k=Math.floor(Math.random()*n)}while(k===U.qi);U.qi=k}}
  else if(d.rhb){D.rlog[TODAY]=D.rlog[TODAY]||{};D.rlog[TODAY][d.rhb]=!D.rlog[TODAY][d.rhb]}
  else if(d.filter){U.filter=d.filter}
  else if(d.shelf){U.shelf=U.shelf===d.shelf?'':d.shelf}
  else if(d.bst){const [i,s]=d.bst.split('|');const b=byId(D.books,i);b.st=s;if(s==='reading'&&!b.start)b.start=TODAY;if(s==='read'){if(!b.end)b.end=TODAY;if(!b.times)b.times=1}}
  else if(d.finish){const b=byId(D.books,d.finish);b.st='read';b.end=b.end||TODAY;b.times=(b.times||0)+1;if(b.pmode==='pages'&&b.pages)b.pg=b.pages;if(b.pmode==='pct')b.pct=100;toast(`Finished ${b.t}. Grade it below if you like.`)}
  else if(d.pmode){const [i,m]=d.pmode.split('|');byId(D.books,i).pmode=m}
  else if(d.times){const [i,n]=d.times.split('|');const b=byId(D.books,i);b.times=Math.max(0,(b.times||0)+Number(n))}
  else if(d.bsh){const [i,s]=d.bsh.split('|');const b=byId(D.books,i);b.sh=b.sh.includes(s)?b.sh.filter(x=>x!==s):[...b.sh,s]}
  else if(d.grade){const [i,k,n]=d.grade.split('|');const b=byId(D.books,i),cur=b.grades[k]||0,N=+n;b.grades[k]=cur>N-1&&cur<=N?(cur-.25<=N-1?0:cur-.25):N}
  else if(d.pin){const p=byId(D.projects,d.pin);p.pin=!p.pin;toast(p.pin?'Pinned':'Unpinned')}
  else if(d.phase){const [i,ph]=d.phase.split('|');byId(D.projects,i).phase=ph}
  else if(d.mv){const [i,dir]=d.mv.split('|');const o=['now','soon','later'];const tk=byId(D.tasks,i);tk.when=o[o.indexOf(tk.when)+Number(dir)]}
  else if(d.pick){const tk=byId(D.tasks,d.pick);tk.pick=picked(tk)?'':TODAY}
  else if('doneopen' in d){U.doneOpen=!U.doneOpen}
  else if('cleardone' in d){const n=D.tasks.filter(x=>x.done).length;D.tasks=D.tasks.filter(x=>!x.done);toast(`Cleared ${n} done`)}
  else if(d.glvl){U.glvl=d.glvl}
  else if(d.gper){U.gper[U.glvl]=d.gper}
  else if(d.nf){U.nf=d.nf}
  else if(d.gkind){const [i,k]=d.gkind.split('|');byId(D.goals,i).kind=k}
  else if(d.split){const [gi,how]=d.split.split('|'),g=byId(D.goals,gi);splitGoal(g,how==='m'&&lvlOf(g.per)==='year');toast(how==='m'?'Split into months':'Split into quarters')}
  else if(d.gedit){U.gedit=U.gedit===d.gedit?'':d.gedit}
  else if(d.gc){const [i,n]=d.gc.split('|');const g=byId(D.goals,i);g.v=Math.max(0,(Number(g.v)||0)+Number(n))}
  else if(d.gsdel){const [i,n]=d.gsdel.split('|');const g=byId(D.goals,i),[st]=g.steps.splice(+n,1);const c=st&&st.child&&byId(D.goals,st.child);if(c)c.parent=''}
  else if('export' in d){const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([JSON.stringify(D,null,1)],{type:'application/json'}));a.download=`second-brain-${TODAY}.json`;a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1000);return}
  else if('signout' in d){if(t.dataset.armed){Store.signOut().then(()=>location.reload());return}t.dataset.armed='1';t.textContent='Tap again to sign out';setTimeout(()=>{if(t.isConnected){t.textContent='Sign out';delete t.dataset.armed}},4000);return}
  else if(d.findcover){const b=byId(D.books,d.findcover);t.textContent='Looking…';findCover(b,true).then(ok=>{if(!ok)toast('No cover found. You can paste an image link instead.');render()});return}
  else if(d.look){const [c,i]=d.look.split('|');const o=byId(D[c],i);o.look=(o.look||0)+1}
  else if(d.nocover){const b=byId(D.books,d.nocover);b.cover='none';}
  else if(d.linkcover){pop('cover',byId(D.books,d.linkcover),false);return}
  else if(d.olpick!==undefined&&d.olpick!==''&&U.pop&&U.pop.res){const r=U.pop.res[+d.olpick];const f=t.closest('form');f.t.value=r.title;f.a.value=r.author;U.pop.ol=r;f.querySelectorAll('[data-olpick]').forEach(x=>x.setAttribute('aria-pressed',x===t));return}
  else return;
  render();
});
document.addEventListener('change',e=>{
  const x=e.target,d=x.dataset;
  if(d.f){const [c,i,f]=d.f.split('|');const o=byId(D[c],i);if(!o)return;let v='num' in d?(x.value===''?'':Math.max(0,Number(x.value))):x.value;if(f==='t'&&typeof v==='string'&&!v.trim()){x.value=o.t;return}o[f]=v;save();if('rr' in d||x.tagName==='SELECT'||x.type==='date')setTimeout(render,0);return}
  if(d.fav){D.favs[YM]=D.favs[YM]||{};D.favs[YM][d.fav]=x.value;save();return}
  if(d.gstept){const [i,n]=d.gstept.split('|');const st=byId(D.goals,i).steps[+n];st.t=x.value;const c=st.child&&byId(D.goals,st.child);if(c)c.t=x.value;save();return}
  if(d.gsper){const [i,n]=d.gsper.split('|');const g=byId(D.goals,i),st=g.steps[+n];let c=st.child&&byId(D.goals,st.child);
    if(x.value){if(c)c.per=x.value;else{c={id:id(),per:x.value,parent:g.id,t:st.t,kind:'steps',steps:[]};D.goals.push(c);st.child=c.id}}
    else if(c){if(!(c.steps||[]).length&&!kidsOf(c).length)D.goals=D.goals.filter(k=>k.id!==c.id);else c.parent='';st.child=''}
    render();return}
  if(d.gperset){const g=byId(D.goals,d.gperset);g.per=x.value;const par=byId(D.goals,g.parent);if(par&&!holds(par.per,g.per))g.parent='';render();return}
  if(d.gauto){byId(D.goals,d.gauto).auto=x.checked;render();return}
  if(d.gdone){byId(D.goals,d.gdone).done=x.checked;render();return}
  if(d.gstep){const [i,n]=d.gstep.split('|');byId(D.goals,i).steps[+n].done=x.checked;render();return}
  if(d.done){const tk=byId(D.tasks,d.done);tk.done=TODAY;toast(`Done: ${tk.t}`);save();setTimeout(render,250);return}
  if(d.undone){const tk=byId(D.tasks,d.undone);tk.done='';render();return}
  if(d.rh){D.rlog[TODAY]=D.rlog[TODAY]||{};D.rlog[TODAY][d.rh]=x.checked;render();return}
});
let olT;
document.addEventListener('input',e=>{
  const x=e.target;if(!('olq' in x.dataset))return;
  const box=x.form.querySelector('.olres'),q=x.value.trim();clearTimeout(olT);
  if(q.length<3){box.innerHTML='';return}
  olT=setTimeout(async()=>{
    box.innerHTML='<p class="hint">Searching…</p>';
    try{const res=await olSearch(q);if(!U.pop||x.value.trim()!==q)return;U.pop.res=res;
      box.innerHTML=res.length?res.map((r,i)=>`<button type="button" class="olhit" data-olpick="${i}" aria-pressed="false">${r.cover?`<img src="${esc(r.cover.replace('-L.','-S.'))}" alt="" loading="lazy">`:'<span class="noimg"></span>'}<span><b>${esc(r.title)}</b><small>${esc([r.author,r.year].filter(Boolean).join(' · '))}</small></span></button>`).join(''):'<p class="hint">Nothing found. Type the title and author below.</p>'}
    catch(err){box.innerHTML='<p class="hint">Search isn\'t reachable right now. Type the title and author below.</p>'}
  },350);
});
document.addEventListener('keydown',e=>{
  if(e.key==='Enter'&&e.target.matches('[data-olq]')){e.preventDefault();e.target.form.querySelector('[data-olpick]')?.click();return}
  if(e.key==='Escape'&&U.pop)close();
  if(e.key==='Enter'&&e.target.matches('input.inl,textarea.big,textarea.tname')&&!e.target.closest('form')){e.preventDefault();e.target.blur()}
});
document.addEventListener('submit',e=>{
  e.preventDefault();const f=e.target,[k,ref]=(f.dataset.form||'').split('|');const v=readForm(f);const T=s=>(s||'').trim();
  if(k==='pop'){applyPop(f);return}
  if(k==='quote'){if(!T(v.text))return;D.quotes.push({id:id(),book:ref,text:T(v.text),page:T(v.page)});toast('Quote saved');}
  else if(k==='log'){const p=byId(D.projects,ref);const w=Number(v.w||0);if(!w&&!T(v.n))return;p.sessions=p.sessions||[];p.sessions.push({d:TODAY,type:v.type,w:v.type==='writing'?w:0,n:T(v.n)});toast(v.type==='writing'&&w?`Logged ${fmt(w)} words`:'Session logged')}
  else if(k==='rhythm'){if(!T(v.t))return;D.rhythm.push({id:id(),t:T(v.t)})}
  else if(k==='task'){if(!T(v.t))return;D.tasks.push({id:id(),t:T(v.t),when:ref})}
  else if(k==='gstep'){if(!T(v.t))return;const g=byId(D.goals,ref);g.steps=g.steps||[];g.steps.push({t:T(v.t),done:false})}
  else return;
  const sel=k+'|'+ref;render();setTimeout(()=>document.querySelector(`form[data-form="${CSS.escape(sel)}"] input,form[data-form="${CSS.escape(sel)}"] textarea`)?.focus(),0);
});
