/* Saving and syncing.
   Everything lives in one JSON document per person. Each device keeps a copy in localStorage,
   so the app opens and works offline. When online, changes go to Supabase. If two devices
   changed things at the same time, the edits are merged item by item (three-way merge against
   the last version both had seen), so nothing is lost. */
(function(){
const K={data:'sb-data',base:'sb-base',rev:'sb-rev',uid:'sb-uid'};
const get=k=>{try{return localStorage.getItem(k)}catch(e){return null}};
const set=(k,v)=>{try{localStorage.setItem(k,v);return true}catch(e){return false}};
const del=k=>{try{localStorage.removeItem(k)}catch(e){}};
const parse=s=>{try{return s?JSON.parse(s):null}catch(e){return null}};

/* ---------- three-way merge ---------- */
const isObj=x=>x!==null&&typeof x==='object'&&!Array.isArray(x);
function deq(a,b){
  if(a===b)return true;
  if(a===null||b===null||typeof a!=='object'||typeof b!=='object')return false;
  if(Array.isArray(a)!==Array.isArray(b))return false;
  if(Array.isArray(a))return a.length===b.length&&a.every((x,i)=>deq(x,b[i]));
  const ka=Object.keys(a);
  return ka.length===Object.keys(b).length&&ka.every(k=>Object.prototype.hasOwnProperty.call(b,k)&&deq(a[k],b[k]));
}
const hasIds=a=>a.every(x=>isObj(x)&&typeof x.id==='string');
function merge3(b,l,r){
  if(deq(l,r))return l;
  if(b!==undefined&&b!==null){if(deq(b,l))return r;if(deq(b,r))return l}
  if(l===undefined)return r;if(r===undefined)return l;
  if(isObj(l)&&isObj(r)){
    const bb=isObj(b)?b:{},out={};
    for(const k of new Set([...Object.keys(l),...Object.keys(r)])){
      const inL=k in l,inR=k in r,inB=k in bb;
      if(inL&&inR)out[k]=merge3(bb[k],l[k],r[k]);
      else if(inL){if(!(inB&&deq(bb[k],l[k])))out[k]=l[k]}   // other side deleted it; keep only if we changed it
      else{if(!(inB&&deq(bb[k],r[k])))out[k]=r[k]}
    }
    return out;
  }
  if(Array.isArray(l)&&Array.isArray(r)){
    const ba=Array.isArray(b)?b:[];
    if(hasIds(l)&&hasIds(r)&&hasIds(ba)){
      const L=new Map(l.map(x=>[x.id,x])),R=new Map(r.map(x=>[x.id,x])),B=new Map(ba.map(x=>[x.id,x])),out=[];
      for(const i of [...L.keys(),...[...R.keys()].filter(i=>!L.has(i))]){
        const x=L.get(i),y=R.get(i),z=B.get(i);
        if(x&&y)out.push(merge3(z,x,y));
        else if(x){if(!(z&&deq(z,x)))out.push(x)}
        else if(!(z&&deq(z,y)))out.push(y);
      }
      return out;
    }
    if([...l,...r,...ba].every(x=>x===null||typeof x!=='object')){
      const out=l.filter(x=>r.includes(x)||!ba.includes(x));
      for(const x of r)if(!out.includes(x)&&!ba.includes(x))out.push(x);
      return out;
    }
  }
  return l;   // a true clash on one value: this device's edit wins
}

/* ---------- store ---------- */
const cfg=window.SB_CONFIG||{};
const online=!!(cfg.url&&cfg.key&&window.supabase);
const sb=online?window.supabase.createClient(cfg.url,cfg.key,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}}):null;
let user=null,last='',timer=null,busy=false,again=false,status='local',channel=null;
const hooks={remote:()=>{},status:()=>{},auth:()=>{},empty:()=>false};
function setStatus(s){status=s;hooks.status(s)}

function load(){const r=get(K.data);last=r||'';return parse(r)}
function save(d){const s=JSON.stringify(d);if(s===last)return;last=s;set(K.data,s);if(user){setStatus('pending');schedule()}}
function schedule(ms=900){clearTimeout(timer);timer=setTimeout(sync,ms)}

