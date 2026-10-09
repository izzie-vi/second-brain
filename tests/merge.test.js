const fs=require('fs'),vm=require('vm'),assert=require('assert');
const ctx={window:{},localStorage:{getItem(){return null},setItem(){},removeItem(){}},document:{addEventListener(){}},navigator:{onLine:true},setInterval(){},setTimeout,clearTimeout,console};
ctx.window=ctx;ctx.addEventListener=()=>{};
vm.createContext(ctx);vm.runInContext(fs.readFileSync(__dirname+'/../app/sync.js','utf8'),ctx);
const {merge3,deq}=ctx.Store;
const base={books:[{id:'a',t:'A',st:'want'},{id:'b',t:'B'}],shelves:['fav','sad'],favs:{'2026-09':{book:'a'}},rlog:{}};
const C=x=>JSON.parse(JSON.stringify(x));
// phone adds a book, computer edits another: both kept
let l=C(base),r=C(base);l.books.push({id:'c',t:'C'});r.books[0].st='reading';
let m=merge3(base,l,r);assert.equal(m.books.length,3);assert.equal(m.books.find(x=>x.id==='a').st,'reading');
// one deletes, other untouched: deleted
l=C(base);r=C(base);l.books=l.books.filter(x=>x.id!=='b');m=merge3(base,l,r);assert.deepEqual(m.books.map(x=>x.id),['a']);
// one deletes, other edits the same item: edit wins
l=C(base);r=C(base);l.books=l.books.filter(x=>x.id!=='b');r.books[1].t='B2';m=merge3(base,l,r);assert.equal(m.books.find(x=>x.id==='b').t,'B2');
// different fields of same item merge
l=C(base);r=C(base);l.books[0].t='A!';r.books[0].st='read';m=merge3(base,l,r);assert.deepEqual(m.books[0],{id:'a',t:'A!',st:'read'});
// string arrays: add on each side, delete on one
l=C(base);r=C(base);l.shelves.push('cozy');r.shelves=r.shelves.filter(x=>x!=='sad');r.shelves.push('classics');m=merge3(base,l,r);assert.deepEqual(m.shelves,['fav','cozy','classics']);
// object keys (rlog days) from both
l=C(base);r=C(base);l.rlog['2026-10-09']={r1:true};r.rlog['2026-10-09']={r2:true};m=merge3(base,l,r);assert.deepEqual(m.rlog['2026-10-09'],{r1:true,r2:true});
// key order differences (jsonb) count as equal
assert.ok(deq({a:1,b:{c:2,d:3}},{b:{d:3,c:2},a:1}));
// no base (new device): union
m=merge3(null,{books:[],shelves:['favorites']},C(base));assert.equal(m.books.length,2);assert.deepEqual(m.shelves,['favorites','fav','sad']);
console.log('merge tests passed');
