/* Phone reminders for fixed dates. The phone asks once for permission, then a small Supabase
   function (supabase/remind) sends a notification at 9 am when a date is coming up.
   On iPhone this only works in the app added to the Home Screen. */
(function(){
const K='sb-push';
const get=()=>{try{return localStorage.getItem(K)}catch(e){return null}};
const set=v=>{try{v?localStorage.setItem(K,v):localStorage.removeItem(K)}catch(e){}};
const supported=()=>'serviceWorker' in navigator&&'PushManager' in window&&'Notification' in window;
const ios=/iPhone|iPad|iPod/.test(navigator.userAgent);
const standalone=()=>matchMedia('(display-mode: standalone)').matches||navigator.standalone===true;
const b64=s=>{const p='='.repeat((4-s.length%4)%4),r=atob((s+p).replace(/-/g,'+').replace(/_/g,'/'));return Uint8Array.from(r,c=>c.charCodeAt(0))};

window.remindLink=function(){
  if(!Store.online||!Store.email)return '';
  const on=get()==='on'&&supported()&&Notification.permission==='granted';
  return `<button class="link" data-remind="${on?'menu':'on'}">${on?'Reminders on':'Turn on reminders'}</button>`;
};
async function fn(body){const {data,error}=await Store.client.functions.invoke('remind',{body});if(error)throw error;return data}
async function turnOn(){
  if(!supported()){toast(ios&&!standalone()?'On iPhone, add the notebook to your Home Screen first (Share, then Add to Home Screen), then open it from there.':'This browser can\'t show reminders.');return}
  const perm=await Notification.requestPermission();   // must come straight from the tap
  if(perm!=='granted'){toast('Notifications are off for the notebook. You can allow them in Settings.');return}
  toast('Turning on reminders…');
  try{
    const reg=await navigator.serviceWorker.ready;
    const {key}=await fn({op:'key'});
    let sub=await reg.pushManager.getSubscription();
    if(sub&&sub.options&&sub.options.applicationServerKey&&btoa(String.fromCharCode(...new Uint8Array(sub.options.applicationServerKey))).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'')!==key){await sub.unsubscribe();sub=null}
    sub=sub||await reg.pushManager.subscribe({userVisibleOnly:true,applicationServerKey:b64(key)});
    const {error}=await Store.client.from('push_subs').upsert({endpoint:sub.endpoint,user_id:Store.uid,sub:sub.toJSON(),tz:Intl.DateTimeFormat().resolvedOptions().timeZone||'UTC'});
    if(error)throw error;
    set('on');await fn({op:'test',endpoint:sub.endpoint}).catch(()=>{});
    toast('Reminders are on. A test one should show up now.');render();
  }catch(e){console.warn('reminders',e);toast('Couldn\'t turn on reminders. Is the reminder setup in Supabase done?')}
}
async function turnOff(){
  try{const reg=await navigator.serviceWorker.ready,sub=await reg.pushManager.getSubscription();
    if(sub){await Store.client.from('push_subs').delete().eq('endpoint',sub.endpoint);await sub.unsubscribe()}}catch(e){console.warn(e)}
  set('');toast('Reminders are off on this device');render();
}
document.addEventListener('click',e=>{
  const t=e.target.closest('[data-remind]');if(!t)return;const a=t.dataset.remind;
  if(a==='on')turnOn();
  else if(a==='menu'){U.pop={kind:'remind'};document.getElementById('layer').innerHTML=`<div class="scrim" data-scrim><div class="modal" role="dialog" aria-modal="true" aria-label="Reminders"><h2>Reminders</h2>
    <p>Reminders for fixed dates come to this device at 9 am. Each date has its own "Remind me" choice.</p>
    <div class="bar2"><button class="btn" data-remind="test">Send a test</button><button class="btn" data-remind="off">Turn off here</button><button class="btn" data-close>Close</button></div></div></div>`}
  else if(a==='test'){navigator.serviceWorker.ready.then(r=>r.pushManager.getSubscription()).then(s=>s?fn({op:'test',endpoint:s.endpoint}):Promise.reject()).then(()=>toast('Sent. It should show up in a moment.')).catch(()=>toast('Couldn\'t send a test just now'))}
  else if(a==='off'){close(false);turnOff()}
});
})();