async function sync(){
  if(!user)return;
  if(busy){again=true;return}
  busy=true;setStatus('syncing');
  try{
    for(let tries=0;tries<5;tries++){
      const start=parse(get(K.data))||{};
      const {data:row,error}=await sb.from('brain').select('data,rev').eq('user_id',user.id).maybeSingle();
      if(error)throw error;
      if(!row){
        const {error:e}=await sb.from('brain').insert({user_id:user.id,data:start,rev:1});
        if(e){if(e.code==='23505')continue;throw e}
        commit(start,1);break;
      }
      const baseRev=Number(get(K.rev))||0;
      let merged=start;
      if(row.rev!==baseRev)merged=!baseRev&&hooks.empty(start)?row.data||{}:merge3(baseRev?parse(get(K.base)):null,start,row.data||{});
      if(deq(merged,row.data)){commit(row.data,row.rev);adopt(start,row.data);break}
      const {data:up,error:e2}=await sb.from('brain').update({data:merged,rev:row.rev+1,updated_at:new Date().toISOString()}).eq('user_id',user.id).eq('rev',row.rev).select('rev');
      if(e2)throw e2;
      if(up&&up.length){commit(merged,row.rev+1);adopt(start,merged);break}
      // someone else saved in between: go round again
    }
    setStatus(deq(parse(last),parse(get(K.base)))?'synced':'pending');
    if(status==='pending')again=true;
  }catch(e){console.warn('sync',e);setStatus(navigator.onLine?'error':'offline')}
  busy=false;
  if(again){again=false;schedule(400)}
}
function commit(d,rev){set(K.base,JSON.stringify(d));set(K.rev,String(rev))}
/* take the synced version, keeping anything typed while the sync was running */
function adopt(start,synced){
  const cur=parse(get(K.data))||{};
  const fin=deq(cur,start)?synced:merge3(start,cur,synced);
  if(deq(fin,cur))return;
  const s=JSON.stringify(fin);last=s;set(K.data,s);
  hooks.remote(fin);
}

function clearLocal(){[K.data,K.base,K.rev,K.uid].forEach(del);last=''}
function setUser(u){
  if(u&&get(K.uid)&&get(K.uid)!==u.id){clearLocal();hooks.remote(null)}
  user=u;
  if(u){set(K.uid,u.id);listen();schedule(0)}
  else if(channel){sb.removeChannel(channel);channel=null}
}
function listen(){
  if(channel||!user)return;
  channel=sb.channel('brain-'+user.id)
    .on('postgres_changes',{event:'*',schema:'public',table:'brain',filter:'user_id=eq.'+user.id},p=>{if(p.new&&p.new.rev!==Number(get(K.rev)))schedule(150)})
    .subscribe();
}
document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible'&&user)schedule(0)});
window.addEventListener('online',()=>{if(user)schedule(0)});
window.addEventListener('offline',()=>{if(user)setStatus('offline')});
setInterval(()=>{if(user&&document.visibilityState==='visible')schedule(0)},60000);

async function start(){
  if(!online)return 'local';
  const {data}=await sb.auth.getSession();
  sb.auth.onAuthStateChange((ev,session)=>{
    if(ev==='PASSWORD_RECOVERY'){hooks.auth('recovery');return}
    const u=session?session.user:null;
    if((u&&u.id)!==(user&&user.id)){setUser(u);hooks.auth(u?'in':'out')}
  });
  if(data.session){setUser(data.session.user);return 'in'}
  return 'out';
}

window.Store={
  load,save,start,merge3,deq,
  get status(){return status},
  get email(){return user&&user.email},
  get client(){return sb},
  get uid(){return user&&user.id},
  get online(){return online},
  on(k,f){hooks[k]=f},
  syncNow(){if(user)schedule(0)},
  async signIn(email,password){return sb.auth.signInWithPassword({email,password})},
  async signUp(email,password){return sb.auth.signUp({email,password,options:{emailRedirectTo:location.origin+location.pathname}})},
  async resetPassword(email){return sb.auth.resetPasswordForEmail(email,{redirectTo:location.origin+location.pathname})},
  async setPassword(password){return sb.auth.updateUser({password})},
  async signOut(){await sync();await sb.auth.signOut();clearLocal()}
};
})();
