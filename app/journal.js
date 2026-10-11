/* ================= journal, Monday plan, monthly wrapped =================
   D.days[date]  = {mood, head, text}   one per day: mood and headache from Today, the journal entry
   D.weeks[mon]  = {note, planned, goals:[{id,t,done}]}   the Monday plan for the week starting that Monday
   D.wraps[ym]   = {book, song, artist, moment, worst, show, fix, pic, done, later}   wrap-up answers
   D.tlog[date]  = how many tasks were ticked that day (kept even after "Clear done") */
const MOODS=['great','good','okay','low','rough'];
const HEADS=['light','medium','strong'];
const dt=s=>new Date(s+'T12:00:00');
const addD=(s,n)=>{const x=dt(s);x.setDate(x.getDate()+n);return iso(x)};
const monOf=s=>addD(s,-((dt(s).getDay()+6)%7));
const wdShort=s=>dt(s).toLocaleDateString('en-US',{weekday:'short'});
const wdLong=s=>dt(s).toLocaleDateString('en-US',{weekday:'long'});
const longDay=s=>`${MONTHS[+s.slice(5,7)-1]} ${+s.slice(8)}`;
const ymEnd=ym=>{const [y,m]=ym.split('-').map(Number);return iso(new Date(y,m,0))};
const spanOf=p=>p.length===4?[p+'-01-01',p+'-12-31']:[p+'-01',ymEnd(p)];
const inSpan=(d,[a,b])=>!!d&&d>=a&&d<=b;
const plural=(n,w)=>`${fmt(n)} ${w}${n===1?'':'s'}`;
const dayOf=k=>D.days[k]||{};
function setDayField(k,f,v){
  const o={...dayOf(k)};if(v)o[f]=v;else delete o[f];
  if(Object.keys(o).length)D.days[k]=o;else delete D.days[k];
}

/* ---------- numbers for any stretch of days ---------- */
function stats(span){
  const books=D.books.filter(b=>b.st==='read'&&inSpan(b.end,span)).sort((a,b)=>a.end.localeCompare(b.end));
  const ses=D.projects.flatMap(p=>(p.sessions||[]).filter(s=>inSpan(s.d,span)).map(s=>({...s,p})));
  const days=Object.keys(D.days).filter(k=>inSpan(k,span)).map(k=>({k,...D.days[k]}));
  const moods={};days.forEach(d=>{if(d.mood)moods[d.mood]=(moods[d.mood]||0)+1});
  const heads=days.filter(d=>d.head),hl={};heads.forEach(d=>hl[d.head]=(hl[d.head]||0)+1);
  let rhythm=0;if(D.rhythm.length)for(const k in D.rlog)if(inSpan(k,span)&&D.rhythm.filter(r=>D.rlog[k][r.id]).length>=Math.ceil(D.rhythm.length/2))rhythm++;
  const byProj={};ses.forEach(s=>{byProj[s.p.id]=(byProj[s.p.id]||0)+1});
  const topProj=Object.keys(byProj).sort((a,b)=>byProj[b]-byProj[a])[0];
  return {books,pages:books.reduce((m,b)=>m+(+b.pages||0),0),
    words:ses.reduce((m,s)=>m+(+s.w||0),0),sessions:ses.length,
    topProj:topProj?{p:byId(D.projects,topProj),n:byProj[topProj]}:null,
    moved:D.projects.map(p=>({p,m:(p.moves||[]).filter(x=>inSpan(x.d,span))})).filter(x=>x.m.length),
    tasks:Object.keys(D.tlog).filter(k=>inSpan(k,span)).reduce((m,k)=>m+(+D.tlog[k]||0),0),
    rhythm,written:days.filter(d=>(d.text||'').trim()).length,days,moods,heads:heads.length,headTop:Object.keys(hl).sort((a,b)=>hl[b]-hl[a])[0],
    quotes:D.quotes.filter(q=>inSpan(q.d,span)),
    wgoals:Object.keys(D.weeks).filter(k=>inSpan(k,span)).reduce((m,k)=>{const gs=D.weeks[k].goals||[];m.all+=gs.length;m.done+=gs.filter(g=>g.done).length;return m},{all:0,done:0})};
}
/* "mostly good, 1 low day" */
function moodWords(s){
  const ks=Object.keys(s.moods);if(!ks.length)return '';
  const top=ks.sort((a,b)=>s.moods[b]-s.moods[a])[0],hard=['low','rough'].filter(m=>m!==top&&s.moods[m]).map(m=>plural(s.moods[m],m+' day'));
  return ['mostly '+top,...hard].join(', ');
}

