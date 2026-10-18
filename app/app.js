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
function blank(){return {shelves:['favorites'],books:[],quotes:[],favs:{},projects:[],notes:[],tasks:[],dates:[],repeats:[],rhythm:[],rlog:{},goals:[],days:{},weeks:{},wraps:{},tlog:{},challenges:[],wheel:[],sessions:[]}}
/* fill in anything missing so older or partial data never breaks a page */
function fix(d){const b=blank();d=d&&typeof d==='object'&&!Array.isArray(d)?d:{};for(const k in b)if(!d[k]||typeof d[k]!=='object'||Array.isArray(d[k])!==Array.isArray(b[k]))d[k]=b[k];
  d.books.forEach(x=>{x.sh=Array.isArray(x.sh)?x.sh:[];if(!Array.isArray(x.tags)){x.tags=(x.genre||'').split(',').map(t=>t.trim().toLowerCase()).filter(Boolean);delete x.genre}x.grades=x.grades&&typeof x.grades==='object'?x.grades:{};x.past=Array.isArray(x.past)?x.past:[];x.log=Array.isArray(x.log)?x.log:[]});d.challenges.forEach(c=>{c.prompts=Array.isArray(c.prompts)?c.prompts:[]});d.projects.forEach(x=>{x.sessions=Array.isArray(x.sessions)?x.sessions:[];if(!Array.isArray(x.docs)){x.docs=x.file?[{id:'doc'+x.id,name:'Scrivener',url:x.file}]:[];delete x.file}});return d}
let D=fix(Store.load());
/* ---------- repeating tasks and dates ---------- */
const dOf=s=>new Date(s+'T12:00:00');
const plusD=(s,n)=>{const x=dOf(s);x.setDate(x.getDate()+n);return iso(x)};
const wdOf=s=>(dOf(s).getDay()+6)%7;   /* Monday = 0 */
const daysIn=(y,m)=>new Date(y,m,0).getDate();
const clampD=(y,m,dd)=>{while(m>12){m-=12;y++}return iso(new Date(y,m-1,Math.min(dd,daysIn(y,m))))};
const WD=['Mon','Tue','Wed','Thu','Fri','Sat','Sun'];
/* r = {t, kind:'week'|'month', days:[0-6], every:1|2, md:1-31, start} */
function dueOn(r,k){
  if(r.start&&k<r.start)return false;
  if(r.kind==='month'){const y=+k.slice(0,4),m=+k.slice(5,7);return +k.slice(8)===Math.min(+r.md||1,daysIn(y,m))}
  if(!(r.days||[]).includes(wdOf(k)))return false;
  if(+r.every===2){const a=plusD(r.start||k,-wdOf(r.start||k)),b=plusD(k,-wdOf(k));return Math.round((dOf(b)-dOf(a))/(7*DAY))%2===0}
  return true;
}
const repTxt=r=>r.kind==='month'?`monthly · the ${ord(+r.md||1)}`:(+r.every===2?'every 2 weeks · ':'')+((r.days||[]).length===7?'every day':[...(r.days||[])].sort().map(i=>WD[i]).join(', '));
const ord=n=>n+(n%100>10&&n%100<14?'th':['th','st','nd','rd'][n%10]||'th');
/* a fixed date that repeats shows its next time */
function occ(d){
  if(!d.rep||!d.date||d.date>=TODAY)return d.date;
  const y=+TODAY.slice(0,4),m=+TODAY.slice(5,7),dd=+d.date.slice(8);
  if(d.rep==='year'){const k=clampD(y,+d.date.slice(5,7),dd);return k>=TODAY?k:clampD(y+1,+d.date.slice(5,7),dd)}
  if(d.rep==='month'){const k=clampD(y,m,dd);return k>=TODAY?k:clampD(y,m+1,dd)}
  if(d.rep==='week'){const n=Math.round((dOf(TODAY)-dOf(d.date))/DAY);return plusD(d.date,Math.ceil(n/7)*7)}
  return d.date;
}
const REPD={year:'every year',month:'every month',week:'every week'};
/* today's copy of a repeating task: same id on every device, so phone and computer never make two */
function makeRepeats(){
  for(const r of D.repeats){if(r.made===TODAY||!dueOn(r,TODAY))continue;
    const tid='r'+r.id.slice(0,8)+TODAY.replace(/-/g,'');
    if(!byId(D.tasks,tid))D.tasks.push({id:tid,t:r.t,when:'now',pick:TODAY,from:r.id,cat:r.cat||''});
    r.made=TODAY}
}
/* yesterday's unfinished picks quietly go back to their list; an unfinished repeating task just goes away until next time */
/* tasks given a day in the Monday plan get picked that morning */
function newDay(){
  const tag=TODAY.replace(/-/g,'');D.tasks=D.tasks.filter(t=>!(t.from&&!t.done&&!t.id.endsWith(tag)));
  D.tasks.forEach(t=>{if(t.pick&&t.pick!==TODAY&&!t.done)t.pick='';if(t.day&&t.day<=TODAY){if(t.day===TODAY&&!t.done)t.pick=TODAY;t.day=''}});
  makeRepeats();
}
newDay();
function save(){Store.save(D)}
const U={rf:{},rq:'',gedit:'',filter:'all',shelf:'',nf:'all',glvl:'year',gper:{...CUR},pop:null,undo:null,doneOpen:false,qi:-1};

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
/* book covers: cover() is in reading.js */
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
const SORTS={recent:['recently finished',(a,b)=>(b.end||'').localeCompare(a.end||'')],rating:['my rating',(a,b)=>avg(b)-avg(a)],title:['title',(a,b)=>a.t.localeCompare(b.t)],author:['author',(a,b)=>(a.a.split(' ').pop()||'').localeCompare(b.a.split(' ').pop()||'')],pages:['longest',(a,b)=>(+b.pages||0)-(+a.pages||0)]};
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
const ROOMS=[['home','Today','--k-home'],['reading','Reading','--k-read'],['writing','Writing','--k-write'],['days','Days','--k-days'],['goals','Goals','--k-goals'],['journal','Journal','--k-journal']];
const isDay=s=>/^\d{4}-\d\d-\d\d$/.test(s||''),isYM=s=>/^\d{4}-\d\d$/.test(s||'');
function route(){
  const [a,b]=(location.hash.slice(1)||'home').split('/');
  if(a==='book'&&byId(D.books,b))return {room:'reading',view:()=>pBook(byId(D.books,b))};
  if(a==='project'&&byId(D.projects,b))return {room:'writing',view:()=>pProject(byId(D.projects,b))};
  if(a==='card'&&byId(D.notes,b))return {room:'writing',view:()=>pCard(byId(D.notes,b))};
  if(a==='goal'&&byId(D.goals,b))return {room:'goals',view:()=>pGoal(byId(D.goals,b))};
  if(a==='entry'&&isDay(b)&&b<=TODAY)return {room:'journal',view:()=>pEntry(b)};
  if(a==='week'&&isDay(b))return {room:'journal',view:()=>pWeek(monOf(b))};
  if(a==='wrap'&&isYM(b)&&b<YM)return {room:'journal',view:()=>pWrapQ(b)};
  if(a==='wrapped'&&(isYM(b)&&b<YM||/^\d{4}$/.test(b||'')&&b<=Y))return {room:'wrapped',view:()=>pWrapped(b)};
  const r=ROOMS.find(x=>x[0]===a)?a:'home';
  return {room:r,view:{home:vHome,reading:vReading,writing:vWriting,days:vDays,goals:vGoals,journal:vJournal}[r]};
}
function go(h){if((location.hash.slice(1)||'home')===h)render();else location.hash=h}
function head(title){return `<section class="head"><h1>${title}</h1></section>`}

