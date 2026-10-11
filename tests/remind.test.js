// Checks which fixed dates the reminder function picks (the part between the due:start/due:end markers).
const fs=require('fs'),path=require('path'),assert=require('assert');
const src=fs.readFileSync(path.join(__dirname,'../app/supabase/remind/index.ts'),'utf8');
const code=src.slice(src.indexOf('/* due:start */'),src.indexOf('/* due:end */'));
const {dueReminders,fallsOn}=new Function(code+';return {dueReminders,fallsOn}')();
const D={dates:[
  {id:'a',t:'Dentist',date:'2026-10-20',time:'2:30 pm',remind:'day'},
  {id:'b',t:'Mum birthday',date:'1990-03-31',rep:'year',remind:'week'},
  {id:'c',t:'Rent',date:'2026-01-31',rep:'month',remind:'morning'},
  {id:'d',t:'Old date',date:'2026-10-14'},                 // no remind field: the day before
  {id:'e',t:'Quiet',date:'2026-10-20',remind:''},
  {id:'f',t:'Bins',date:'2026-10-05',rep:'week',remind:'morning'},
]};
const keys=(day,h=9)=>dueReminders(D,day,h).map(x=>x.key.split('|')[0]).sort().join(',');
assert.strictEqual(keys('2026-10-19'),'a,f');              // dentist tomorrow, bins every Monday
assert.strictEqual(keys('2026-10-19',8),'');               // only at 9
assert.strictEqual(dueReminders(D,'2026-10-19',9).find(x=>x.key.startsWith('a')).body,'Tomorrow · 2:30 pm');
assert.strictEqual(keys('2026-10-13'),'d');
assert.strictEqual(keys('2027-03-24'),'b');                 // a week before the 31st
assert.strictEqual(dueReminders(D,'2027-03-24',9)[0].body,'Wed Mar 31');
assert.strictEqual(keys('2026-02-28'),'c');                 // rent on the 31st -> last day of February
assert.strictEqual(keys('2026-04-30'),'c');
assert.ok(!fallsOn(D.dates[2],'2025-12-31'));               // not before it started
assert.ok(fallsOn({date:'2024-02-29',rep:'year'},'2025-02-28'));
assert.strictEqual(keys('2026-09-28'),'');                  // bins hadn't started yet
console.log('reminder tests passed');
