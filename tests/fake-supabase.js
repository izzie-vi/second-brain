// Stand-in for supabase-js in tests. Data lives in the test runner (window.dbCall), shared by every "device".
(function(){
  let cb=null,session=JSON.parse(localStorage.getItem('fake-session')||'null'),subs=[];
  window.__realtime=p=>subs.forEach(f=>f(p));
  const call=(op,a)=>window.dbCall(op,JSON.stringify(a)).then(JSON.parse);
  function q(table){
    const st={table,filters:{}};
    const b={
      select(){st.sel=true;return b},
      eq(k,v){st.filters[k]=v;return b},
      maybeSingle(){return call('get',st)},
      insert(row){return call('insert',{table,row})},
      update(row){st.op='update';st.row=row;return b},
      then(res,rej){return (st.op==='update'?call('update',st):call('get',st)).then(res,rej)}
    };
    return b;
  }
  window.supabase={createClient(){return {
    from:q,
    channel(){const c={on(_,__,f){subs.push(f);return c},subscribe(){return c}};return c},
    removeChannel(){subs=[]},
    auth:{
      async getSession(){return {data:{session}}},
      onAuthStateChange(f){cb=f},
      async signInWithPassword({email,password}){if(password!=='secret123')return {error:{message:'Invalid login credentials'}};session={user:{id:'u-'+email,email}};localStorage.setItem('fake-session',JSON.stringify(session));cb&&cb('SIGNED_IN',session);return {data:{session},error:null}},
      async signUp(){return {data:{session:null},error:null}},
      async signOut(){session=null;localStorage.removeItem('fake-session');cb&&cb('SIGNED_OUT',null);return {}},
      async resetPasswordForEmail(){return {}},async updateUser(){return {}}
    }}}};
})();
