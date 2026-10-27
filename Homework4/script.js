'use strict';
const $=id=>document.getElementById(id);
const mean=a=>a.reduce((s,v)=>s+v,0)/a.length;
const variance=a=>{const u=mean(a);return a.reduce((s,v)=>s+(v-u)**2,0)/a.length;};
const fmt=(v,d=3)=>Number(v).toFixed(d);
const NS='http://www.w3.org/2000/svg';
function el(tag,attrs={},text){const x=document.createElementNS(NS,tag);for(const [k,v] of Object.entries(attrs))x.setAttribute(k,v);if(text!==undefined)x.textContent=text;return x;}
function chartBase(target,w=740,h=300){const svg=el('svg',{viewBox:`0 0 ${w} ${h}`,role:'img'});$(target).replaceChildren(svg);return svg;}
function line(svg,x1,y1,x2,y2,color='#d9e0e6',dash=''){svg.append(el('line',{x1,y1,x2,y2,stroke:color,'stroke-width':1,...(dash?{'stroke-dasharray':dash}:{})}));}
function label(svg,x,y,text,anchor='start'){svg.append(el('text',{x,y,fill:'#667580','font-size':11,'text-anchor':anchor},text));}
function path(svg,points,color,width=1.6,opacity=1,dash=''){svg.append(el('polyline',{points:points.map(p=>p.join(',')).join(' '),fill:'none',stroke:color,'stroke-width':width,opacity,...(dash?{'stroke-dasharray':dash}:{})}));}
function params(){const model=$('model').value,n=Number($('n').value),m=Number($('m').value),p=Number($('p').value);if(!Number.isInteger(n)||n<10||n>2000||!Number.isInteger(m)||m<10||m>1500||!Number.isFinite(p)||p<0||p>1)throw Error('Use n = 10–2000, m = 10–1500 and p = 0–1.');return {model,n,m,p,mu:model==='bernoulli'?p:0,v:model==='bernoulli'?p*(1-p):1};}
function simulate({model,n,m,p},store=20){const totals=new Float64Array(m),paths=[];for(let a=0;a<m;a++){let sum=0;const pts=a<store?[[0,0]]:null;for(let i=1;i<=n;i++){sum+=(model==='bernoulli'?(Math.random()<p?1:0):(Math.random()<.5?1:-1));if(pts&&(i===n||i%Math.max(1,Math.floor(n/200))===0))pts.push([i,sum]);}totals[a]=sum;if(pts)paths.push(pts);}return {totals:Array.from(totals),paths};}
function smoothPath(svg,points,color,width=2.8,dash=''){
 if(points.length<2)return;
 let d=`M ${points[0][0]} ${points[0][1]}`;
 for(let i=1;i<points.length;i++){
  const p0=points[Math.max(0,i-2)],p1=points[i-1],p2=points[i],p3=points[Math.min(points.length-1,i+1)];
  const tension=.22;
  const c1x=p1[0]+(p2[0]-p0[0])*tension,c1y=p1[1]+(p2[1]-p0[1])*tension;
  const c2x=p2[0]-(p3[0]-p1[0])*tension,c2y=p2[1]-(p3[1]-p1[1])*tension;
  d+=` C ${c1x} ${c1y}, ${c2x} ${c2y}, ${p2[0]} ${p2[1]}`;
 }
 svg.append(el('path',{d,fill:'none',stroke:color,'stroke-width':width,'stroke-linejoin':'round','stroke-linecap':'round',...(dash?{'stroke-dasharray':dash}:{})}));
}
function trajectories(paths,n,mu){
 const svg=chartBase('trajectory',900,600);
 const palette=['#2563eb','#e11d48','#059669','#9333ea'];
 paths.slice(0,4).forEach((pts,i)=>{
  const col=i%2,row=Math.floor(i/2),ox=col*450,oy=row*300;
  const L=ox+56,R=ox+426,T=oy+42,B=oy+247;
  const vals=pts.map(p=>p[1]);vals.push(0,n*mu);
  let lo=Math.min(...vals),hi=Math.max(...vals);
  if(lo===hi){lo-=1;hi+=1;}
  const pad=Math.max(1,(hi-lo)*.13);lo-=pad;hi+=pad;
  const xx=x=>L+(R-L)*x/n, yy=y=>B-(B-T)*(y-lo)/(hi-lo);
  svg.append(el('rect',{x:ox+8,y:oy+8,width:434,height:280,rx:12,fill:'#fff',stroke:'#e0e6ed'}));
  label(svg,ox+22,oy+29,`Attacker ${i+1} · final score ${pts[pts.length-1][1]}`);
  for(let t=0;t<=4;t++){
   const v=lo+(hi-lo)*t/4,y=yy(v);line(svg,L,y,R,y,'#e8edf2');label(svg,L-9,y+4,fmt(v,0),'end');
   const x=xx(n*t/4);line(svg,x,T,x,B,'#f0f3f6');label(svg,x,B+18,String(Math.round(n*t/4)),'middle');
  }
  path(svg,[[xx(0),yy(0)],[xx(n),yy(n*mu)]],'#ea580c',2,1,'7 5');
  smoothPath(svg,pts.map(([step,score])=>[xx(step),yy(score)]),palette[i],2.9);
  const end=pts[pts.length-1];svg.append(el('circle',{cx:xx(end[0]),cy:yy(end[1]),r:4.4,fill:palette[i],stroke:'#fff','stroke-width':1.5}));
  label(svg,(L+R)/2,oy+282,'Systems encountered','middle');
 });
}
function histogram(target,values,reference){const svg=chartBase(target,310,210),L=36,R=12,T=14,B=33,W=310,H=210;let lo=Math.min(...values,reference),hi=Math.max(...values,reference);if(lo===hi){lo-=1;hi+=1;}const padding=(hi-lo)*.07;lo-=padding;hi+=padding;const bins=16,counts=Array(bins).fill(0);for(const x of values){let k=Math.floor((x-lo)/(hi-lo)*bins);counts[Math.max(0,Math.min(bins-1,k))]++;}const max=Math.max(1,...counts);for(let i=0;i<bins;i++){const x=L+i*(W-L-R)/bins+1,width=(W-L-R)/bins-2,height=counts[i]/max*(H-T-B);svg.append(el('rect',{x,y:H-B-height,width,height,fill:'#3b82f6'}));}line(svg,L,H-B,W-R,H-B,'#8795a0');const rx=L+(reference-lo)/(hi-lo)*(W-L-R);line(svg,rx,T,rx,H-B,'#ea580c','5 4');label(svg,L,H-12,fmt(lo,1));label(svg,W-R,H-12,fmt(hi,1),'end');label(svg,W-R,T+10,'Dashed: theory','end');}
function normalPdf(x){return Math.exp(-x*x/2)/Math.sqrt(2*Math.PI);}
function normalChart(values){const svg=chartBase('clt-chart'),W=740,H=270,L=52,R=20,T=15,B=38,lo=-4,hi=4,bins=32,counts=Array(bins).fill(0);for(const v of values){const k=Math.floor((v-lo)/(hi-lo)*bins);if(k>=0&&k<bins)counts[k]++;}const density=counts.map(c=>c/(values.length*(hi-lo)/bins)),max=Math.max(.47,...density);const xx=x=>L+(x-lo)/(hi-lo)*(W-L-R),yy=y=>H-B-y/max*(H-T-B);for(let y=0;y<=.4;y+=.1){line(svg,L,yy(y),W-R,yy(y));label(svg,L-8,yy(y)+4,fmt(y,1),'end');}density.forEach((d,i)=>{const x=xx(lo+i*(hi-lo)/bins)+1,w=(W-L-R)/bins-2;svg.append(el('rect',{x,y:yy(d),width:w,height:H-B-yy(d),fill:'#60a5fa'}));});const pts=[];for(let x=lo;x<=hi;x+=.04)pts.push([xx(x),yy(normalPdf(x))]);path(svg,pts,'#ea580c',2.7);line(svg,L,H-B,W-R,H-B,'#8795a0');for(let x=-4;x<=4;x+=2)label(svg,xx(x),H-14,String(x),'middle');label(svg,W-R,T+12,'Orange: N(0,1)','end');}
function trendChart(target,series,reference){
 const svg=chartBase(target,740,260),W=740,H=260,L=65,R=24,T=25,B=42;
 const all=series.flatMap(s=>s.values.map(p=>p[1]));if(reference!==undefined)all.push(reference);
 let lo=Math.min(...all),hi=Math.max(...all);if(hi===lo){lo-=1;hi+=1;}
 const pad=(hi-lo)*.15;lo-=pad;hi+=pad;
 const xs=[20,50,100,300,1000],xx=x=>L+(Math.log(x)-Math.log(20))/(Math.log(1000)-Math.log(20))*(W-L-R),yy=y=>H-B-(y-lo)/(hi-lo)*(H-T-B);
 for(let i=0;i<=4;i++){const y=lo+(hi-lo)*i/4;line(svg,L,yy(y),W-R,yy(y),'#e7edf3');label(svg,L-9,yy(y)+4,fmt(y,2),'end');}
 xs.forEach(x=>{line(svg,xx(x),T,xx(x),H-B,'#f0f3f6');label(svg,xx(x),H-17,String(x),'middle');});
 if(reference!==undefined)line(svg,L,yy(reference),W-R,yy(reference),'#ea580c','7 5');
 series.forEach(s=>{const pts=s.values.map(([x,y])=>[xx(x),yy(y)]);smoothPath(svg,pts,s.color,2.8);pts.forEach(([x,y])=>svg.append(el('circle',{cx:x,cy:y,r:3.5,fill:s.color,stroke:'#fff','stroke-width':1.2})));});
 label(svg,(L+W-R)/2,H-1,'Number of systems (n)','middle');
 series.forEach((s,i)=>label(svg,L+i*185,T-9,`● ${s.label}`));
 if(reference!==undefined)label(svg,W-R,T-9,'Dashed: E[X]','end');
}
function fillRow(target,cells){const tr=document.createElement('tr');cells.forEach(c=>{const td=document.createElement('td');td.textContent=c;tr.append(td);});$(target).append(tr);}
let latest=null;
function run(){try{const p=params();$('validation').textContent='';const result=simulate(p);latest={p,result};$('mu').textContent=fmt(p.mu);$('variance').textContent=fmt(p.v);$('count').textContent=p.m;$('sample-mean').textContent=fmt(mean(result.totals)/p.n);trajectories(result.paths,p.n,p.mu);$('trajectory-caption').textContent=`Showing 4 attacker trajectories out of ${p.m}. Curved lines visually connect the sampled scores (the underlying increments remain discrete). Each panel has its own vertical scale. Dashed line = expected score i × E[X].`;const scales=[['total',result.totals,p.n*p.mu,p.n*p.v],['average',result.totals.map(x=>x/p.n),p.mu,p.v/p.n],['normalized',result.totals.map(x=>x/Math.sqrt(p.n)),Math.sqrt(p.n)*p.mu,p.v]];for(const [name,data,expected,theoryVar] of scales){histogram('hist-'+name,data,expected);$('stat-'+name).textContent=`Empirical mean ${fmt(mean(data))}; variance ${fmt(variance(data))}. Theory: mean ${fmt(expected)}, variance ${fmt(theoryVar)}.`;}compare();}catch(e){$('validation').textContent=e.message;}}
function compare(){try{
 const p=params(),lengths=[20,50,100,300,1000];$('validation').textContent='';
 $('lln-table').replaceChildren();$('clt-table').replaceChildren();let last=[];const means=[];
 for(const n of lengths){
  const data=simulate({...p,n},0).totals,avg=data.map(x=>x/n),norm=data.map(x=>x/Math.sqrt(n));
  const outside=avg.filter(x=>Math.abs(x-p.mu)>.1).length/p.m;
  means.push([n,mean(avg)]);
  fillRow('lln-table',[n,fmt(mean(avg)),fmt(variance(avg),5),fmt(p.v/n,5),fmt(outside,3)]);
  fillRow('clt-table',[n,fmt(mean(norm)),fmt(variance(norm)),fmt(p.v)]);
  if(n===1000)last=norm;
 }
 trendChart('lln-chart',[{label:'Observed mean',color:'#2563eb',values:means}],p.mu);
 const baseline=20;
 trendChart('variance-chart',[
  {label:'Total',color:'#e11d48',values:lengths.map(n=>[n,n/baseline])},
  {label:'Average',color:'#2563eb',values:lengths.map(n=>[n,baseline/n])},
  {label:'Normalized',color:'#059669',values:lengths.map(n=>[n,1])}
 ]);
 if(p.model==='rademacher'){
  normalChart(last);
  $('clt-description').textContent='Rademacher has mean 0 and variance 1, so Sₙ/√n approaches the standard normal distribution.';
  $('clt-caption').textContent='Blue histogram: simulated Sₙ/√n at n = 1000. Orange line: N(0,1).';
 }else if(p.p>0&&p.p<1){
  const standardized=last.map(x=>(x-p.p*Math.sqrt(1000))/Math.sqrt(p.p*(1-p.p)));
  normalChart(standardized);
  $('clt-description').textContent='For Bernoulli, raw Sₙ/√n does not approach N(0,1) when p > 0. The additional chart shows the centered and standardized quantity (Sₙ − np)/√(np(1 − p)).';
  $('clt-caption').textContent='Blue histogram: centered Bernoulli scores at n = 1000, not raw Sₙ/√n. Orange line: N(0,1).';
 }else{
  $('clt-chart').replaceChildren();const msg=document.createElement('p');msg.className='empty-chart-note';msg.textContent='At p = 0 or p = 1, the Bernoulli increments are constant and the variance is zero. Choose 0 < p < 1 to display a standardized normal comparison.';$('clt-chart').append(msg);
  $('clt-description').textContent='For p = 0 or p = 1, a non-degenerate normal approximation is not defined.';
  $('clt-caption').textContent='The score has no randomness at these parameter values.';
 }
 }catch(e){$('validation').textContent=e.message;}}
$('model').addEventListener('change',()=>{$('p-label').style.display=$('model').value==='bernoulli'?'flex':'none';run();});$('run').addEventListener('click',run);$('compare').addEventListener('click',compare);run();
