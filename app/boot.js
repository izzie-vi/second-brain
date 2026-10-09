/* Start-up: sign in (when sync is set up), then show the app. */
(function(){
const gate=document.getElementById('gate'),app=document.getElementById('app');
const LABEL={local:'Saved on this device.',synced:'Saved and synced.',pending:'Saving…',syncing:'Syncing…',offline:'Offline. Changes will sync when you\'re back online.',error:'Couldn\'t sync just now. Trying again soon.'};
window.showStatus=function(){
  const s=Store.status,el=document.getElementById('savenote');
  el.innerHTML=`<span class="dot ${s}"></span>${LABEL[s]||''}`;
  document.getElementById('signout').hidden=!Store.email;
};
Store.on('status',()=>{if(!app.hidden)showStatus()});

/* another device changed something: show it, but never yank a field out from under the cursor */
let waiting=false;
function busy(){
  const a=document.activeElement;if(U.pop)return true;
  if(!a||!a.matches('#main input,#main textarea,#main select'))return false;
  return !(a.closest('form.addline')&&!a.value);   // an empty "+ Add" line is safe to redraw
}
function later(){
  if(busy()){waiting=true;return}waiting=false;
  const f=document.activeElement&&document.activeElement.closest('#main form[data-form]'),k=f&&f.dataset.form;
  render();
  if(k)document.querySelector(`form[data-form="${CSS.escape(k)}"] input`)?.focus();
}
document.addEventListener('focusout',()=>setTimeout(()=>{if(waiting)later()},50));
Store.on('remote',d=>{D=fix(d||blank());if(!app.hidden)later()});
/* a fresh device with nothing on it just takes what's online */
Store.on('empty',d=>Store.deq(fix(JSON.parse(JSON.stringify(d))),blank()));
Store.on('auth',m=>{if(m==='in')enter();else if(m==='recovery')showGate('recovery');else{D=fix(null);showGate()}});

function enter(){gate.hidden=true;app.hidden=false;render()}
function showGate(mode){
  app.hidden=true;gate.hidden=false;gate.className='gate';
  gate.innerHTML=mode==='recovery'
   ?`<form data-auth="newpass"><h1>New password</h1><label class="f"><span>Password</span><input name="password" type="password" autocomplete="new-password" minlength="8" required></label><div class="row2"><button class="btn solid">Save</button></div><p class="msg" role="status"></p></form>`
   :`<form data-auth="signin"><h1>izzie's notebook</h1>
     <label class="f"><span>Email</span><input name="email" type="email" autocomplete="email" required></label>
     <label class="f"><span>Password</span><input name="password" type="password" autocomplete="current-password" minlength="8" required></label>
     <div class="row2"><button class="btn solid">Sign in</button><button type="button" class="btn" data-auth-act="signup">Create account</button><button type="button" class="link" data-auth-act="forgot">Forgot password?</button></div>
     <p class="msg" role="status"></p></form>`;
}
gate.addEventListener('click',async e=>{
  const b=e.target.closest('[data-auth-act]');if(!b)return;
  const f=gate.querySelector('form'),msg=f.querySelector('.msg'),email=f.email.value.trim(),pw=f.password.value;
  msg.className='msg';
  if(b.dataset.authAct==='forgot'){if(!email){msg.textContent='Type your email first.';return}
    const {error}=await Store.resetPassword(email);msg.textContent=error?error.message:'Check your email for a link to set a new password.';return}
  if(!f.reportValidity())return;
  msg.textContent='Creating your account…';
  const {data,error}=await Store.signUp(email,pw);
  if(error){msg.className='msg err';msg.textContent=error.message;return}
  if(!data.session)msg.textContent='Almost there. Open the confirmation email, then come back here and sign in.';
});
gate.addEventListener('submit',async e=>{
  e.preventDefault();e.stopPropagation();
  const f=e.target,msg=f.querySelector('.msg');msg.className='msg';msg.textContent='One moment…';
  const {error}=f.dataset.auth==='newpass'?await Store.setPassword(f.password.value):await Store.signIn(f.email.value.trim(),f.password.value);
  if(error){msg.className='msg err';msg.textContent=error.message==='Invalid login credentials'?'That email and password don\'t match.':error.message;return}
  if(f.dataset.auth==='newpass'){history.replaceState(null,'',location.pathname);enter()}
});

Store.start().then(m=>{if(m==='out')showGate();else if(gate.hidden||!gate.innerHTML)enter()}).catch(e=>{console.warn(e);enter()});

if('serviceWorker' in navigator&&location.protocol==='https:')navigator.serviceWorker.register('sw.js').catch(()=>{});
})();