/* ================= today ================= */
const nextDates=()=>D.dates.map(d=>({...d,date:occ(d)})).filter(d=>d.date&&d.date>=TODAY).sort((a,b)=>a.date.localeCompare(b.date));
const POEMS=[
 ['Hope is the thing with feathers\nThat perches in the soul','Emily Dickinson'],
 ['Forever – is composed of Nows –','Emily Dickinson'],
 ['Tell all the truth but tell it slant','Emily Dickinson'],
 ['A thing of beauty is a joy for ever:\nIts loveliness increases','John Keats'],
 ['Life has loveliness to sell,\nAll beautiful and splendid things','Sara Teasdale, “Barter”'],
 ['I exist as I am, that is enough','Walt Whitman'],
 ['The world is too much with us; late and soon','William Wordsworth']
];
/* three random quotes, picked again each time Reading opens or on "other quotes" */
function threeQuotes(){let ids=(U.q3||[]).filter(i=>byId(D.quotes,i));if(ids.length<Math.min(3,D.quotes.length)){const rest=D.quotes.map(q=>q.id).filter(i=>!ids.includes(i)).sort(()=>Math.random()-.5);ids=[...ids,...rest].slice(0,3)}U.q3=ids;return ids.map(i=>byId(D.quotes,i))}
function quotePool(){return [...D.quotes.map(q=>{const b=byId(D.books,q.book);return {text:q.text,src:b?b.t:'',kind:'From your quotes',book:q.book}}),...POEMS.map(([text,src])=>({text,src,kind:'A little poem'}))]}
function vHome(){
  const now=new Date(),hr=now.getHours();
  const hi=hr<12?'Good morning':hr<18?'Good afternoon':'Good evening';
  const picks=D.tasks.filter(pickedToday),left=picks.filter(t=>!t.done).length;
  const upcoming=nextDates();
  const reading=D.books.filter(b=>b.st==='reading');
  const pins=D.projects.filter(p=>p.pin);
  const log=D.rlog[TODAY]||{};
  const doneN=D.rhythm.filter(r=>log[r.id]).length;
  const pool=quotePool();if(U.qi<0||U.qi>=pool.length)U.qi=Math.floor(Math.random()*pool.length);
  const q=pool[U.qi];
  /* journal tiles; if they leave a half row, the desk tile fills it */
  const jt=homeJournal(),odd=jt.filter(x=>x.includes(' w3"')).length%2;
  const sub=[picks.length?`${left} of ${picks.length} picked thing${picks.length>1?'s':''} left`:'nothing picked for today',upcoming[0]?`${upcoming[0].t.toLowerCase()} on ${nice(upcoming[0].date)}`:''].filter(Boolean).join(', and ');
  return `<section class="hello"><div><p class="label" style="font-size:.85rem">${hi}, izzie</p><h1>${now.toLocaleDateString('en-US',{weekday:'long'})}, <em>${now.toLocaleDateString('en-US',{month:'long',day:'numeric'})}</em></h1></div></section>
  ${q?`<section class="qcard"><p class="kind">${q.kind}</p><blockquote>“${esc(q.text)}”</blockquote><p class="src">${q.book?`<button class="link" style="color:inherit;font-size:inherit" data-go="book/${q.book}">${esc(q.src)}</button>`:esc(q.src)}</p><button class="again" data-shuffle>another one</button></section>`:''}
  <div class="tiles">
   <section class="tile t-days w4 wide"><div class="th"><h2>Your day</h2><button class="link" data-go="days">open Days</button></div>
    <div class="split">
     <div><p class="label">Picked for today</p>${picks.length?picks.map(t=>`${pickRow(t,'row')}<span class="txt">${esc(t.t)}</span></div>`).join(''):'<p class="empty">Nothing picked. That\'s allowed.</p>'}<form class="addline" data-form="today"><input name="t" placeholder="+ Add" aria-label="Add something for today"></form></div>
     <div><p class="label" style="margin-bottom:8px">Every day · ${doneN} of ${D.rhythm.length}</p><div class="stickers">${D.rhythm.map(r=>`<button data-rhb="${r.id}" aria-pressed="${!!log[r.id]}">${esc(r.t)}</button>`).join('')}</div>
      <div class="week" aria-label="Last seven days">${[6,5,4,3,2,1,0].map(i=>{const k=off(-i),l=D.rlog[k]||{},n=D.rhythm.filter(r=>l[r.id]).length;return `<div><span class="label">${new Date(Date.now()-i*DAY).toLocaleDateString('en-US',{weekday:'narrow'})}</span><i class="${D.rhythm.length&&n>=Math.ceil(D.rhythm.length/2)?'on':''}" title="${n} done"></i></div>`}).join('')}</div></div>
    </div></section>
   <section class="tile t-plain w2"><div class="th"><h2>Coming up</h2></div>
    ${upcoming.slice(0,3).map(d=>{const p=parse(d.date);return `<button class="minidate" data-go="days"><b>${p.d}<small>${MONTHS[p.m-1].slice(0,3)}</small></b><span><span style="display:block">${esc(d.t)}</span><span class="label">${esc(d.tag||'')}${d.time?' · '+esc(d.time):''}</span></span></button>`}).join('')||'<p class="empty">Nothing fixed ahead.</p>'}</section>
   ${jt.join('')}
   <section class="tile t-read w3"><div class="th"><h2>Reading now</h2><button class="link" data-go="reading">library</button></div>
    ${reading.map(b=>{const pr=progress(b),pg=b.pmode==='pages'&&b.pages;return `<div class="minirow"><button class="mini" data-go="book/${b.id}"><span>${cover(b)}</span><span><span class="tt">${esc(b.t)}</span><span class="label">${progTxt(b)}</span>${pr!==null?`<span class="bar" style="display:block;margin-top:6px"><i style="width:${pr}%"></i></span>`:''}</span></button>${pr!==null?`<button class="ib qpbtn" data-qp="${b.id}" aria-label="Update progress on ${esc(b.t)}" aria-expanded="${U.qp===b.id}">+</button>`:''}</div>
     ${U.qp===b.id?`<form class="qprog" data-form="qprog|${b.id}"><label>${pg?'On page':'Now at'} <input name="v" type="number" inputmode="numeric" min="0" ${pg?`max="${b.pages}"`:'max="100"'} value="${pg?b.pg||'':b.pct||''}" aria-label="${pg?'Current page':'Percent'}"> ${pg?'of '+b.pages:'%'}</label><button class="btn solid">Save</button></form>`:''}`}).join('')||'<p class="empty">Nothing open right now.</p>'}</section>
   <section class="tile t-write ${odd?'w6':'w3'}"><div class="th"><h2>On the desk</h2><button class="link" data-go="writing">all projects</button></div>
    ${pins.map(p=>`<button class="mini" data-go="project/${p.id}"><span>${gen(p)}</span><span><span class="tt">${esc(p.t)}</span><span class="chiprow">${stageChips(p)}</span><span class="label" style="display:block;margin-top:4px">${esc(p.at||'')}</span></span></button>`).join('')||'<p class="empty">Nothing pinned. Pin a project in Writing.</p>'}</section>
  </div>`;
}