/* ---------- Today tiles ---------- */
const pills=(attr,k,list,cur)=>`<div class="pills">${list.map(m=>`<button data-${attr}="${k}|${m}" aria-pressed="${cur===m}">${m}</button>`).join('')}</div>`;
function homeJournal(){
  const k=U.jo?off(-1):TODAY,o=dayOf(k);
  const hows=`<section class="tile t-jr w3"><div class="th"><h2>How's the day</h2><div class="daysw" role="group" aria-label="Which day"><button data-jo="1" aria-pressed="${!!U.jo}">Yesterday</button><button data-jo="0" aria-pressed="${!U.jo}">Today</button></div></div>
    <div class="jrow"><span>Mood</span>${pills('mood',k,MOODS,o.mood)}</div>
    <div class="jrow"><span>Headache</span>${pills('head',k,HEADS,o.head)}</div>
    <textarea class="inl jline" data-jt="${k}" rows="2" placeholder="A few lines about ${U.jo?'yesterday':'today'}" aria-label="Journal">${esc(o.text||'')}</textarea>
    <button class="link" style="align-self:flex-start" data-go="entry/${k}">open to write more</button></section>`;
  const tiles=[hows];
  /* Mondays: a new-week card until it's planned; after that, the week's note all week */
  const mon=monOf(TODAY),wk=D.weeks[mon]||{};
  if(TODAY===mon&&!wk.planned){const s=stats([addD(mon,-7),addD(mon,-1)]);
    tiles.push(`<section class="tile t-week w3"><div class="th"><h2>New week</h2><span class="label">last week</span></div>
     <div class="wkstats">${[[s.books.length,s.books.length===1?'book':'books'],[s.words,'words'],[s.tasks,'tasks done']].map(([n,l])=>`<div><b>${fmt(n)}</b><span class="label">${l}</span></div>`).join('')}</div>
     <button class="btn solid" style="align-self:flex-start" data-go="week/${mon}">Plan this week</button></section>`)}
  else if((wk.note||'').trim()||(wk.goals||[]).length)tiles.push(`<section class="tile t-note w3"><div class="th"><h2>This week</h2><button class="link" data-go="week/${mon}">plan</button></div>${wgoalRows(mon,false)}${(wk.note||'').trim()?`<p class="wnote">${esc(wk.note)}</p>`:''}</section>`);
  /* the first week of a month: wrap up the month before */
  const pm=ymOff(-1),w=D.wraps[pm]||{};
  if(+TODAY.slice(8)<=7&&!w.done&&w.later!==TODAY&&hasData(pm))tiles.push(`<section class="tile t-wrap w6"><p class="label">a few questions, then it's ready</p><h2>Wrap up <em>${monthName(pm)}</em></h2>
    <div class="row3"><button class="btn solid" data-go="wrap/${pm}">Start</button><button class="btn" data-wlater="${pm}">Later</button></div></section>`);
  return tiles;
}
/* small goals for one week, set in the Monday plan and ticked on Today */
function wgoalRows(mon,edit){const gs=(D.weeks[mon]||{}).goals||[];
  return gs.map(g=>`<div class="wgoal ${g.done?'done':''}"><input type="checkbox" class="tick" data-wgdone="${mon}|${g.id}" ${g.done?'checked':''} aria-label="${esc(g.t)}">${edit?`<input class="inl" data-wgt="${mon}|${g.id}" value="${esc(g.t)}" aria-label="Goal for the week"><button class="ib" data-wgdel="${mon}|${g.id}" aria-label="Remove ${esc(g.t)}">×</button>`:`<span>${esc(g.t)}</span>`}</div>`).join('')}
