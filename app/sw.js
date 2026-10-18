/* Offline support. App files: try the network first so updates show up right away,
   fall back to the saved copy when offline. Fonts: saved copy first. */
const CACHE='notebook-v5';
const SHELL=['./','index.html','styles.css','reading.css','app.js','reading.js','journal.js','remind.js','sync.js','boot.js','config.js','vendor/supabase.js','manifest.webmanifest','icons/icon-192.png','icons/icon-512.png'];
self.addEventListener('install',e=>{e.waitUntil(caches.open(CACHE).then(c=>c.addAll(SHELL)).then(()=>self.skipWaiting()))});
self.addEventListener('activate',e=>{e.waitUntil(caches.keys().then(ks=>Promise.all(ks.filter(k=>k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim()))});
self.addEventListener('fetch',e=>{
  const r=e.request;if(r.method!=='GET')return;
  const u=new URL(r.url);
  if(u.origin===location.origin){
    e.respondWith(fetch(r).then(res=>{if(res.ok){const c=res.clone();caches.open(CACHE).then(x=>x.put(r,c))}return res})
      .catch(()=>caches.match(r,{ignoreSearch:true}).then(m=>m||(r.mode==='navigate'?caches.match('index.html'):Response.error()))));
    return;
  }
  if(u.hostname==='fonts.googleapis.com'||u.hostname==='fonts.gstatic.com'){
    e.respondWith(caches.match(r).then(m=>m||fetch(r).then(res=>{if(res.ok){const c=res.clone();caches.open(CACHE).then(x=>x.put(r,c))}return res})));
  }
});
/* reminders for fixed dates (sent by supabase/remind) */
self.addEventListener('push',e=>{
  let m={};try{m=e.data?e.data.json():{}}catch(_){m={title:'Notebook',body:e.data&&e.data.text()}}
  e.waitUntil(self.registration.showNotification(m.title||'Notebook',{body:m.body||'',icon:'icons/icon-192.png',badge:'icons/icon-192.png',data:{url:m.url||'./#days'}}));
});
self.addEventListener('notificationclick',e=>{
  e.notification.close();const url=new URL(e.notification.data&&e.notification.data.url||'./',self.registration.scope).href;
  e.waitUntil(clients.matchAll({type:'window',includeUncontrolled:true}).then(ws=>{for(const w of ws){if('focus' in w){w.navigate(url).catch(()=>{});return w.focus()}}return clients.openWindow(url)}));
});