/* ================= reading: see reading.js ================= */

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
  const fut=nextDates();
  const past=D.dates.filter(d=>!d.rep&&d.date<TODAY).sort((a,b)=>b.date.localeCompare(a.date));
  const cols=[['now','Now'],['soon','Soon'],['later','Later']];
  const done=D.tasks.filter(t=>t.done);
  const log=D.rlog[TODAY]||{};
  return head('Days')+`
  <section class="sec"><div class="sh"><h2>Fixed dates</h2><div class="acts">${typeof remindLink==='function'?remindLink():''}<button class="btn" data-new="date">+ Fixed date</button></div></div>
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
    ${ts.map(t=>{const st=t.steps||[],meta=[t.day?wdShort(t.day)+' '+nice(t.day):'',t.cat,st.length?`${st.filter(x=>x.done).length}/${st.length}`:''].filter(Boolean).join(' · ');return `<div class="task3"><input type="checkbox" class="tick" data-done="${t.id}" aria-label="Done: ${esc(t.t)}">${inlW('tasks',t,'t','Task')}
     <div class="tline"><span class="tmeta">${esc(meta)}</span><span class="tacts">${ci>0?`<button class="ib" data-mv="${t.id}|-1" aria-label="Move to ${cols[ci-1][1]}" title="Move to ${cols[ci-1][1]}">←</button>`:''}${ci<2?`<button class="ib" data-mv="${t.id}|1" aria-label="Move to ${cols[ci+1][1]}" title="Move to ${cols[ci+1][1]}">→</button>`:''}<button class="ib ${picked(t)?'on':''}" data-pick="${t.id}" aria-label="Pick for today" title="Pick for today">☀</button><button class="ib" data-edit="task|${t.id}" aria-label="More" title="Notes, steps, category">⋯</button></span></div></div>`}).join('')}
    <form class="addline" data-form="task|${k}"><input name="t" placeholder="+ Add" aria-label="New task in ${l}"></form></div>`}).join('')}</div>
   <div class="sh" style="margin-top:22px;border-bottom-width:1px"><h3 style="font-family:var(--serif);font-weight:600">Repeating</h3><div class="acts"><button class="btn sm" data-new="repeat">+ Repeating</button></div></div>
   <div>${D.repeats.map(r=>`<div class="rep"><button class="rt" data-edit="repeat|${r.id}">${esc(r.t)}</button><span class="label">${repTxt(r)}</span></div>`).join('')||'<p class="empty">Nothing repeating. Things like "every Monday, water the plants" go here. On their day they\'re picked for today.</p>'}</div>
   ${done.length?`<div style="margin-top:10px"><button class="link" data-doneopen>${U.doneOpen?'Hide':'Show'} ${done.length} done</button>${U.doneOpen?`<div>${done.map(t=>`<div class="task2 done"><input type="checkbox" class="tick" checked data-undone="${t.id}" aria-label="Not done: ${esc(t.t)}"><span class="txt">${esc(t.t)}</span><span class="label">${nice(t.done)}</span></div>`).join('')}<button class="link" data-cleardone style="margin-top:8px">Clear done</button></div>`:''}</div>`:''}</section>`;
}
function dcard(d){const p=parse(d.date);return `<button class="dcard" data-edit="date|${d.id}"><span class="tb">${esc(d.tag||'Date')}${d.rep?` <span class="rp">· ${REPD[d.rep]}</span>`:''}</span><span class="dd"><b>${p.d}</b><span>${MONTHS[p.m-1]} ${p.y}</span></span><span class="dt">${esc(d.t)}${d.time?`<br><span style="font-weight:400;opacity:.8">${esc(d.time)}</span>`:''}</span></button>`}

/* ================= goals ================= */
function gRow(g){const pr=gp(g),par=byId(D.goals,g.parent),ks=kidsOf(g);
  return `<button class="grow" data-go="goal/${g.id}"><span class="gt">${esc(g.t)}${par?`<small>part of ${esc(par.t)}</small>`:''}</span><span class="gpr"><span class="bar"><i style="width:${pr.p}%"></i></span><span class="label">${pr.txt}${ks.length?` · ${ks.length} under it`:''}</span></span></button>`}
function vGoals(){
  const L=U.glvl,P=U.gper[L];
  const pers=L==='year'?[Y]:L==='quarter'?SUB.year(Y):Array.from({length:12},(_,i)=>Y+'-'+String(i+1).padStart(2,'0'));
  const list=D.goals.filter(g=>g.per===P);
  return head('Goals')+weekGoalsSec()+`
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
      grades:rating?{Enjoyment:rating}:{},review:g(r,'My Review').replace(/<br\s*\/?>/gi,'\n').replace(/<[^>]+>/g,''),notes:g(r,'Private Notes'),tags:[],
      pages:+g(r,'Number of Pages')||'',added:g(r,'Date Added').replace(/\//g,'-'),pmode:'pages',pg:'',pct:'',start:'',end:st==='read'?end:'',
      cover:isbn?`https://covers.openlibrary.org/b/isbn/${isbn}-L.jpg?default=false`:''};
    D.books.push(b);added++;if(!isbn)noIsbn.push(b);
  }
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
  if(kind==='shelves'){title='Shelves';body=D.shelves.map((x,i)=>`<div class="shrow"><input name="s${i}" value="${esc(x)}" aria-label="Shelf name"><label class="chk"><input type="checkbox" name="del" value="${i}"> delete</label></div>`).join('')+'<p class="hint">Deleting a shelf keeps its books. They just leave that shelf.</p>'}
  if(kind==='task'){const st=obj.steps||[];title='Task';body=F.text('t','What',obj.t)+two(F.sel('when','When',obj.when,[['now','Now'],['soon','Soon'],['later','Later']]),F.text('cat','Category (optional)',obj.cat,'home, school, work…'))+F.area('note','Note (optional)',obj.note)
    +`<div class="f"><span>Small steps (optional)</span><div class="msteps">${st.map((s,i)=>`<label><input type="checkbox" name="sd" value="${i}" ${s.done?'checked':''} aria-label="Step done"><input type="text" name="s${i}" value="${esc(s.t)}" aria-label="Step"></label>`).join('')}<label><span style="width:13px"></span><input type="text" name="snew" placeholder="Add a step"></label></div></div>`
    +F.date('due','Soft "by" date (optional)',obj.due)}
  if(kind==='date'){title=isNew?'New fixed date':'Fixed date';body=F.text('t','What',obj.t,'Pay rent')+two(F.date('date',obj.rep?'First date':'Date',obj.date||TODAY),F.text('time','Time (optional)',obj.time,'2:30 pm'))+F.text('tag','Label',obj.tag,'Bill, appointment, deadline…')
    +two(F.sel('rep','Repeats',obj.rep||'',[['','No'],['year','Every year'],['month','Every month'],['week','Every week']]),F.sel('remind','Remind me',obj.remind??'day',[['','No reminder'],['morning','Morning of'],['day','The day before'],['week','A week before']]))
    +'<p class="hint">Reminders come at 9 am to the phone you turned them on for.</p>'}
  if(kind==='repeat'){const how=obj.kind==='month'?'month':+obj.every===2?'2week':'week',days=obj.days||[wdOf(TODAY)];title=isNew?'New repeating task':'Repeating task';body=F.text('t','What',obj.t,'Water the plants')
    +F.sel('how','How often',how,[['week','Every week'],['2week','Every 2 weeks'],['month','Every month']])
    +`<div class="f" data-for="week"><span>On</span><div class="wdpick">${WD.map((w,i)=>`<label><input type="checkbox" name="wd" value="${i}" ${days.includes(i)?'checked':''}>${w}</label>`).join('')}</div></div>`
    +`<div data-for="month" ${how==='month'?'':'hidden'}>${F.num('md','Day of the month',obj.md||+TODAY.slice(8))}</div>`
    +F.text('cat','Category (optional)',obj.cat,'home, school, work…')+'<p class="hint">On its day it\'s picked for today. If it isn\'t done, it quietly goes away until next time.</p>'}
  if(kind==='goal'){title='New goal';body=F.text('t','Goal','')+`<p class="hint">${perLabel(obj.per)}${obj.parent?' · part of '+esc(byId(D.goals,obj.parent)?.t||''):''}</p>`
    +F.sel('kind','Track by',obj.kind||'steps',[['number','A number'],['steps','Steps'],['once','Done or not']])
    +two(F.num('target','Target (for a number)',obj.target),F.text('unit','Unit',obj.unit||'','books, days…'))}
  U.pop={kind,id:obj.id,isNew,obj};
  const canDel=!isNew&&['quote','task','date','doc','repeat'].includes(kind);
  document.getElementById('layer').innerHTML=`<div class="scrim" data-scrim><div class="modal" role="dialog" aria-modal="true" aria-label="${esc(title)}">
   <h2>${esc(title)}</h2>
   <form data-form="pop" style="display:flex;flex-direction:column;gap:12px">${body}
    <div class="bar2"><button class="btn solid">${isNew?'Add':'Save'}</button><button type="button" class="btn" data-close>Cancel</button>${canDel?`<button type="button" class="del" data-delpop>Delete</button>`:''}</div></form></div></div>`;
  if(kind==='repeat')document.querySelector('.modal [data-for=week]').hidden=document.querySelector('.modal [name=how]').value==='month';
  document.querySelector('.modal input:not([type=checkbox]),.modal textarea')?.focus();
}
const COLL={book:'books',quote:'quotes',project:'projects',note:'notes',task:'tasks',date:'dates',rhythm:'rhythm',goal:'goals',repeat:'repeats'};
function readForm(f){const o={};const fd=new FormData(f);for(const [k,v] of fd.entries()){if(o[k]!==undefined){o[k]=[].concat(o[k],v)}else o[k]=v}return o}
function applyPop(f){
  const {kind,id:oid,isNew}=U.pop;const v=readForm(f);const T=s=>(s||'').trim();
  if(kind==='shelf'){const n=T(v.name).toLowerCase();if(n&&!D.shelves.includes(n))D.shelves.push(n);const b=byId(D.books,U.pop.obj.kind||'');if(n&&b&&!b.sh.includes(n))b.sh.push(n);return close()}
  if(kind==='shelves'){const dels=[].concat(v.del||[]).map(Number),map={};const next=[];
    D.shelves.forEach((x,i)=>{if(dels.includes(i)){map[x]=null;return}const n=T(v['s'+i]).toLowerCase()||x;map[x]=n;if(!next.includes(n))next.push(n)});
    D.shelves=next;D.books.forEach(b=>{b.sh=[...new Set(b.sh.map(x=>x in map?map[x]:x).filter(Boolean))]});if(U.shelf&&!(U.shelf in map&&map[U.shelf]))U.shelf='';else if(U.shelf)U.shelf=map[U.shelf];toast('Shelves saved');return close()}
  if(kind==='book'){if(!T(v.a)&&!T(v.t))return;const ol=U.pop.ol&&U.pop.ol.title===T(v.t)?U.pop.ol:null;const b={id:id(),t:T(v.t)||'Untitled',a:T(v.a),st:v.st,fmt:'Physical',sh:[],own:'Own it',times:0,grades:{},review:'',notes:'',tags:[],added:TODAY,pages:ol&&ol.pages||'',pmode:'pages',pg:'',pct:'',start:v.st==='reading'?TODAY:'',end:'',cover:ol&&ol.cover||''};D.books.push(b);close(false);toast('Added');return go('book/'+b.id)}
  if(kind==='doc'){const p=byId(D.projects,U.pop.proj);if(!p||!T(v.url))return;p.docs=p.docs||[];if(isNew)p.docs.push({id:id(),name:T(v.name)||'Document',url:T(v.url)});else Object.assign(byId(p.docs,oid)||{},{name:T(v.name)||'Document',url:T(v.url)});return close()}
  if(kind==='import'){const file=f.file.files[0];if(!file)return;file.text().then(txt=>{const r=importGoodreads(txt,v.which);close();toast(r.added?`Added ${r.added} book${r.added>1?'s':''}${r.skipped?`, skipped ${r.skipped} already here`:''}`:r.error||'No new books found in that file')}).catch(()=>toast('Couldn\'t read that file'));return}
  if(kind==='cover'){const b=byId(D.books,oid);if(b)b.cover=T(v.cover)||'none';return close()}
  if(kind==='project'){if(!T(v.t))return;const p={id:id(),t:T(v.t),k:T(v.k),pin:false,phase:'plotting',ch:'',at:U.pop.seed||'',notes:'',docs:T(v.url)?[{id:id(),name:T(v.name)||'Scrivener',url:T(v.url)}]:[],plot:'',words:'',opened:TODAY,sessions:[]};D.projects.push(p);if(U.pop.idea){const i=byId(D.notes,U.pop.idea);if(i)i.proj=p.id}close(false);toast('Project started');return go('project/'+p.id)}
  if(kind==='goal'){if(!T(v.t))return;const o=U.pop.obj,g={id:id(),t:T(v.t),per:o.per,parent:o.parent||'',kind:v.kind,target:Number(v.target||0),unit:T(v.unit),auto:!!o.auto&&v.kind==='number',v:0,steps:[],done:false};D.goals.push(g);close(false);toast('Goal added');return go('goal/'+g.id)}
  const coll=D[COLL[kind]];let o=isNew?{id:id()}:byId(coll,oid);
  if(kind==='quote'){if(!T(v.text))return;Object.assign(o,{text:T(v.text),book:v.book,page:v.page});if(isNew)o.d=TODAY}
  if(kind==='task'){if(!T(v.t))return;const steps=(o.steps||[]).map((s,i)=>({t:T(v['s'+i]),done:[].concat(v.sd||[]).includes(String(i))})).filter(s=>s.t);if(T(v.snew))steps.push({t:T(v.snew),done:false});Object.assign(o,{t:T(v.t),when:v.when,cat:T(v.cat),note:T(v.note),due:v.due,steps})}
  if(kind==='date'){if(!T(v.t)||!v.date)return;Object.assign(o,{t:T(v.t),date:v.date,time:v.time,tag:v.tag,rep:v.rep||'',remind:v.remind||''})}
  if(kind==='repeat'){if(!T(v.t))return;let days=[].concat(v.wd||[]).map(Number);if(!days.length)days=[wdOf(TODAY)];
    Object.assign(o,{t:T(v.t),kind:v.how==='month'?'month':'week',every:v.how==='2week'?2:1,days,md:Math.min(31,Math.max(1,Math.round(+v.md)||+TODAY.slice(8))),cat:T(v.cat)});if(isNew)o.start=TODAY;
    if(!isNew&&o.made===TODAY){const tk=D.tasks.find(x=>x.from===o.id&&x.pick===TODAY&&!x.done);if(tk)tk.t=o.t}}
  if(isNew)coll.push(o);
  if(kind==='repeat')makeRepeats();
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
  const navR=R.room==='wrapped'?'journal':R.room;
  document.getElementById('nav').innerHTML=ROOMS.map(([k,l,c])=>`<button data-go="${k}" ${navR===k?'aria-current="page"':''}><i style="background:var(${c})"></i>${l}</button>`).join('');
  document.getElementById('main').innerHTML=R.view();
  if(keep){const el=document.querySelector(`[data-f="${keep}"],[data-fav="${keep}"],[data-gstept="${keep}"]`);if(el){el.focus();try{el.setSelectionRange(ks,ks)}catch(e){}}}
  let th='auto';try{th=localStorage.getItem('sb-theme')||'auto'}catch(_){}
  document.getElementById('looksw').innerHTML=[['auto','Auto'],['light','Light'],['dark','Dark']].map(([k,l])=>`<button data-theme="${k}" aria-pressed="${th===k}">${l}</button>`).join('');
  showStatus();
}
window.addEventListener('hashchange',()=>{close(false);if(location.hash==='#reading')U.q3=null;window.scrollTo(0,0);render()});
document.addEventListener('click',e=>{
  if(e.target.matches('[data-scrim]')){close();return}
  const t=e.target.closest('button');if(!t)return;const d=t.dataset;
  if(d.go){go(d.go);return}
  if('close' in d){close();return}
  if('undo' in d){undo();return}
  if(d.edit){const [k,i]=d.edit.split('|');const o=byId(D[COLL[k]],i);if(o)pop(k,o,false);return}
  if(d.new){const [k,ref]=d.new.split('|');const o=k==='goal'?(ref==='books'?{per:Y,kind:'number',unit:'books',auto:true,target:12}:{per:ref||U.gper[U.glvl],kind:'steps'}):k==='quote'?{text:'',book:D.books.find(b=>b.st==='reading')?.id||D.books[0]?.id,page:''}:k==='date'?{t:'',date:TODAY,tag:''}:k==='repeat'?{t:''}:{kind:ref};pop(k,o,true);return}
  if('delpop' in d){const {kind,id:oid}=U.pop;if(kind==='doc'){const p=byId(D.projects,U.pop.proj);p.docs=p.docs.filter(x=>x.id!==oid);close();toast('Link removed');return}close(false);remove(kind,oid);return}
  if(d.del){const [k,i]=d.del.split('|');remove(k,i);return}
  if(d.promote){const s=byId(D.notes,d.promote);pop('project',{t:s.title},true);U.pop.idea=s.id;return}
  if('newcard' in d){const r=d.newcard,n={id:id(),title:'',body:'',proj:r.startsWith('@')?r.slice(1):'',parent:r&&!r.startsWith('@')?r:''};D.notes.push(n);save();go('card/'+n.id);setTimeout(()=>document.querySelector('textarea.big')?.focus(),50);return}
  if(d.addsub){const [gi,per]=d.addsub.split('|');pop('goal',{per,parent:gi,kind:'steps'},true);return}
  if(d.newdoc){pop('doc',{name:'',url:''},true);U.pop.proj=d.newdoc;return}
  if(d.editdoc){const [pi,di]=d.editdoc.split('|');pop('doc',byId(byId(D.projects,pi).docs,di),false);U.pop.proj=pi;return}
  if(d.opendoc){const [pi,di]=d.opendoc.split('|');const p=byId(D.projects,pi),x=byId(p.docs,di);p.opened=TODAY;save();if(/^https?:/i.test(x.url))window.open(x.url,'_blank','noopener');else location.href=x.url;return}
  if(d.theme){try{if(d.theme==='auto')localStorage.removeItem('sb-theme');else localStorage.setItem('sb-theme',d.theme)}catch(_){}window.applyTheme&&applyTheme();render();return}
  if('qmore' in d){const old=U.q3||[],rest=D.quotes.map(q=>q.id).filter(i=>!old.includes(i)).sort(()=>Math.random()-.5);U.q3=[...rest,...old].slice(0,3);render();return}
  if('shuffle' in d){const n=quotePool().length;if(n>1){let k;do{k=Math.floor(Math.random()*n)}while(k===U.qi);U.qi=k}}
  else if(d.rhb){D.rlog[TODAY]=D.rlog[TODAY]||{};D.rlog[TODAY][d.rhb]=!D.rlog[TODAY][d.rhb]}
  else if(d.filter){U.filter=d.filter}
  else if(d.shelf){U.shelf=U.shelf===d.shelf?'':d.shelf}
  else if('rclear' in d){U.rf={};U.rq='';U.shelf='';U.filter='all'}
  else if(d.untag){const [i,t]=d.untag.split('|');const b=byId(D.books,i);b.tags=(b.tags||[]).filter(x=>x!==t)}
  else if(d.bst){const [i,s]=d.bst.split('|');const b=byId(D.books,i);b.st=s;if(s==='reading'&&!b.start)b.start=TODAY;if(s==='read'){if(!b.end)b.end=TODAY;if(!b.times)b.times=1}}
  else if(d.finish){const b=byId(D.books,d.finish);b.st='read';b.end=b.end||TODAY;b.times=(b.times||0)+1;if(b.pmode==='pages'&&b.pages)b.pg=b.pages;if(b.pmode==='pct')b.pct=100;toast(`Finished ${b.t}. Grade it below if you like.`)}
  else if(d.qp){U.qp=U.qp===d.qp?'':d.qp;render();setTimeout(()=>document.querySelector('.qprog input')?.select(),0);return}
  else if(d.pmode){const [i,m]=d.pmode.split('|');byId(D.books,i).pmode=m}
  else if(d.times){const [i,n]=d.times.split('|');const b=byId(D.books,i);b.times=Math.max(0,(b.times||0)+Number(n))}
  else if(d.bsh){const [i,s]=d.bsh.split('|');const b=byId(D.books,i);b.sh=b.sh.includes(s)?b.sh.filter(x=>x!==s):[...b.sh,s]}
  else if(d.grade){const [i,k,n]=d.grade.split('|');const b=byId(D.books,i),cur=b.grades[k]||0,N=+n;b.grades[k]=cur>N-1&&cur<=N?(cur-.25<=N-1?0:cur-.25):N}
  else if(d.pin){const p=byId(D.projects,d.pin);p.pin=!p.pin;toast(p.pin?'Pinned':'Unpinned')}
  else if(d.phase){const [i,ph]=d.phase.split('|'),p=byId(D.projects,i);if(p.phase!==ph){p.phase=ph;p.moves=[...(p.moves||[]),{id:id(),d:TODAY,to:ph}]}}
  else if(d.mv){const [i,dir]=d.mv.split('|');const o=['now','soon','later'];const tk=byId(D.tasks,i);tk.when=o[o.indexOf(tk.when)+Number(dir)]}
  else if(d.pick){const tk=byId(D.tasks,d.pick);tk.pick=picked(tk)?'':TODAY}
  else if('doneopen' in d){U.doneOpen=!U.doneOpen}
  else if('cleardone' in d){const n=D.tasks.filter(x=>x.done).length;D.tasks=D.tasks.filter(x=>!x.done);toast(`Cleared ${n} done`)}
  else if(d.ry){U.ry=d.ry}
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
  if(x.name==='how'&&x.closest('.modal')){x.form.querySelector('[data-for=week]').hidden=x.value==='month';x.form.querySelector('[data-for=month]').hidden=x.value!=='month';return}
  if(d.rf){U.rf={...U.rf,[d.rf]:x.value};render();return}
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
  if(d.done){const tk=byId(D.tasks,d.done);tk.done=TODAY;D.tlog[TODAY]=(+D.tlog[TODAY]||0)+1;toast(`Done: ${tk.t}`);save();setTimeout(render,250);return}
  if(d.undone){const tk=byId(D.tasks,d.undone);if(D.tlog[tk.done])D.tlog[tk.done]=Math.max(0,D.tlog[tk.done]-1);tk.done='';render();return}
  if(d.rh){D.rlog[TODAY]=D.rlog[TODAY]||{};D.rlog[TODAY][d.rh]=x.checked;render();return}
});
let olT;
document.addEventListener('input',e=>{
  const x=e.target;
  if('rq' in x.dataset){U.rq=x.value;const c=x.selectionStart;render();const el=document.querySelector('[data-rq]');if(el){el.focus();try{el.setSelectionRange(c,c)}catch(_){}}return}
  if(!('olq' in x.dataset))return;
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
  if(k==='quote'){if(!T(v.text))return;{const qid=id();D.quotes.push({id:qid,book:ref,text:T(v.text),page:T(v.page),d:TODAY});U.q3=[qid,...(U.q3||[])].slice(0,3)}toast('Quote saved');}
  else if(k==='log'){const p=byId(D.projects,ref);const w=Number(v.w||0);if(!w&&!T(v.n))return;p.sessions=p.sessions||[];p.sessions.push({d:TODAY,type:v.type,w:v.type==='writing'?w:0,n:T(v.n)});toast(v.type==='writing'&&w?`Logged ${fmt(w)} words`:'Session logged')}
  else if(k==='tag'){const b=byId(D.books,ref),t=T(v.t).toLowerCase();if(!t)return;b.tags=b.tags||[];if(!b.tags.includes(t))b.tags.push(t)}
  else if(k==='rhythm'){if(!T(v.t))return;D.rhythm.push({id:id(),t:T(v.t)})}
  else if(k==='task'){if(!T(v.t))return;D.tasks.push({id:id(),t:T(v.t),when:ref})}
  else if(k==='today'){if(!T(v.t))return;D.tasks.push({id:id(),t:T(v.t),when:'now',pick:TODAY})}
  else if(k==='qprog'){const b=byId(D.books,ref),n=Math.max(0,Number(v.v||0));if(!b)return;U.qp='';
    if(b.pmode==='pages'){b.pg=b.pages?Math.min(n,+b.pages):n;toast(b.pages&&n>=+b.pages?'Last page! Mark it finished in the book':`Page ${b.pg}`)}else{b.pct=Math.min(n,100);toast(`${b.pct}%`)}
    render();return}
  else if(k==='gstep'){if(!T(v.t))return;const g=byId(D.goals,ref);g.steps=g.steps||[];g.steps.push({t:T(v.t),done:false})}
  else return;
  const sel=f.dataset.form;render();setTimeout(()=>document.querySelector(`form[data-form="${CSS.escape(sel)}"] input,form[data-form="${CSS.escape(sel)}"] textarea`)?.focus(),0);
});