const wgoal=(mon,gid)=>((D.weeks[mon]||{}).goals||[]).find(g=>g.id===gid);
function hasData(ym){const sp=spanOf(ym),s=stats(sp);return !!(s.books.length||s.sessions||s.tasks||s.days.length||s.rhythm||D.wraps[ym])}

/* ---------- Journal room ---------- */
function vJournal(){
  const sel=U.jd&&U.jd<=TODAY?U.jd:TODAY,jm=U.jm||sel.slice(0,7);
  const first=jm+'-01',lead=(dt(first).getDay()+6)%7,n=+ymEnd(jm).slice(8);
  const cells=['M','T','W','T','F','S','S'].map(x=>`<span class="dow">${x}</span>`).join('')+'<span></span>'.repeat(lead)+Array.from({length:n},(_,i)=>{
    const k=jm+'-'+String(i+1).padStart(2,'0'),o=dayOf(k),fut=k>TODAY;
    return `<button data-jd="${k}" class="${k===TODAY?'today':''} ${k===sel?'sel':''}" ${fut?'disabled':''} aria-label="${longDay(k)}${(o.text||'').trim()?', written':''}"><span>${i+1}</span>${(o.text||'').trim()?'<i class="jdot"></i>':o.mood||o.head?'<i class="jdot faint"></i>':''}</button>`}).join('');
  const o=dayOf(sel),wk=D.weeks[sel];
  return head('Journal')+`
  <div class="jgrid">
   <div class="jcal"><div class="monthnav"><button data-jm="-1" aria-label="Previous month">‹</button><b>${monthName(jm)} ${jm.slice(0,4)}</b>${jm<YM?'<button data-jm="1" aria-label="Next month">›</button>':''}</div>
    <div class="cal">${cells}</div></div>
   <article class="jentry"><div class="jwhen"><b>${wdLong(sel)}, ${longDay(sel)}</b><button class="link" data-go="entry/${sel}">open</button></div>
    <div class="jrow"><span>Mood</span>${pills('mood',sel,MOODS,o.mood)}</div>
    <div class="jrow"><span>Headache</span>${pills('head',sel,HEADS,o.head)}</div>
    <textarea class="inl jtext" data-jt="${sel}" rows="6" placeholder="Nothing written yet." aria-label="Entry for ${longDay(sel)}">${esc(o.text||'')}</textarea>
    ${wk&&(wk.planned||(wk.note||'').trim())?`<button class="link" style="align-self:flex-start" data-go="week/${sel}">This week's plan</button>`:''}
    ${onThisDay(sel)}</article>
  </div>
  ${archive()}`;
}
/* the same day in earlier years */
function onThisDay(sel){
  const md=sel.slice(4),ys=[...new Set(Object.keys(D.days).map(k=>k.slice(0,4)))].filter(y=>y<sel.slice(0,4)).sort().reverse();
  const hits=ys.map(y=>y+md).filter(k=>{const o=D.days[k];return o&&((o.text||'').trim()||o.mood)});
  if(!hits.length)return '';
  return `<div class="otd"><span class="label">on this day</span>${hits.map(k=>{const o=D.days[k],t=(o.text||'').trim().replace(/\s+/g,' ');return `<button data-go="entry/${k}"><span class="label">${k.slice(0,4)}${o.mood?' · '+o.mood:''}${o.head?' · headache':''}</span>${t?`<span class="t">${esc(t.length>180?t.slice(0,177)+'…':t)}</span>`:''}</button>`}).join('')}</div>`;
}
function archive(){
  const ms=new Set();
  D.books.forEach(b=>{if(b.st==='read'&&b.end)ms.add(b.end.slice(0,7))});
  D.projects.forEach(p=>(p.sessions||[]).forEach(s=>ms.add(s.d.slice(0,7))));
  [...Object.keys(D.days),...Object.keys(D.tlog)].forEach(k=>ms.add(k.slice(0,7)));Object.keys(D.wraps).forEach(k=>ms.add(k));
  const months=[...ms].filter(m=>/^\d{4}-\d\d$/.test(m)&&m<YM).sort().reverse().slice(0,12);
  const years=[...new Set(months.map(m=>m.slice(0,4)))].filter(y=>y<Y||TODAY.slice(5,7)==='12');
  if(TODAY.slice(5,7)==='12'&&!years.includes(Y))years.unshift(Y);
  if(!months.length&&!years.length)return '';
  const card=(p,label,dark)=>{const s=stats(spanOf(p)),w=D.wraps[p]||{};
    return `<button class="look ${dark?'dark':''}" data-go="${p.length===4||w.done?'wrapped':'wrap'}/${p}"><span class="label">${label}</span><h3>${p.length===4?p:monthName(p)}</h3>
     <span class="lk">${[s.books.length&&plural(s.books.length,'book'),s.words&&fmt(s.words)+' words',s.written&&plural(s.written,'day')+' written'].filter(Boolean).map(x=>`<span>${x}</span>`).join('')}</span>${p.length>4&&!w.done?'<span class="label">answer the questions</span>':''}</button>`};
  return `<section class="sec"><div class="sh"><h2>Wrapped</h2></div>
   <div class="looks">${years.map(y=>card(y,'year',true)).join('')}${months.map((m,i)=>card(m,m.slice(0,4)!==Y?m.slice(0,4):'month',i===0&&!years.length)).join('')}</div></section>`;
}
function pEntry(k){
  const o=dayOf(k);
  return `<button class="back" data-go="journal">← Journal</button>
  <div class="paper"><span class="label">${wdLong(k)}</span><h1>${longDay(k)}</h1>
   <div class="jrow"><span>Mood</span>${pills('mood',k,MOODS,o.mood)}</div>
   <div class="jrow"><span>Headache</span>${pills('head',k,HEADS,o.head)}</div>
   <textarea class="jfull" data-jt="${k}" placeholder="Write as much as you like." aria-label="Entry for ${longDay(k)}">${esc(o.text||'')}</textarea></div>`;
}

/* ---------- Monday plan ---------- */
function pWeek(mon){
  const wk=D.weeks[mon]||{},s=stats([addD(mon,-7),addD(mon,-1)]),mw=moodWords(s);
  const days=Array.from({length:7},(_,i)=>addD(mon,i));
  const order=['now','soon','later'],open=D.tasks.filter(t=>!t.done).sort((a,b)=>order.indexOf(a.when)-order.indexOf(b.when));
  const dayOfTask=t=>t.pick===TODAY?TODAY:t.day||'';
  const goals=D.goals.filter(g=>g.per===mon.slice(0,7));
  return `<button class="back" data-go="home">← Today</button>
  <section class="head"><p class="label">week of ${longDay(mon)}</p><h1>This week</h1></section>
  <div class="lastwk"><span class="label">last week</span>
   ${[[s.books.length,s.books.length===1?'book':'books'],[s.words,'words'],[s.tasks,'tasks done'],[s.heads,s.heads===1?'headache day':'headache days']].map(([n,l])=>`<div><b>${fmt(n)}</b><span class="label">${l}</span></div>`).join('')}
   ${mw?`<div><b class="w">${esc(mw.split(', ')[0])}</b><span class="label">mood${mw.includes(', ')?' · '+esc(mw.split(', ').slice(1).join(', ')):''}</span></div>`:''}</div>
  <div class="wgrid">
   <section class="sec"><div class="sh"><h2>Tasks</h2><span class="label">give them a day</span></div>
    <div>${open.map(t=>{const cur=dayOfTask(t);return `<div class="wtask"><span class="wt">${esc(t.t)}</span><span class="wdays">${days.map(k=>`<button data-tday="${t.id}|${k}" aria-pressed="${cur===k}" ${k<TODAY?'disabled':''} aria-label="${esc(t.t)} on ${wdLong(k)}">${wdShort(k)}</button>`).join('')}</span></div>`}).join('')||'<p class="empty">No open tasks. Add one below.</p>'}
    <form class="addline" data-form="wtask"><input name="t" placeholder="+ Add" aria-label="New task"></form>
    ${(()=>{const rs=D.repeats.map(r=>({r,ds:days.filter(k=>dueOn(r,k))})).filter(x=>x.ds.length);return rs.length?`<p class="label wrepline">Repeating this week: ${rs.map(x=>`${esc(x.r.t)} (${x.ds.map(wdShort).join(', ')})`).join(' · ')}</p>`:''})()}</div></section>
   <div style="display:flex;flex-direction:column;gap:8px;min-width:0">
    <section class="sec"><div class="sh"><h2>${monthName(mon.slice(0,7))} goals</h2><button class="link" data-wgoals>all goals</button></div>
     <div>${goals.map(gRow).join('')||'<p class="empty">No goals this month.</p>'}</div></section>
    <section class="sec"><div class="sh"><h2>Goals for the week</h2><span class="label">small ones</span></div>
     <div>${wgoalRows(mon,true)}<form class="addline" data-form="wgoal|${mon}"><input name="t" placeholder="+ Add a goal" aria-label="New goal for the week"></form></div></section>
    <section class="sec"><div class="sh"><h2>Note for the week</h2></div>
     <textarea class="inl" data-wnote="${mon}" rows="3" placeholder="Stays on Today until Sunday" aria-label="Note for the week">${esc(wk.note||'')}</textarea></section>
    <button class="btn solid" style="align-self:flex-start;margin-top:18px" data-wdone="${mon}">Done</button>
   </div></div>`;
}

/* ---------- wrap-up questions ---------- */
const WQ=[['song','Fav song'],['artist','By'],['moment','Fav moment'],['worst','Worst moment','Optional'],['show','Fav movie or show','Optional'],['fix','Hyperfixation of the month','Optional']];
function pWrapQ(ym){
  const w=D.wraps[ym]||{},fav=(D.favs[ym]||{}).book,bk=w.book||fav||'';
  const opts=D.books.filter(b=>b.st==='read'||b.st==='reading'||b.id===bk).sort((a,b)=>(inSpan(b.end,spanOf(ym))?1:0)-(inSpan(a.end,spanOf(ym))?1:0));
  const q=([f,l,ph])=>`<label class="q"><span>${l}</span><input data-wq="${ym}|${f}" value="${esc(w[f]||'')}" placeholder="${ph||''}"></label>`;
  return `<button class="back" data-go="home">← Today</button>
  <section class="head"><p class="label">wrap up</p><h1>${monthName(ym)}</h1></section>
  <div class="wform">
   <label class="q"><span>Fav book</span><select data-wq="${ym}|book"><option value="">None this month</option>${opts.map(b=>`<option value="${b.id}" ${bk===b.id?'selected':''}>${esc(b.t)}</option>`).join('')}</select>${fav&&!w.book?'<span class="hint">From your Reading favorites</span>':''}</label>
   <div class="two">${q(WQ[0])}${q(WQ[1])}</div>
   ${WQ.slice(2).map(q).join('')}
   <div class="q"><span>Fav pic</span>${w.pic?`<img class="wpic" src="${w.pic}" alt="Your picture of the month"><span class="row3"><label class="link">Change<input type="file" accept="image/*" data-wpic="${ym}" hidden></label><button class="link" data-wpicdel="${ym}">Remove</button></span>`:`<label class="addpic">+ add photo<input type="file" accept="image/*" data-wpic="${ym}" hidden></label>`}</div>
   <button class="btn solid" style="align-self:flex-start" data-wmake="${ym}">${w.done?'Back to my wrapped':'Make my wrapped'}</button>
  </div>`;
}
/* photos are shrunk before saving so they sync quickly */
function shrink(file){return new Promise((ok,no)=>{const r=new FileReader();r.onerror=no;r.onload=()=>{const im=new Image();im.onerror=no;im.onload=()=>{
  const s=Math.min(1,900/Math.max(im.width,im.height)),c=document.createElement('canvas');c.width=Math.round(im.width*s);c.height=Math.round(im.height*s);
  c.getContext('2d').drawImage(im,0,0,c.width,c.height);ok(c.toDataURL('image/jpeg',.72))};im.src=r.result};r.readAsDataURL(file)})}

/* ---------- the wrapped page ---------- */
function pWrapped(p){
  const year=p.length===4,s=stats(spanOf(p)),w=year?{}:D.wraps[p]||{};
  const rated=s.books.filter(b=>avg(b)).sort((a,b)=>avg(b)-avg(a))[0];
  const fv=year?{}:D.favs[p]||{},fb=byId(D.books,w.book||fv.book);
  const num=(n,l)=>`<div class="num"><b>${fmt(n)}</b><span>${l}</span></div>`;
  const pair=(l,t,sub)=>t?`<div><span class="label">${l}</span><span class="t">${esc(t)}</span>${sub?`<span>${sub}</span>`:''}</div>`:'';
  const line=(()=>{const xs=s.days.filter(d=>(d.text||'').trim());if(!xs.length)return '';const t=xs[hash(p)%xs.length].text.trim().split(/(?<=[.!?])\s|\n/)[0];return t.length>160?t.slice(0,157)+'…':t})();
  const goals=D.goals.filter(g=>g.per===p||(!year&&g.per===p.slice(0,4)&&g.kind==='number'));
  const bands=[];
  if(s.books.length||s.quotes.length)bands.push(`<div class="band b-read"><h2>Reading</h2>
    <div class="nums">${num(s.books.length,s.books.length===1?'book finished':'books finished')}${s.pages?num(s.pages,'pages'):''}${s.quotes.length?num(s.quotes.length,s.quotes.length===1?'quote saved':'quotes saved'):''}</div>
    ${s.books.length?`<div class="wcovers">${s.books.map(b=>`<button class="wcv" data-go="book/${b.id}" aria-label="${esc(b.t)}">${cover(b)}</button>`).join('')}</div>`:''}
    <div class="pair">${pair(year?'top rated':'book of the month',(fb||rated||{}).t,(fb||rated)?esc((fb||rated).a)+(avg(fb||rated)?' · '+qfmt(avg(fb||rated))+' ★':''):'')}${fb&&rated&&rated!==fb?pair('highest rated',rated.t,qfmt(avg(rated))+' ★'):''}${pair('character of the month',fv.character)}</div>
    ${fv.line?`<blockquote>“${esc(fv.line)}”</blockquote>`:''}</div>`);
  if(s.sessions||s.moved.length)bands.push(`<div class="band b-write"><h2>Writing</h2>
    <div class="nums">${s.words?num(s.words,'words'):''}${num(s.sessions,s.sessions===1?'session':'sessions')}</div>
    <div class="pair">${s.moved.map(x=>pair('moved',x.p.t,x.m.map(m=>PHASES[m.to]).join(' → '))).join('')}${s.topProj&&s.topProj.p?pair('most worked on',s.topProj.p.t,plural(s.topProj.n,'session')):''}</div></div>`);
  if(s.tasks||s.rhythm||s.wgoals.all)bands.push(`<div class="band b-days"><h2>Days</h2><div class="nums">${s.tasks?num(s.tasks,'tasks done'):''}${s.rhythm?num(s.rhythm,'days of the daily rhythm'):''}${s.wgoals.all?num(s.wgoals.done,`of ${s.wgoals.all} week goals met`):''}</div></div>`);
  if(goals.length)bands.push(`<div class="band b-goals"><h2>Goals</h2><div class="glist">${goals.map(g=>{const x=gp(g);return `<div><div class="gl"><span>${esc(g.t)}</span><span class="label">${x.txt}</span></div><div class="bar"><i style="width:${x.p}%"></i></div></div>`}).join('')}</div></div>`);
  if(s.days.length){const mw=moodWords(s);bands.push(`<div class="band b-jr"><h2>How you felt</h2>
    <div class="nums">${s.written?num(s.written,s.written===1?'day written':'days written'):''}${!s.heads?'':num(s.heads,(s.heads===1?'headache day':'headache days')+(s.headTop&&s.heads>1?', mostly '+s.headTop:''))}</div>
    ${mw?`<p class="mw">${MOODS.filter(m=>s.moods[m]).map(m=>`<span><b>${s.moods[m]}</b> ${m}</span>`).join('')}</p>`:''}
    ${line?`<blockquote>“${esc(line)}”</blockquote>`:''}</div>`)}
  if(year){const ms=Object.keys(D.wraps).filter(k=>k.startsWith(p)&&D.wraps[k].done).sort();
    if(ms.length)bands.push(`<div class="band b-mine"><h2>Your months</h2><div class="months">${ms.map(k=>{const x=D.wraps[k],b=byId(D.books,x.book);return `<button class="mo" data-go="wrapped/${k}"><span class="label">${monthName(k)}</span>${[b&&b.t,x.song&&`${x.song}${x.artist?' · '+x.artist:''}`,x.moment].filter(Boolean).map(t=>`<span>${esc(t)}</span>`).join('')}</button>`}).join('')}</div></div>`)}
  else bands.push(w.done?`<div class="band b-mine"><h2>Your favorites</h2><div class="mine">
     ${pair('fav book',fb&&fb.t)}${pair('fav song',w.song,esc(w.artist||''))}${pair('fav moment',w.moment)}${pair('worst moment',w.worst)}${pair('fav movie or show',w.show)}${pair('hyperfixation',w.fix)}
     ${w.pic?`<div><span class="label">fav pic</span><img class="wpic" src="${w.pic}" alt="Your picture of the month"></div>`:''}</div>
     <button class="link" style="align-self:flex-start" data-go="wrap/${p}">edit answers</button></div>`
    :`<div class="band b-mine"><h2>Your favorites</h2><p>Your song, moment and pic of the month go here.</p><button class="btn solid" style="align-self:flex-start" data-go="wrap/${p}">Answer the questions</button></div>`);
  const prev=year?String(+p-1):(()=>{const d=dt(p+'-15');d.setMonth(d.getMonth()-1);return iso(d).slice(0,7)})();
  const next=year?String(+p+1):(()=>{const d=dt(p+'-15');d.setMonth(d.getMonth()+1);return iso(d).slice(0,7)})();
  return `<button class="back" data-go="journal">← Journal</button>
  <div class="wtitle"><p class="label">${year?'your year':'your month'}</p><h1>${year?`<em>${p}</em>`:`<em>${monthName(p)}</em><br>${p.slice(0,4)}`}</h1></div>
  ${bands.join('')}
  <div class="wfoot"><button class="link" data-go="wrapped/${prev}">‹ ${year?prev:monthName(prev)}</button>${!year&&p.slice(5)==='12'?`<button class="link" data-go="wrapped/${p.slice(0,4)}">your whole year</button>`:''}${(year?next<=Y:next<YM)?`<button class="link" data-go="wrapped/${next}">${year?next:monthName(next)} ›</button>`:'<span></span>'}</div>`;
}

/* ---------- events ---------- */
document.addEventListener('click',e=>{
  const t=e.target.closest('button');if(!t)return;const d=t.dataset;
  if(d.jo!==undefined){U.jo=+d.jo}
  else if(d.mood){const [k,m]=d.mood.split('|');setDayField(k,'mood',dayOf(k).mood===m?'':m)}
  else if(d.head){const [k,m]=d.head.split('|');setDayField(k,'head',dayOf(k).head===m?'':m)}
  else if(d.jd){U.jd=d.jd}
  else if(d.jm){const x=dt((U.jm||(U.jd&&U.jd<=TODAY?U.jd:TODAY).slice(0,7))+'-15');x.setMonth(x.getMonth()+Number(d.jm));U.jm=iso(x).slice(0,7)}
  else if(d.tday){const [i,k]=d.tday.split('|'),tk=byId(D.tasks,i);if(!tk)return;const was=tk.pick===TODAY?TODAY:tk.day;
    tk.day='';if(tk.pick===TODAY)tk.pick='';if(was!==k){if(k===TODAY)tk.pick=TODAY;else tk.day=k}}
  else if(d.wdone){D.weeks[d.wdone]={...(D.weeks[d.wdone]||{}),planned:true};save();go('home');return}
  else if('wgoals' in d){U.glvl='month';U.gper={...CUR};go('goals');return}
  else if(d.wlater){D.wraps[d.wlater]={...(D.wraps[d.wlater]||{}),later:TODAY}}
  else if(d.wmake){D.wraps[d.wmake]={...(D.wraps[d.wmake]||{}),done:true};save();go('wrapped/'+d.wmake);return}
  else if(d.wgdel){const [m,g]=d.wgdel.split('|');if(D.weeks[m])D.weeks[m]={...D.weeks[m],goals:(D.weeks[m].goals||[]).filter(x=>x.id!==g)}}
  else if(d.wpicdel){const w={...(D.wraps[d.wpicdel]||{})};delete w.pic;D.wraps[d.wpicdel]=w}
  else return;
  render();
});
document.addEventListener('input',e=>{
  const x=e.target,d=x.dataset;
  if(d.jt){setDayField(d.jt,'text',x.value.trim()?x.value:'');save()}
  else if(d.wnote){D.weeks[d.wnote]={...(D.weeks[d.wnote]||{}),note:x.value};save()}
});
document.addEventListener('change',e=>{
  const x=e.target,d=x.dataset;
  if(d.wgdone){const [m,g]=d.wgdone.split('|'),o=wgoal(m,g);if(o){o.done=x.checked;save();setTimeout(render,200)}}
  else if(d.wgt){const [m,g]=d.wgt.split('|'),o=wgoal(m,g);if(o&&x.value.trim()){o.t=x.value.trim();save()}}
  else if(d.wq){const [ym,f]=d.wq.split('|');D.wraps[ym]={...(D.wraps[ym]||{}),[f]:x.value.trim()};save()}
  else if(d.wpic&&x.files[0]){const ym=d.wpic;shrink(x.files[0]).then(u=>{D.wraps[ym]={...(D.wraps[ym]||{}),pic:u};render()}).catch(()=>toast('Couldn\'t open that picture'))}
});
document.addEventListener('submit',e=>{
  const f=e.target,[fk,fm]=(f.dataset.form||'').split('|');
  if(fk==='wgoal'){const v=f.t.value.trim();if(!v)return;const w=D.weeks[fm]||{};D.weeks[fm]={...w,goals:[...(w.goals||[]),{id:id(),t:v,done:false}]};render();
    setTimeout(()=>document.querySelector(`form[data-form="wgoal|${fm}"] input`)?.focus(),0);return}
  if(f.dataset.form!=='wtask')return;
  const v=f.t.value.trim();if(!v)return;D.tasks.push({id:id(),t:v,when:'now'});render();
  setTimeout(()=>document.querySelector('form[data-form="wtask"] input')?.focus(),0);
});
