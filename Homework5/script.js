'use strict';
const $=id=>document.getElementById(id);
const NS='http://www.w3.org/2000/svg';
const palette=['#2563eb','#f43f5e','#10b981','#a855f7'];
const THEORY_MEAN=5, THEORY_VAR=10;
const sizes=[5,10,20,50,100,300,1000];
function sampleScore(){return Math.floor(Math.random()*11);}
function welfordStep(state,x){
  state.count++;
  const delta=x-state.mean;
  state.mean+=delta/state.count;
  state.M2+=delta*(x-state.mean);
}
function oneHacker(n,keepPath=false,keepScores=false){
  const s={count:0,mean:0,M2:0};const path=[],firstScores=[];
  for(let i=0;i<n;i++){
    const score=sampleScore();
    welfordStep(s,score);
    if(keepPath)path.push(s.mean);
    if(keepScores&&firstScores.length<12)firstScores.push(score);
  }
  return {mean:s.mean,variance:s.M2/(n-1),path,firstScores};
}
function simulate(n,m,withPaths=false){
  const means=[],variances=[],paths=[],individuals=[];
  for(let j=0;j<m;j++){
    const h=oneHacker(n,withPaths&&j<4,withPaths&&j<12);
    means.push(h.mean);variances.push(h.variance);
    if(withPaths&&j<4)paths.push(h.path);
    if(withPaths&&j<12)individuals.push({index:j+1,mean:h.mean,variance:h.variance,firstScores:h.firstScores});
  }
  return {means,variances,paths,individuals};
}
function avg(a){return a.reduce((s,x)=>s+x,0)/a.length;}
function sampleVar(a){if(a.length<2)return 0;const mean=avg(a);return a.reduce((s,x)=>s+(x-mean)**2,0)/(a.length-1);}
function fmt(x){return Number.isFinite(x)?x.toFixed(3):'—';}
function el(tag,attrs={},txt){const node=document.createElementNS(NS,tag);for(const [k,v] of Object.entries(attrs))node.setAttribute(k,v);if(txt!==undefined)node.textContent=txt;return node;}
function clear(node){node.replaceChildren();}
function svgBase(width=720,height=290){return el('svg',{viewBox:`0 0 ${width} ${height}`,role:'img',preserveAspectRatio:'xMidYMid meet'});}
function svgText(svg,x,y,text,attrs={}){svg.append(el('text',{x,y,'font-size':12,fill:'#536371',...attrs},text));}
function drawLineChart(id,series,opts={}){
 const container=$(id);clear(container);
 const W=720,H=300,L=60,R=22,T=25,B=49,plotW=W-L-R,plotH=H-T-B;
 const all=series.flatMap(s=>s.values.map(p=>p.y)).filter(Number.isFinite);
 if(opts.reference!==undefined)all.push(opts.reference);
 if(!all.length){container.textContent='No values available.';return;}
 let lo=Math.min(...all),hi=Math.max(...all);
 if(opts.yMin!==undefined)lo=Math.min(lo,opts.yMin);
 if(opts.yMax!==undefined)hi=Math.max(hi,opts.yMax);
 let pad=(hi-lo)*.15||.5;lo-=pad;hi+=pad;
 const allX=series.flatMap(s=>s.values.map(p=>p.x));
 let minX=Math.min(...allX),maxX=Math.max(...allX);if(minX===maxX)maxX++;
 const X=x=>L+(x-minX)/(maxX-minX)*plotW,Y=y=>T+(hi-y)/(hi-lo)*plotH;
 const svg=svgBase(W,H);
 for(let i=0;i<=4;i++){
   const y=T+i*plotH/4;
   svg.append(el('line',{x1:L,x2:W-R,y1:y,y2:y,stroke:'#e5e9ed'}));
   svgText(svg,L-9,y+4,(hi-i*(hi-lo)/4).toFixed(2),{'text-anchor':'end','font-size':11});
 }
 for(let i=0;i<=4;i++){
   const v=minX+(maxX-minX)*i/4,x=X(v);
   svgText(svg,x,H-23,Math.round(v).toString(),{'text-anchor':'middle','font-size':11});
 }
 svg.append(el('line',{x1:L,x2:L,y1:T,y2:H-B,stroke:'#8796a3'}));
 svg.append(el('line',{x1:L,x2:W-R,y1:H-B,y2:H-B,stroke:'#8796a3'}));
 if(opts.reference!==undefined){const y=Y(opts.reference);svg.append(el('line',{x1:L,x2:W-R,y1:y,y2:y,stroke:'#ea580c','stroke-width':2,'stroke-dasharray':'7 6'}));svgText(svg,W-R-4,y-7,opts.referenceLabel||'Theory',{'text-anchor':'end',fill:'#c2410c'});}
 series.forEach((s,idx)=>{
   const color=s.color||palette[idx%palette.length];
   const pts=s.values.map(p=>[X(p.x),Y(p.y)]);
   if(!pts.length)return;
   // Quadratic mid-point smoothing is visual only; discrete observations are unchanged.
   let d=`M ${pts[0][0]} ${pts[0][1]}`;
   for(let i=1;i<pts.length;i++){
     const [px,py]=pts[i-1],[cx,cy]=pts[i];
     const mx=(px+cx)/2;
     d+=` C ${mx} ${py} ${mx} ${cy} ${cx} ${cy}`;
   }
   svg.append(el('path',{d,fill:'none',stroke:color,'stroke-width':2.7,'stroke-linecap':'round','stroke-linejoin':'round',opacity:.92}));
 });
 svgText(svg,(L+W-R)/2,H-4,opts.xLabel||'Systems (n)',{'text-anchor':'middle'});
 container.append(svg);
 const legend=document.createElement('div');legend.className='chart-legend';legend.style.display='flex';legend.style.flexWrap='wrap';
 series.forEach((s,i)=>{const item=document.createElement('span');const dot=document.createElement('i');dot.className='legend-line';dot.style.background=s.color||palette[i%palette.length];item.append(dot,document.createTextNode(s.label||`Series ${i+1}`));legend.append(item);});
 container.append(legend);
}
function histogram(id,data,reference,color){
 const container=$(id);clear(container);if(!data.length)return;
 const W=520,H=260,L=44,R=15,T=20,B=42,innerW=W-L-R,innerH=H-T-B;
 let lo=Math.min(...data,reference),hi=Math.max(...data,reference);
 let pad=(hi-lo)*.08||.2;lo-=pad;hi+=pad;
 const bins=16,counts=Array(bins).fill(0);
 data.forEach(v=>{let k=Math.floor((v-lo)/(hi-lo)*bins);k=Math.max(0,Math.min(bins-1,k));counts[k]++;});
 const ymax=Math.max(...counts,1),svg=svgBase(W,H),barW=innerW/bins;
 for(let i=0;i<=4;i++){const y=T+i*innerH/4;svg.append(el('line',{x1:L,x2:W-R,y1:y,y2:y,stroke:'#e5e9ed'}));svgText(svg,L-6,y+4,String(Math.round(ymax*(1-i/4))),{'text-anchor':'end','font-size':11});}
 counts.forEach((v,i)=>{const h=v/ymax*innerH;svg.append(el('rect',{x:L+i*barW+1,y:T+innerH-h,width:Math.max(1,barW-2),height:h,fill:color,opacity:.78,rx:2}));});
 const refX=L+(reference-lo)/(hi-lo)*innerW;
 svg.append(el('line',{x1:refX,x2:refX,y1:T,y2:T+innerH,stroke:'#ea580c','stroke-width':2,'stroke-dasharray':'5 4'}));
 svgText(svg,refX+5,T+13,'Theory',{fill:'#c2410c','font-size':11});
 for(let i=0;i<=4;i++)svgText(svg,L+i*innerW/4,H-14,(lo+(hi-lo)*i/4).toFixed(2),{'text-anchor':'middle','font-size':11});
 container.append(svg);
}
function validate(){const n=Number($('n').value),m=Number($('m').value);if(!Number.isInteger(n)||n<2||n>3000||!Number.isInteger(m)||m<10||m>2000){$('validation').textContent='Use whole numbers: 2 ≤ n ≤ 3000 and 10 ≤ m ≤ 2000.';return null;}$('validation').textContent='';return {n,m};}
function row(cells){const tr=document.createElement('tr');cells.forEach(value=>{const td=document.createElement('td');td.textContent=String(value);tr.append(td);});return tr;}
function run(){const params=validate();if(!params)return;const {n,m}=params,res=simulate(n,m,true);const mean=avg(res.means),variance=avg(res.variances);
 $('mean-of-means').textContent=fmt(mean);$('mean-of-vars').textContent=fmt(variance);
 $('individual-table').replaceChildren(...res.individuals.map(h=>row([`Hacker ${h.index}`,h.firstScores.join(', ')+(n>12?' …':''),fmt(h.mean),fmt(h.variance)])));
 $('estimate-note').textContent=`The average sample mean is ${fmt(mean-THEORY_MEAN)} away from μ = 5; the average unbiased sample variance is ${fmt(variance-THEORY_VAR)} away from σ² = 10. With more independent hackers, these averages generally get closer to theory.`;
 $('comparison-table').replaceChildren(row(['Sample mean',fmt(mean),fmt(THEORY_MEAN),fmt(mean-THEORY_MEAN)]),row(['Unbiased sample variance',fmt(variance),fmt(THEORY_VAR),fmt(variance-THEORY_VAR)]));
 const pathSeries=res.paths.map((path,i)=>({label:`Hacker ${i+1}`,color:palette[i],values:path.map((y,j)=>({x:j+1,y}))}));
 drawLineChart('trajectory',pathSeries,{reference:THEORY_MEAN,referenceLabel:'μ = 5',xLabel:'System index'});
 histogram('hist-mean',res.means,THEORY_MEAN,'#2563eb');histogram('hist-var',res.variances,THEORY_VAR,'#10b981');
 $('mean-caption').textContent=`Across ${m} hackers: mean = ${fmt(mean)}, variance of sample means = ${fmt(sampleVar(res.means))}.`;
 $('var-caption').textContent=`Across ${m} hackers: mean = ${fmt(variance)}, variance of sample variances = ${fmt(sampleVar(res.variances))}.`;
}
function compare(){const params=validate();if(!params)return;const {m}=params,rows=[],meanSpreads=[],varSpreads=[],theory=[];
 for(const n of sizes){const res=simulate(n,m),sdMeans=Math.sqrt(sampleVar(res.means)),sdVars=Math.sqrt(sampleVar(res.variances));
 rows.push(row([n,fmt(avg(res.means)),fmt(avg(res.variances)),fmt(sdMeans),fmt(Math.sqrt(THEORY_VAR/n)),fmt(sdVars)]));
 meanSpreads.push({x:n,y:sdMeans});varSpreads.push({x:n,y:sdVars});theory.push({x:n,y:Math.sqrt(THEORY_VAR/n)});}
 $('size-table').replaceChildren(...rows);
 drawLineChart('mean-spread-chart',[{label:'Observed SD of means',color:'#2563eb',values:meanSpreads},{label:'Theory √(10/n)',color:'#f43f5e',values:theory}],{xLabel:'Systems per hacker (n)',yMin:0});
 drawLineChart('var-spread-chart',[{label:'Observed SD of sample variances',color:'#10b981',values:varSpreads}],{xLabel:'Systems per hacker (n)',yMin:0});
}
$('run').addEventListener('click',run);$('compare').addEventListener('click',compare);
run();compare();

// Interactive recurrence demonstration (the same Welford update used by every hacker).
const demoState={count:0,mean:0,M2:0};
function showStep(last='—'){
 const variance=demoState.count>1?fmt(demoState.M2/(demoState.count-1)):'—';
 const current=row([demoState.count,last,demoState.count?fmt(demoState.mean):'—',fmt(demoState.M2),variance]);
 if(demoState.count===0)$('step-table').replaceChildren(current);else $('step-table').append(current);
}
$('add-score').addEventListener('click',()=>{
 const x=Number($('step-score').value);
 if($('step-score').value.trim()==='' || !Number.isInteger(x)||x<0||x>10){$('step-message').textContent='Enter a whole number from 0 to 10.';return;}
 $('step-message').textContent='';if(demoState.count===0)$('step-table').replaceChildren();welfordStep(demoState,x);showStep(x);
});
$('reset-steps').addEventListener('click',()=>{Object.assign(demoState,{count:0,mean:0,M2:0});$('step-message').textContent='';showStep();});
showStep();
