// Sample data for tests only. Needs the app helpers (off, ymOff, Y, YM, TODAY).
function sample(){
  const log={};for(let i=1;i<7;i++){log[off(-i)]={r1:true,r2:i%3!==0,r3:i%2===0,r4:i<4,r5:false}}
  const B=(o)=>({fmt:'Physical',sh:[],own:'Own it',times:o.st==='read'?1:0,grades:{},review:'',notes:'',genre:'',pages:'',pmode:'pages',pg:'',pct:'',start:'',end:'',...o});
  return {
  shelves:['favorites','sad','classics','romance'],
  books:[
   B({id:'b1',t:'East of Eden',a:'John Steinbeck',st:'reading',genre:'Classic',pages:601,pmode:'pages',pg:372,sh:['classics'],start:off(-24)}),
   B({id:'b2',t:'Circe',a:'Madeline Miller',st:'reading',fmt:'Audiobook',genre:'Mythology',pages:393,pmode:'pct',pct:30,sh:['favorites'],own:'Borrowed',start:off(-9)}),
   B({id:'b3',t:'Piranesi',a:'Susanna Clarke',st:'read',fmt:'Ebook',genre:'Fantasy',pages:245,sh:['favorites'],grades:{Characters:5,Writing:5,Plot:4,Enjoyment:5},review:'Quiet and strange, like waking up somewhere you love but can\'t name. The House felt like a character of its own.',start:off(-52),end:off(-40),times:2}),
   B({id:'b4',t:'The Song of Achilles',a:'Madeline Miller',st:'read',genre:'Mythology',pages:378,sh:['favorites','sad','romance'],grades:{Characters:5,Writing:4,Plot:4,Enjoyment:5},end:off(-80)}),
   B({id:'b5',t:'Pride and Prejudice',a:'Jane Austen',st:'read',genre:'Classic',pages:432,sh:['classics','romance'],grades:{Characters:5,Writing:4,Plot:3,Enjoyment:4},end:off(-120),times:3}),
   B({id:'b6',t:'Klara and the Sun',a:'Kazuo Ishiguro',st:'read',fmt:'Ebook',genre:'Literary',pages:303,sh:['sad'],grades:{Characters:4,Writing:4,Plot:3,Enjoyment:4},end:off(-150)}),
   B({id:'b10',t:'Rebecca',a:'Daphne du Maurier',st:'read',genre:'Gothic',pages:410,sh:['classics'],grades:{Enjoyment:4,Writing:5},end:off(-5)}),
   B({id:'b11',t:'Persuasion',a:'Jane Austen',st:'read',genre:'Classic',pages:249,sh:['classics','romance'],grades:{Enjoyment:5},end:off(-200)}),
   B({id:'b7',t:'The Night Circus',a:'Erin Morgenstern',st:'paused',fmt:'Audiobook',genre:'Fantasy',pmode:'pct',pct:40,sh:['romance'],own:'Borrowed'}),
   B({id:'b12',t:'Beautiful World, Where Are You',a:'Sally Rooney',st:'dnf',genre:'Literary',pmode:'none'}),
   B({id:'b8',t:'Middlemarch',a:'George Eliot',st:'want',genre:'Classic',pages:880,sh:['classics'],own:'Want to buy'}),
   B({id:'b9',t:'Tomorrow, and Tomorrow, and Tomorrow',a:'Gabrielle Zevin',st:'want',genre:'Literary',own:'Want to buy'})
  ],
  quotes:[{id:'q1',book:'b1',text:'And now that you don\'t have to be perfect, you can be good.',page:'412'},{id:'q2',book:'b3',text:'The Beauty of the House is immeasurable; its Kindness infinite.',page:'5'},{id:'q3',book:'b5',text:'I declare after all there is no enjoyment like reading!',page:'ch. 11'}],
  favs:{[ymOff(-1)]:{book:'b3',character:'Piranesi himself',line:'The Beauty of the House is immeasurable'},[ymOff(-2)]:{book:'b4',character:'Patroclus',line:''}},
  projects:[
   {id:'p1',t:'The Lighthouse Keeper\'s Daughter',k:'Novel',pin:true,phase:'writing',ch:'8',at:'Mara just found the letter. The storm scene comes next.',notes:'Mara is braver on paper than out loud.\nThe lighthouse should feel like a fourth character.',file:'Lighthouse.scriv',opened:off(-1),sessions:[{d:off(-3),type:'writing',w:800,n:'Chapter 7 transition'},{d:off(-7),type:'editing',w:0,n:'Tightened chapter 5 dialogue'},{d:off(-10),type:'writing',w:1200,n:'The market scene'},{d:off(-30),type:'plotting',w:0,n:'Reworked the act two outline'}]},
   {id:'p2',t:'Salt',k:'Short story',pin:true,phase:'revising',ch:'',at:'The ending feels rushed.',notes:'Contest deadline is in Days.',file:'Salt.scriv',opened:off(-4),sessions:[{d:off(-15),type:'writing',w:1900,n:'Finished the full draft'}]},
   {id:'p3',t:'Glass Orchard',k:'Novella',pin:false,phase:'plotting',ch:'',at:'Act one is mapped out.',notes:'',file:'Glass Orchard.scriv',opened:off(-26),sessions:[{d:off(-26),type:'plotting',w:0,n:'Act one beats'}]},
   {id:'p4',t:'Letters to No One',k:'Poetry',pin:false,phase:'writing',ch:'',at:'Fourteen poems.',notes:'',file:'Letters.scriv',opened:off(-60),sessions:[]},
   {id:'p6',t:'The Clockmaker\'s Debt',k:'Novel',pin:false,phase:'plotting',ch:'',at:'Lost the thread after chapter 3.',notes:'',file:'Clockmaker.scriv',opened:off(-200),sessions:[]},
   {id:'p5',t:'Small Hours',k:'Short story',pin:false,phase:'done',ch:'',at:'Submitted.',notes:'',file:'Small Hours.scriv',opened:off(-210),sessions:[]}
  ],
  notes:[
   {id:'c1',title:'Nobody lies after sunset',body:'A town where nobody can lie after sunset.',proj:'',parent:''},
   {id:'c1a',title:'The mayor',body:'The only one who knows why.',proj:'',parent:'c1'},
   {id:'c1b',title:'Narrator',body:'A kid who stays up too late.',proj:'',parent:'c1'},
   {id:'c2',title:'Library notes',body:'Two sisters who only talk through notes left in library books.',proj:'',parent:''},
   {id:'c3',title:'The cartographer',body:'Mapping a city that changes every night.',proj:'',parent:''},
   {id:'c4',title:'Who the letter was for',body:'What if the letter was never meant for Mara? Maybe it was for her mother.',proj:'p1',parent:''},
   {id:'c5',title:'Mara',body:'Braver on paper than out loud. Keeps every letter.',proj:'p1',parent:''},
   {id:'c6',title:'The storm',body:'Chapter 9. The lamp goes out. Mara climbs anyway.',proj:'p1',parent:''},
   {id:'c7',title:'The lighthouse',body:'Should feel like a fourth character.',proj:'p1',parent:''},
   {id:'c8',title:'The ending',body:'Too rushed. Slow down the last two paragraphs.',proj:'p2',parent:''}
  ],
  tasks:[
   {id:'t1',t:'Reply to Ana\'s email',when:'now',pick:TODAY,cat:'school'},{id:'t2',t:'Return library books',when:'now',pick:TODAY,cat:'home'},{id:'t3',t:'Back up Scrivener files',when:'now',cat:'writing'},
   {id:'t4',t:'Call grandma',when:'soon',pick:TODAY},{id:'t5',t:'Reorganize bookshelf',when:'soon',cat:'home',steps:[{t:'Take everything off',done:true},{t:'Sort by color',done:false},{t:'Donate a box',done:false}]},{id:'t6',t:'Plan a winter reading list',when:'soon',note:'Ask Ana for two picks.'},
   {id:'t7',t:'Learn to bake sourdough',when:'later'},{id:'t8',t:'Repaint the bedroom wall',when:'later',cat:'home'},{id:'t9',t:'Order new notebook',when:'now',done:off(-1)}],
  dates:[{id:'d1',t:'Pay phone bill',date:off(6),tag:'Bill'},{id:'d2',t:'Dentist',date:off(12),time:'2:30 pm',tag:'Appointment'},{id:'d3',t:'Submit "Salt" to the contest',date:off(23),tag:'Writing'},{id:'d0',t:'Library books due',date:off(-2),tag:'Errand'}],
  rhythm:[{id:'r1',t:'Drink water'},{id:'r2',t:'Take vitamins'},{id:'r3',t:'Read 10 pages'},{id:'r4',t:'10 minute tidy'},{id:'r5',t:'Stretch'}],
  rlog:{...log,[TODAY]:{r1:true,r2:true}},
  goals:(()=>{const Q=n=>Y+'-Q'+n,M=n=>Y+'-'+String(n).padStart(2,'0'),R=(id,q,t,n)=>({id,per:q,parent:q.length===7?'g1':id.slice(0,3),t,kind:'number',target:n,unit:'books',auto:true});return [
   {id:'g1',per:Y,t:'Read 20 books',kind:'number',target:20,unit:'books',auto:true},
   R('g1a',Q(1),'Read 5 books',5),R('g1b',Q(2),'Read 5 books',5),R('g1c',Q(3),'Read 5 books',5),R('g1d',Q(4),'Read 5 books',5),
   {...R('g1d1',M(10),'Read 2 books',2),parent:'g1d'},{...R('g1d2',M(11),'Read 2 books',2),parent:'g1d'},{...R('g1d3',M(12),'Read 1 book',1),parent:'g1d'},
   {id:'g2',per:Y,t:'Finish the lighthouse novel',kind:'steps',steps:[{t:'Plot',child:'g2a'},{t:'Draft one',child:'g2b'},{t:'Draft two',child:'g2c'},{t:'Edit',child:'g2d'}]},
   {id:'g2a',per:Q(1),parent:'g2',t:'Plot',kind:'steps',steps:[{t:'Rough plot',done:true},{t:'Chapter outline',done:true},{t:'Character sheets',done:true}]},
   {id:'g2b',per:Q(2),parent:'g2',t:'Draft one',kind:'steps',steps:[{t:'Chapters 1 to 10',done:true},{t:'Chapters 11 to 20',done:true}]},
   {id:'g2c',per:Q(3),parent:'g2',t:'Draft two',kind:'steps',steps:[{t:'Rewrite act one',done:true},{t:'Rewrite act two',done:true},{t:'Rewrite act three',done:true}]},
   {id:'g2d',per:Q(4),parent:'g2',t:'Edit',kind:'steps',steps:[{t:'Read it through',child:'g2d1'},{t:'Fix act two',child:'g2d2'},{t:'Line edit',child:'g2d3'}]},
   {id:'g2d1',per:M(10),parent:'g2d',t:'Read it through',kind:'steps',steps:[{t:'Chapters 1 to 10',done:true},{t:'Chapters 11 to 20',done:false}]},
   {id:'g2d2',per:M(11),parent:'g2d',t:'Fix act two',kind:'steps',steps:[]},
   {id:'g2d3',per:M(12),parent:'g2d',t:'Line edit',kind:'steps',steps:[]},
   {id:'g3',per:Y,t:'Do the daily rhythm on 200 days',kind:'number',target:200,unit:'days',v:141},
   {id:'g4',per:Q(4),t:'Submit Salt to a contest',kind:'once',done:false},
   {id:'g5',per:M(10),t:'Set up the Second Brain',kind:'steps',steps:[{t:'Answer the questions',done:true},{t:'Try the new mockup',done:false}]}
  ]})()};
}
