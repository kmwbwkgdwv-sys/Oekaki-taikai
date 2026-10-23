const COLORS=['#000000','#7f7f7f','#ffffff','#e53935','#fb8c00','#fdd835','#8bc34a','#2e7d32','#00acc1','#1e88e5','#283593','#8e24aa','#ec407a','#795548','#ffccbc'];
const W=400,H=300,$=s=>document.querySelector(s),app=$('#app');
const rnd=a=>a[Math.floor(Math.random()*a.length)];
const shuf=a=>a.map(x=>[Math.random(),x]).sort((a,b)=>a[0]-b[0]).map(x=>x[1]);
const esc=s=>String(s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const GAMES=[
{i:'🦍➡️🖼️➡️❓',n:'① お絵描き伝言ゲーム',d:'お題を絵で伝え、次の人が絵を見て描く。最後に答え合わせ！'},
{i:'✏️👀⚡',n:'② 何を描いたでしょう？',d:'1人が描き、残り3人が早押しで当てる。ポイントを稼げ！'},
{i:'🎨🏆🗳️',n:'③ お絵描きバトル',d:'全員が同じお題を描き、自分以外に投票して一番を決める！'}];
let peer,conns=[null,null,null,null],hostConn,isHost=false,me=0,G={phase:'home'},off=0,lastKey,PAD,SUBFN,done=false,LIVE=[],GOT={},HPW='';

// ---------- 通信 ----------
function bc(){G.now=Date.now();const m={k:'st',G};conns.forEach(c=>c&&c.open&&c.send(m));render();}
function act(m){m.p=me;if(isHost)hostAct(m);else hostConn.send(m);}
function mk(){const nm=$('#nm').value.trim(),lb=$('#lb').value.trim(),pw=$('#pw').value;
 if(!nm||!pw||!/^[A-Za-z0-9]{3,12}$/.test(lb))return alert('なまえ・パスワードを入力し、ロビーIDは半角英数字3〜12文字にしてください');
 HPW=pw;peer=new Peer('edg-'+lb);
 peer.on('open',()=>{isHost=true;me=0;G={phase:'lobby',players:[nm],game:0,T:60,lb};bc();});
 peer.on('error',e=>alert(e.type==='unavailable-id'?'そのロビーIDは使用中です':'接続エラー: '+e.type));
 peer.on('connection',c=>{c.slot=-1;
  c.on('data',m=>{
   if(m.k==='join'){
    if(m.pw!==HPW)return c.send({k:'err',msg:'パスワードが違います'});
    if(G.phase!=='lobby'||G.players.length>=4)return c.send({k:'err',msg:'参加できません(満員またはゲーム中)'});
    const i=G.players.length;G.players.push(String(m.name).slice(0,8));conns[i]=c;c.slot=i;c.send({k:'joined',id:i});bc();
   }else if(c.slot>0){m.p=c.slot;hostAct(m);}});
  c.on('close',()=>{if(G.phase==='lobby'&&c.slot>0){G.players.splice(c.slot,1);conns.splice(c.slot,1);conns.push(null);
   conns.forEach((x,i)=>{if(x){x.slot=i;x.send({k:'joined',id:i});}});bc();}});});}
function jn(){const nm=$('#nm').value.trim(),lb=$('#lb').value.trim(),pw=$('#pw').value;
 if(!nm||!pw||!lb)return alert('すべて入力してください');
 peer=new Peer();
 peer.on('error',()=>alert('接続できません。ロビーIDを確認してください'));
 peer.on('open',()=>{hostConn=peer.connect('edg-'+lb,{reliable:true});
  hostConn.on('open',()=>hostConn.send({k:'join',name:nm,pw}));
  hostConn.on('close',()=>{alert('切断されました');location.reload();});
  hostConn.on('data',m=>{
   if(m.k==='joined')me=m.id;
   else if(m.k==='err')alert(m.msg);
   else if(m.k==='st'){off=Date.now()-m.G.now;G=m.G;render();}
   else if(m.k==='live'){LIVE=m.s;livePaint();}});});}
const livePaint=()=>{const lv=$('#lv');if(lv&&G.sub==='draw')paint(lv,LIVE);};

// ---------- ホスト側ロジック ----------
function start(){const g=G.game;Object.assign(G,{phase:'play',sc:[0,0,0,0],r:0,ri:0,cnt:0,msg:''});GOT={};
 if(g==0){G.step=0;G.sub='topic';G.deadline=Date.now()+30000;}
 else{G.order=shuf([0,1,2,3]).concat(shuf([0,1,2,3]));G.words=shuf(WORDS).slice(0,8);newRound();}
 bc();}
function newRound(){const n=Date.now();GOT={};G.cnt=0;G.dr={};G.buz=-1;G.ans='';
 if(G.game==1){G.sub='draw';G.word=G.words[G.r];G.deadline=n+300000;}
 else{G.sub='topic';G.topic='';G.deadline=n+30000;}}
function nextR(){G.r++;if(G.r>=8)G.phase='end';else newRound();bc();}
function res(msg){G.sub='res';G.msg=msg;G.deadline=Date.now()+4000;bc();}
function end0t(){G.ch=[0,1,2,3].map(i=>({w:GOT[i]||rnd(WORDS),it:[]}));GOT={};G.cnt=0;G.sub='step';G.deadline=Date.now()+G.T*1000;bc();}
function adv0(){const s=G.step;
 for(let p=0;p<4;p++){const m=GOT[p]||{},c=(p-s-1+4)%4;G.ch[c].it.push(s%2?{by:p,t:m.text||'？'}:{by:p,d:m.data||[]});}
 GOT={};G.cnt=0;G.step++;
 if(G.step==4){G.sub='reveal';G.ri=0;}else G.deadline=Date.now()+(G.step%2?30000:G.T*1000);bc();}
function setTopic(t){G.topic=(t||'').trim()||rnd(WORDS);G.sub='draw';G.deadline=Date.now()+G.T*1000;GOT={};G.cnt=0;bc();}
function toVote(){G.dr=[0,1,2,3].map(i=>GOT[i]||[]);GOT={};G.cnt=0;G.sub='vote';G.deadline=Date.now()+40000;bc();}
function tally(){G.vc=[0,0,0,0];for(const p in GOT){G.vc[GOT[p]]++;G.sc[GOT[p]]++;}GOT={};G.cnt=0;G.sub='res';G.deadline=Date.now()+8000;bc();}
function hostAct(m){const p=m.p,n=Date.now(),t=m.t;
 if(p==0){
  if(t==='cfg'&&G.phase==='lobby'){G.game=m.game;G.T=m.T;return bc();}
  if(t==='start'&&G.phase==='lobby'&&G.players.length==4)return start();
  if(t==='back'){G.phase='lobby';return bc();}
  if(t==='next'&&G.game==0&&G.sub==='reveal'){G.ri++;if(G.ri>=20)G.phase='end';return bc();}}
 if(G.phase!=='play')return;
 if(t==='live'){conns.forEach((c,i)=>c&&i!=p&&c.send({k:'live',s:m.s}));if(p){LIVE=m.s;livePaint();}return;}
 if(G.game==0){if(t==='topic'&&G.sub==='topic'){GOT[p]=(m.text||'').trim();G.cnt=Object.keys(GOT).length;G.cnt>=4?end0t():bc();}
 else if(t==='sub'&&G.sub==='step'){GOT[p]=m;G.cnt=Object.keys(GOT).length;G.cnt>=4?adv0():bc();}return;}
 if(G.game==1){const dp=G.order[G.r];
  if(t==='buzz'&&G.sub==='draw'&&G.buz<0&&p!=dp){G.buz=p;G.left=G.deadline-n;bc();}
  else if(t==='ans'&&p==G.buz){G.ans=m.text;bc();}
  else if(t==='judge'&&p==dp&&G.buz>=0){
   if(m.ok){G.sc[G.buz]++;G.sc[dp]++;res('⭕ '+G.players[G.buz]+'さんが正解！ お題は「'+G.word+'」');}
   else{G.buz=-1;G.ans='';G.deadline=n+G.left;bc();}}
  return;}
 if(G.game==2){
  if(G.sub==='topic'&&t==='topic'&&p==G.order[G.r])setTopic(m.text);
  else if(G.sub==='draw'&&t==='dr'){GOT[p]=m.data;G.cnt=Object.keys(GOT).length;G.cnt>=4?toVote():bc();}
  else if(G.sub==='vote'&&t==='vote'&&m.v!=p){GOT[p]=m.v;G.cnt=Object.keys(GOT).length;G.cnt>=4?tally():bc();}}}
setInterval(()=>{if(!isHost||G.phase!=='play')return;const n=Date.now(),d=G.deadline;
 if(G.game==0){if(G.sub==='topic'&&n>d+3000)end0t();else if(G.sub==='step'&&n>d+3000)adv0();}
 else if(G.game==1){if(G.sub==='draw'&&G.buz<0&&n>d)res('時間切れ… お題は「'+G.word+'」');else if(G.sub==='res'&&n>d)nextR();}
 else{if(G.sub==='topic'&&n>d+2000)setTopic('');else if(G.sub==='draw'&&n>d+3000)toVote();else if(G.sub==='vote'&&n>d+3000)tally();else if(G.sub==='res'&&n>d)nextR();}},500);

// ---------- お絵描きパレット ----------
function paint(cv,st){const x=cv.getContext('2d');x.fillStyle='#fff';x.fillRect(0,0,W,H);x.lineCap=x.lineJoin='round';
 for(const s of st||[]){x.strokeStyle=s.c<0?'#fff':COLORS[s.c];x.lineWidth=s.w;x.beginPath();const p=s.p;x.moveTo(p[0],p[1]);if(p.length==2)x.lineTo(p[0]+.1,p[1]);for(let i=2;i<p.length;i+=2)x.lineTo(p[i],p[i+1]);x.stroke();}}
function mkPad(onch){const el=document.createElement('div');
 el.innerHTML=`<canvas class="cv" width="${W}" height="${H}"></canvas><div class="pal">${COLORS.map((c,i)=>`<i data-c="${i}" style="background:${c}"></i>`).join('')}</div><div><button data-e="1">🧽消しゴム</button><button data-w="4">細</button><button data-w="10">中</button><button data-w="22">太</button><button data-u="1">↩ 巻き戻す</button></div>`;
 const cv=el.firstChild,P={el,st:[],on:true};let c=0,w=10,cur=null;
 const pt=e=>{const r=cv.getBoundingClientRect();return[Math.round((e.clientX-r.left)*W/r.width),Math.round((e.clientY-r.top)*H/r.height)];};
 cv.onpointerdown=e=>{if(!P.on)return;cv.setPointerCapture(e.pointerId);cur={c,w,p:pt(e)};P.st.push(cur);paint(cv,P.st);onch(1);};
 cv.onpointermove=e=>{if(!cur)return;cur.p.push(...pt(e));paint(cv,P.st);onch(0);};
 cv.onpointerup=cv.onpointercancel=()=>{if(cur){cur=null;onch(1);}};
 el.onclick=e=>{const d=e.target.dataset;
  if(d.c!=null)c=+d.c;else if(d.e)c=-1;else if(d.w)w=+d.w;else if(d.u){P.st.pop();paint(cv,P.st);onch(1);}
  el.querySelectorAll('i').forEach(i=>i.classList.toggle('s',+i.dataset.c==c));};
 paint(cv,P.st);return P;}
const mount=cb=>{PAD=mkPad(cb||(()=>{}));$('#pad').appendChild(PAD.el);};
const sb=()=>`<div class="sb">${G.players.map((n,i)=>`<span>${esc(n)} <b>${G.sc[i]}</b>点</span>`).join('')}</div>`;
const wait=m=>app.innerHTML=`<h2>${m} <span id="cnt"></span></h2><div class="ic">⏳</div>`;

// ---------- 画面 ----------
function render(){const k=[G.phase,G.game,G.T,G.sub,G.step,G.r,G.ri,(G.players||[]).length].join();
 if(k!==lastKey){lastKey=k;SUBFN=null;PAD=null;done=false;build();}upd();}
setInterval(()=>{if(G.phase!=='home')upd();},250);
function upd(){if(!G.deadline)return;
 const ms=(G.sub==='draw'&&G.game==1&&G.buz>=0)?G.left:G.deadline-(Date.now()-off),left=Math.max(0,Math.ceil(ms/1000));
 const tm=$('#tm');if(tm)tm.textContent='⏱'+left+'秒';
 const c=$('#cnt');if(c)c.textContent=(G.cnt||0)+'/4';
 if(SUBFN&&!done&&left<=0&&G.phase==='play')SUBFN();
 if(G.phase==='play'&&G.game==1&&G.sub==='draw')st2();}
function build(){const g=G.game;
 if(G.phase==='home')return home();
 if(G.phase==='lobby')return bl();
 if(G.phase==='end')return be();
 if(g==0)return G.sub==='topic'?b0t():G.sub==='step'?b0():b0r();
 if(g==1)return b1();
 return b2();}
function home(){app.innerHTML=`<h1>🎨 みんなでお絵描き</h1><div class="ic">🖍️🦍🎨</div><input id="nm" placeholder="なまえ" maxlength="8"><br><input id="lb" placeholder="ロビーID(半角英数字)"><br><input id="pw" placeholder="パスワード"><br><button onclick="mk()">ロビーを作る(ホスト)</button><button onclick="jn()">参加する</button>`;}
function cfg(i,T){act({t:'cfg',game:i,T:T||G.T});}
function bl(){const P=G.players;
 app.innerHTML=`<h2>ロビー：${esc(G.lb)}</h2><div class="pl">`+[0,1,2,3].map(i=>`<span class="${P[i]?'on':''}">${P[i]?'🙂 '+esc(P[i]):'⌛ 待機中'}</span>`).join('')+`</div><p>${isHost?'遊ぶゲームを選んでね':'ホストがゲームを選んでいます'}</p>`
 +GAMES.map((g,i)=>`<div class="gc ${G.game==i?'sel':''}" ${isHost?`onclick="cfg(${i})"`:''}><div class="ic">${g.i}</div><div><b>${g.n}</b><br><small>${g.d}</small></div></div>`).join('')
 +(G.game!=1?`<p>お絵描きの制限時間：<select ${isHost?'':'disabled'} onchange="cfg(G.game,+this.value)">${[10,60,180,300].map(t=>`<option value="${t}" ${G.T==t?'selected':''}>${t}秒</option>`).join('')}</select></p>`:'')
 +(isHost?`<button ${P.length<4?'disabled':''} onclick="act({t:'start'})">${P.length<4?'4人そろうまで待ってね ('+P.length+'/4)':'ゲーム開始！'}</button>`:'<p>ホストの開始を待っています…</p>');}
function be(){app.innerHTML=`<h1>🎉 おつかれさま！</h1>`+(G.game==0?'':`<h2>結果</h2>`+G.players.map((n,i)=>[n,G.sc[i]]).sort((a,b)=>b[1]-a[1]).map((x,i)=>`<p class="big">${['🥇','🥈','🥉','　'][i]} ${esc(x[0])}　${x[1]}点</p>`).join(''))+(isHost?`<button onclick="act({t:'back'})">ロビーに戻る</button>`:'<p>ホストがロビーに戻すのを待っています…</p>');}

// ① 伝言ゲーム
function b0t(){app.innerHTML=`<h2>お題を決めよう <span id="tm"></span></h2><div class="ic">💭</div><p>みんなに描いてもらうお題を考えてね<br>(空欄ならランダム)</p><input id="tp" maxlength="15" placeholder="例：ゴリラ"><button onclick="subT0()">決定</button>`;SUBFN=subT0;}
function subT0(){if(done)return;done=true;act({t:'topic',text:$('#tp').value});wait('お題を送信しました。ほかの人を待っています…');}
function b0(){const s=G.step,c=(me-s-1+4)%4,pv=s?G.ch[c].it[s-1]:null;
 if(s%2){app.innerHTML=`<h2>ステップ${s+1}/4　<span id="tm"></span></h2><p>この絵は何？ひとことで答えてね</p><canvas id="pv" class="cv" width="${W}" height="${H}"></canvas><br><input id="gs" maxlength="15" placeholder="答え"><button onclick="sub0()">答える</button>`;paint($('#pv'),pv.d);}
 else{const q=s?pv.t:G.ch[c].w;app.innerHTML=`<h2>ステップ${s+1}/4　<span id="tm"></span></h2><p>${s?'前の人の答え':'お題'}：<b class="big">${esc(q)}</b></p><div id="pad"></div><button onclick="sub0()">できた！</button>`;mount();}
 SUBFN=sub0;}
function sub0(){if(done)return;done=true;const g=$('#gs');act({t:'sub',data:PAD&&PAD.st,text:g?g.value:''});wait('🙌 ほかの人を待っています…');}
function b0r(){const ci=Math.floor(G.ri/5),ii=G.ri%5,ch=G.ch[ci],E=[{w:ch.w,by:ci}].concat(ch.it).slice(0,ii+1);
 app.innerHTML=`<h2>${esc(G.players[ci])}さんのお題の伝言（${ci+1}/4）</h2>`+E.map((e,j)=>`<div class="ent"><small>${esc(G.players[e.by])}さん${j==0?'が決めたお題':e.t!=null?'の予想':'の絵'}</small><br>`+(e.w!=null?`<b class="big">${esc(e.w)}</b>`:e.t!=null?`<b class="big">${esc(e.t)}</b>`:`<canvas class="cv" data-j="${j}" width="${W}" height="${H}"></canvas>`)+'</div>').join('')
 +(isHost?`<button onclick="act({t:'next'})">${G.ri>=19?'おわり':'次へ ▶'}</button>`:'<p>ホストが進めています…</p>');
 app.querySelectorAll('canvas').forEach(c=>paint(c,E[c.dataset.j].d));}

// ② 何を描いたでしょう？
function b1(){const dp=G.order[G.r],P=G.players;
 if(G.sub==='res'){app.innerHTML=`<h2>${esc(G.msg)}</h2><canvas id="lv" class="cv" width="${W}" height="${H}"></canvas>${sb()}`;paint($('#lv'),LIVE);return;}
 LIVE=[];
 app.innerHTML=`<h2>第${G.r+1}/8回　<span id="tm"></span></h2>${sb()}<p>描き手：<b>${esc(P[dp])}</b></p>`+(me==dp?`<p>お題：<b class="big">${esc(G.word)}</b></p><div id="pad"></div>`:`<canvas id="lv" class="cv" width="${W}" height="${H}"></canvas>`)+'<div id="st"></div>';
 if(me==dp){let lt=0;mount(f=>{const n=Date.now();LIVE=PAD.st;if(f||n-lt>80){lt=n;act({t:'live',s:PAD.st});}});}else paint($('#lv'),LIVE);}
function st2(){const el=$('#st');if(!el)return;const dp=G.order[G.r],b=G.buz,P=G.players;let h;
 if(PAD)PAD.on=(me==dp&&b<0);
 if(me==dp)h=b<0?'👀 みんなが当てるのを待っています':`<b>${esc(P[b])}</b>さんの回答：<b class="big">「${esc(G.ans||'…')}」</b><br><button onclick="act({t:'judge',ok:1})">⭕ 正解</button><button onclick="act({t:'judge',ok:0})">❌ ちがう</button>`;
 else if(b<0)h='<button class="big" onclick="act({t:\'buzz\'})">⚡ 早押し！</button>';
 else if(b==me)h=G.ans?'回答を送信しました。判定を待っています':'<input id="an" placeholder="答え" maxlength="15"><button onclick="sendAns()">回答</button>';
 else h=`<b>${esc(P[b])}</b>さんが回答中…`;
 if(el.dataset.h!==h){el.dataset.h=h;el.innerHTML=h;}}
function sendAns(){act({t:'ans',text:$('#an').value||'（声で回答）'});}

// ③ お絵描きバトル
function b2(){const P=G.players,ch=G.order[G.r],s=G.sub;
 if(s==='topic'){
  if(me==ch){app.innerHTML=`<h2>第${G.r+1}/8回　<span id="tm"></span></h2><p>みんなで描くお題を決めてね(空欄ならランダム)</p><input id="tp" maxlength="15" placeholder="例：ゴリラ"><button onclick="subT()">決定</button>`;SUBFN=subT;}
  else app.innerHTML=`<h2>第${G.r+1}/8回</h2><p><b>${esc(P[ch])}</b>さんがお題を考えています… <span id="tm"></span></p><div class="ic">🤔</div>`;}
 else if(s==='draw'){app.innerHTML=`<h2>お題：<b class="big">${esc(G.topic)}</b> <span id="tm"></span></h2><p>ほかの人の絵は見えません</p><div id="pad"></div><button onclick="sub2()">できた！</button>`;mount();SUBFN=sub2;}
 else{const vote=s==='vote',mx=vote?0:Math.max(...G.vc);
  app.innerHTML=`<h2>${vote?'一番上手い絵に投票！(自分以外)':'結果！お題：'+esc(G.topic)} <span id="tm"></span></h2><div class="grid">`
  +P.map((n,i)=>`<div class="ent ${!vote&&G.vc[i]==mx&&mx>0?'win':''}"><canvas class="cv" data-i="${i}" width="${W}" height="${H}"></canvas><br><b>${esc(n)}${vote?'':'　'+G.vc[i]+'票'}</b>${vote&&i!=me?`<br><button onclick="vt(${i})">投票</button>`:''}</div>`).join('')+'</div>'+(vote?'':sb());
  app.querySelectorAll('canvas').forEach(c=>paint(c,G.dr[c.dataset.i]));}}
function subT(){if(done)return;done=true;act({t:'topic',text:$('#tp').value});wait('お題を送信しました');}
function sub2(){if(done)return;done=true;act({t:'dr',data:PAD.st});wait('🙌 ほかの人を待っています…');}
function vt(i){if(done)return;done=true;act({t:'vote',v:i});wait('投票しました！ほかの人を待っています…');}
render();
