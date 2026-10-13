'use strict';
// Educational ECC experiment over the finite field F_17. Never use for real keys.
const P = 17, A = 0, B = 7, G = {x:1,y:5}, ORDER = 9;
const $ = id => document.getElementById(id);
const mod = n => ((n % P) + P) % P;
function inverse(n){n=mod(n);for(let i=1;i<P;i++)if(mod(n*i)===1)return i;throw Error('No modular inverse');}
function onCurve(T){return T===null || mod(T.y*T.y)===mod(T.x*T.x*T.x+A*T.x+B);}
function add(U,V){if(U===null)return V;if(V===null)return U;if(U.x===V.x && mod(U.y+V.y)===0)return null;
let slope;if(U.x===V.x && U.y===V.y)slope=mod((3*U.x*U.x+A)*inverse(2*U.y));else slope=mod((V.y-U.y)*inverse(V.x-U.x));
const x=mod(slope*slope-U.x-V.x),y=mod(slope*(U.x-x)-U.y);return {x,y};}
function multiply(k,base=G){let result=null;for(let i=0;i<k;i++)result=add(result,base);return result;}
const fmt=t=>t===null?'O (point at infinity)':`(${t.x}, ${t.y})`;
const points=Array.from({length:8},(_,i)=>multiply(i+1));
if(!onCurve(G)||multiply(ORDER)!==null||points.some(t=>!onCurve(t)))throw Error('Curve setup verification failed');
function cell(row,text){const c=document.createElement('td');c.textContent=text;row.appendChild(c);}
function svgEl(name,attrs={},txt){const n=document.createElementNS('http://www.w3.org/2000/svg',name);for(const [k,v] of Object.entries(attrs))n.setAttribute(k,String(v));if(txt!==undefined)n.textContent=txt;return n;}
function drawCurve(Q, path=[]){
const container=$('curvePlot');container.replaceChildren();const svg=svgEl('svg',{viewBox:'0 0 480 420','aria-hidden':'true'});const left=44,top=20,step=21.4;
const xy=t=>({x:left+t.x*step,y:top+(16-t.y)*step});
for(let v=0;v<17;v++){const pos=left+v*step;svg.appendChild(svgEl('line',{x1:pos,y1:top,x2:pos,y2:top+16*step,stroke:'#e7e9ed'}));svg.appendChild(svgEl('line',{x1:left,y1:top+v*step,x2:left+16*step,y2:top+v*step,stroke:'#e7e9ed'}));if(v%2===0){svg.appendChild(svgEl('text',{x:pos,y:top+16*step+23,'text-anchor':'middle','font-size':11,fill:'#68717b'},v));svg.appendChild(svgEl('text',{x:left-14,y:top+(16-v)*step+4,'text-anchor':'middle','font-size':11,fill:'#68717b'},v));}}
const drawPoint=(t,color,r)=>{const {x,y}=xy(t);svg.appendChild(svgEl('circle',{cx:x,cy:y,r,fill:color,stroke:'#fff','stroke-width':2}));};
for(let x=0;x<P;x++)for(let y=0;y<P;y++)if(onCurve({x,y}))drawPoint({x,y},'#c5cbd0',4.2);
for(let i=1;i<path.length;i++){const a=xy(path[i-1]),b=xy(path[i]);svg.appendChild(svgEl('line',{x1:a.x,y1:a.y,x2:b.x,y2:b.y,stroke:'#66788b','stroke-width':2,'stroke-dasharray':'6 5',opacity:0.85}));}
for(const t of path)drawPoint(t,'#94a7b6',5);
drawPoint(G,'#416b8c',7);
if(Q!==null){drawPoint(Q,'#c47c4d',7);const p=xy(Q);svg.appendChild(svgEl('text',{x:p.x+10,y:p.y-11,'font-size':13,'font-weight':700,fill:'#9b5930'},'Q'));}
const g=xy(G);svg.appendChild(svgEl('text',{x:g.x+10,y:g.y-11,'font-size':13,'font-weight':700,fill:'#345e80'},'G'));
container.appendChild(svg);
}
let animationId=null;
function renderKey(k,limit=k){const body=$('stepsBody');body.replaceChildren();let current=null;for(let i=1;i<=limit;i++){current=add(current,G);const row=document.createElement('tr');cell(row,i);cell(row,i===1?'G':`${i-1}G + G`);cell(row,fmt(current));body.appendChild(row);}const Q=multiply(k);$('publicPoint').textContent=`Q = ${fmt(Q)}`;$('publicFormula').textContent=`Q = ${k}G`;$('pointStatus').textContent=onCurve(Q)?'On the curve ✓':'Invalid point';drawCurve(limit===k?Q:current,Array.from({length:limit},(_,i)=>multiply(i+1)));}
function readKey(){const input=$('privateKey'),v=Number(input.value);if(!Number.isSafeInteger(v)||v<1||v>8||input.value.trim()===''){$('keyError').textContent='Please enter an integer between 1 and 8.';return null;}$('keyError').textContent='';return v;}
function stopAnimation(){if(animationId!==null){clearInterval(animationId);animationId=null;}$('animateBtn').textContent='▶ Play steps';$('animateBtn').disabled=false;}
$('calculateBtn').addEventListener('click',()=>{stopAnimation();const k=readKey();if(k!==null)renderKey(k);});
$('animateBtn').addEventListener('click',()=>{stopAnimation();const k=readKey();if(k===null)return;let i=0;$('animateBtn').disabled=true;$('animateBtn').textContent='Playing…';renderKey(k,0);animationId=setInterval(()=>{i++;renderKey(k,i);if(i>=k)stopAnimation();},650);});
renderKey(6);
const binary5=n=>n.toString(2).padStart(5,'0');
points.forEach((t,i)=>{const row=document.createElement('tr');cell(row,i+1);cell(row,fmt(t));cell(row,binary5(t.x));cell(row,binary5(t.y));$('allKeysBody').appendChild(row);});
function chart(target,values,total){
const parent=$(target);parent.replaceChildren();parent.className='column-chart';
for(const [label,count] of values){const item=document.createElement('div');item.className='column-item';const pct=100*count/total;
const val=document.createElement('span');val.className='column-value';val.textContent=pct.toFixed(1)+'%';
const track=document.createElement('div');track.className='column-track';const bar=document.createElement('div');bar.className='column-fill';bar.style.height=pct+'%';track.appendChild(bar);
const name=document.createElement('span');name.className='column-label';name.textContent=label;
item.append(val,track,name);parent.appendChild(item);}}
function bitTable(target,counts,total){const parent=$(target);parent.replaceChildren();const table=document.createElement('table');const head=document.createElement('thead');head.innerHTML='<tr><th>Bit</th><th>1 (%)</th><th>0 (%)</th></tr>';const body=document.createElement('tbody');
counts.forEach((count,i)=>{const row=document.createElement('tr');cell(row,'b'+i);cell(row,(100*count/total).toFixed(1)+'%');cell(row,(100*(total-count)/total).toFixed(1)+'%');body.appendChild(row);});table.append(head,body);parent.appendChild(table);}
const pearson=(xx,yy)=>{const n=xx.length,mx=xx.reduce((a,b)=>a+b,0)/n,my=yy.reduce((a,b)=>a+b,0)/n;let numerator=0,sx=0,sy=0;for(let i=0;i<n;i++){const a=xx[i]-mx,b=yy[i]-my;numerator+=a*b;sx+=a*a;sy+=b*b;}return numerator/Math.sqrt(sx*sy);};
const bits=n=>n.toString(2).padStart(4,'0');
const hamming=(u,v)=>{let n=u^v,c=0;while(n){c+=n&1;n>>=1;}return c;};
const pairs=[];for(let i=1;i<=8;i++)for(let j=i+1;j<=8;j++)if(hamming(i,j)===1){const p1=points[i-1],p2=points[j-1];pairs.push(hamming(p1.x,p2.x)+hamming(p1.y,p2.y));}
const mean=pairs.reduce((a,b)=>a+b,0)/pairs.length;
$('avalancheResults').innerHTML=`<div class="metric">Valid one-bit input pairs: <strong>${pairs.length}</strong></div><div class="metric">Changed output bits (out of 10): <strong>${Math.min(...pairs)}–${Math.max(...pairs)}</strong></div><div class="metric">Average changed bits: <strong>${mean.toFixed(2)} / 10</strong></div>`;
const xs=points.map(q=>q.x),ys=points.map(q=>q.y),ks=Array.from({length:8},(_,i)=>i+1);
$('uniformityResults').innerHTML=`<div class="metric">Distinct reachable public points: <strong>8 of 8</strong></div><div class="metric">Pearson correlation (k, x): <strong>${pearson(ks,xs).toFixed(3)}</strong></div><div class="metric">Pearson correlation (k, y): <strong>${pearson(ks,ys).toFixed(3)}</strong></div>`;
function sample(){const n=Number($('trialCount').value),countX=new Map(),countY=new Map(),bitX=Array(5).fill(0),bitY=Array(5).fill(0),seen=new Set();for(let i=0;i<n;i++){const k=1+Math.floor(Math.random()*8),q=points[k-1];seen.add(k);countX.set(q.x,(countX.get(q.x)||0)+1);countY.set(q.y,(countY.get(q.y)||0)+1);for(let b=0;b<5;b++){bitX[b]+=(q.x>>b)&1;bitY[b]+=(q.y>>b)&1;}}
chart('xBars',[1,2,5,12].map(v=>[v,countX.get(v)||0]).map(([v,c])=>[`x=${v}`,c]),n);chart('yBars',[1,5,7,8,9,10,12,16].map(v=>[v,countY.get(v)||0]).map(([v,c])=>[`y=${v}`,c]),n);bitTable('xBits',bitX,n);bitTable('yBits',bitY,n);$('sampleSummary').textContent=`${n.toLocaleString('en-US')} random trials completed. ${seen.size} of 8 reachable public points appeared. Percentages fluctuate because this is a random sample.`;}
$('sampleBtn').addEventListener('click',sample);sample();
