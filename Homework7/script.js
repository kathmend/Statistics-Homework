'use strict';
const $ = id => document.getElementById(id);
const palette = ['#1689d6','#f47735','#20aa81','#ab60ce','#e4ac27','#df527c','#4f71d2','#8b6f47','#20a5ad','#7dba45','#c75a4a','#6d64ad'];
const esc = s => String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const fmt = (x,d=3) => Number.isFinite(x) ? x.toFixed(d) : '—';
const pct = x => fmt(x*100,1)+'%';
function makeExample(associated){
  const counts = associated ? [[36,4],[12,28]] : [[20,20],[20,20]];
  const xs=['Trained','Not trained'], fs=['Reported','Clicked'];
  const rows=['X,F'];
  counts.forEach((r,i)=>r.forEach((count,j)=>{for(let k=0;k<count;k++) rows.push(`${xs[i]},${fs[j]}`)}));
  return rows.join('\n');
}
function parsePairs(text){
  const lines=text.replace(/^\uFEFF/,'').split(/\r?\n/).map(s=>s.trim()).filter(Boolean);
  if(!lines.length) throw Error('Enter at least one pair of observations.');
  if(lines[0].toLowerCase().replace(/\s/g,'')==='x,f') lines.shift();
  if(!lines.length) throw Error('No observations found below the header.');
  if(lines.length>10000) throw Error('Maximum 10,000 observations.');
  const pairs=lines.map((line,i)=>{
    const parts=line.split(',').map(s=>s.trim());
    if(parts.length!==2||!parts[0]||!parts[1]) throw Error(`Line ${i+1}: expected exactly two nonempty comma-separated categories.`);
    if(parts.some(x=>x.length>60)) throw Error(`Line ${i+1}: category labels must have at most 60 characters.`);
    return parts;
  });
  return pairs;
}
function contingency(pairs){
  const xs=[...new Set(pairs.map(p=>p[0]))],fs=[...new Set(pairs.map(p=>p[1]))];
  if(xs.length<2||fs.length<2) throw Error('Use at least two observed categories for both X and F to run a chi-square test.');
  if(xs.length>12||fs.length>12) throw Error('Maximum 12 categories per variable.');
  const xi=new Map(xs.map((x,i)=>[x,i])),fi=new Map(fs.map((f,i)=>[f,i]));
  const o=xs.map(()=>fs.map(()=>0));
  pairs.forEach(([x,f])=>o[xi.get(x)][fi.get(f)]++);
  const rt=o.map(r=>r.reduce((a,b)=>a+b,0)),ct=fs.map((_,j)=>o.reduce((a,r)=>a+r[j],0));
  const n=pairs.length,e=o.map((r,i)=>r.map((_,j)=>rt[i]*ct[j]/n));
  const contrib=o.map((r,i)=>r.map((v,j)=>(v-e[i][j])**2/e[i][j]));
  const chi2=contrib.flat().reduce((a,b)=>a+b,0),df=(xs.length-1)*(fs.length-1);
  const p=chiSquareSurvival(chi2,df),v=Math.sqrt(chi2/(n*Math.min(xs.length-1,fs.length-1)));
  return {xs,fs,o,rt,ct,n,e,contrib,chi2,df,p,v};
}
// Lanczos log-gamma and regularized upper incomplete gamma Q(a,x).
// Chi-square survival function: P(ChiSquare_df >= value) = Q(df/2,value/2).
function logGamma(z){
  const c=[0.99999999999980993,676.5203681218851,-1259.1392167224028,771.32342877765313,-176.6150291621406,12.507343278686905,-0.13857109526572012,9.984369578019572e-6,1.5056327351493116e-7];
  if(z<0.5) return Math.log(Math.PI)-Math.log(Math.sin(Math.PI*z))-logGamma(1-z);
  z--;let a=c[0];for(let i=1;i<c.length;i++) a+=c[i]/(z+i);
  const t=z+7.5;return 0.5*Math.log(2*Math.PI)+(z+0.5)*Math.log(t)-t+Math.log(a);
}
function gammaQ(a,x){
  if(x===0) return 1;
  const gl=logGamma(a),eps=1e-14,small=1e-300;
  if(x<a+1){
    let sum=1/a,del=sum,ap=a;
    for(let i=1;i<=10000;i++) {ap++;del*=x/ap;sum+=del;if(Math.abs(del)<Math.abs(sum)*eps)break;}
    return Math.max(0,Math.min(1,1-sum*Math.exp(-x+a*Math.log(x)-gl)));
  }
  let b=x+1-a,c=1/small,d=1/(Math.abs(b)<small?small:b),h=d;
  for(let i=1;i<=10000;i++){
    const an=-i*(i-a);b+=2;d=an*d+b;if(Math.abs(d)<small)d=small;
    c=b+an/c;if(Math.abs(c)<small)c=small;d=1/d;
    const delta=d*c;h*=delta;if(Math.abs(delta-1)<eps)break;
  }
  return Math.max(0,Math.min(1,Math.exp(-x+a*Math.log(x)-gl)*h));
}
function chiSquareSurvival(x,df){return gammaQ(df/2,x/2)}
function htmlTable(headers,rows,foot){
  const cell=(v,tag)=>`<${tag}>${v}</${tag}>`;
  return `<table><thead><tr>${headers.map(h=>cell(esc(h),'th')).join('')}</tr></thead><tbody>${rows.map(row=>`<tr>${row.map((v,i)=>cell(i===0?`<strong>${esc(v)}</strong>`:v,'td')).join('')}</tr>`).join('')}</tbody>${foot?`<tfoot><tr>${foot.map((v,i)=>cell(i===0?esc(v):v,'td')).join('')}</tr></tfoot>`:''}</table>`;
}
function renderTables(s){
  const {xs,fs,o,rt,ct,n,e,contrib}=s;
  const names=['X / F',...fs,'Total'];
  $('observed-table').innerHTML=htmlTable(names,xs.map((x,i)=>[x,...o[i],rt[i]]),['Total',...ct,n]);
  $('joint-table').innerHTML=htmlTable(names,xs.map((x,i)=>[x,...o[i].map(v=>pct(v/n)),pct(rt[i]/n)]),['Total',...ct.map(v=>pct(v/n)),'100.0%']);
  $('row-table').innerHTML=htmlTable(['X / F',...fs],xs.map((x,i)=>[x,...o[i].map(v=>pct(v/rt[i]))]));
  $('column-table').innerHTML=htmlTable(['X / F',...fs],xs.map((x,i)=>[x,...o[i].map((v,j)=>pct(v/ct[j]))]));
  $('expected-table').innerHTML=htmlTable(['X / F',...fs],xs.map((x,i)=>[x,...e[i].map(v=>fmt(v,2))]));
  $('contributions-table').innerHTML=htmlTable(['X / F',...fs,'Row sum'],xs.map((x,i)=>[x,...contrib[i].map(v=>fmt(v,3)),fmt(contrib[i].reduce((a,b)=>a+b,0),3)]),['Total',...fs.map((_,j)=>fmt(contrib.reduce((a,r)=>a+r[j],0),3)),fmt(s.chi2,3)]);
  const below5=e.flat().filter(v=>v<5).length,below1=e.flat().filter(v=>v<1).length;
  $('expected-warning').textContent=below5?`Caution: ${below5} of ${e.flat().length} expected counts are below 5${below1?`, including ${below1} below 1`:''}. The asymptotic p-value may be unreliable; consider an exact test or more data.`:'All expected counts are at least 5, supporting the usual large-sample chi-square approximation.';
}
function svgText(x,y,text,opts=''){return `<text x="${x}" y="${y}" ${opts}>${esc(text)}</text>`}
function renderAssociation(s){
  const W=780,H=Math.max(205,s.xs.length*64+52),left=155,right=32,barW=W-left-right;
  let svg=`<svg viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Conditional distribution of F given X">`;
  s.xs.forEach((x,i)=>{
    const y=20+i*64;
    svg+=svgText(left-10,y+24,x.length>19?x.slice(0,18)+'…':x,'font-size="13" fill="#34495b" text-anchor="end"');
    let pos=left;
    s.fs.forEach((f,j)=>{
      const share=s.o[i][j]/s.rt[i],w=barW*share;
      if(w>0)svg+=`<rect x="${pos}" y="${y}" width="${w}" height="36" fill="${palette[j]}" rx="1"><title>${esc(x)} / ${esc(f)}: ${pct(share)}</title></rect>`;
      if(w>45)svg+=svgText(pos+w/2,y+23,pct(share),'font-size="12" fill="white" text-anchor="middle" font-weight="700"');
      pos+=w;
    });
  });
  svg+='</svg>';
  $('association-chart').innerHTML=svg;
  $('association-legend').innerHTML=s.fs.map((f,j)=>`<span><i class="swatch" style="background:${palette[j]}"></i>${esc(f)}</span>`).join('');
}
function renderContributions(s){
  const items=[];
  s.xs.forEach((x,i)=>s.fs.forEach((f,j)=>items.push({label:`${x} / ${f}`,value:s.contrib[i][j],color:palette[j]})));
  const max=Math.max(0.0001,...items.map(t=>t.value)),rowH=34,W=780,H=items.length*rowH+35,left=190,right=75;
  let svg=`<svg viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Cell contributions to chi-square statistic">`;
  items.forEach((item,i)=>{
    const y=12+i*rowH, w=(W-left-right)*item.value/max;
    svg+=svgText(left-10,y+17,item.label.length>26?item.label.slice(0,25)+'…':item.label,'font-size="12" text-anchor="end" fill="#4a6072"');
    svg+=`<rect x="${left}" y="${y}" width="${Math.max(0,w)}" height="22" fill="${item.color}" rx="3"/>`;
    svg+=svgText(left+w+7,y+16,fmt(item.value,2),'font-size="12" fill="#34495b"');
  });
  svg+='</svg>';
  $('contribution-chart').innerHTML=svg;
}
function renderObservedExpected(s){
  const items=[];
  s.xs.forEach((x,i)=>s.fs.forEach((f,k)=>items.push({label:`${x} / ${f}`,o:s.o[i][k],e:s.e[i][k]})));
  const W=780,L=190,R=85,rowH=48,H=items.length*rowH+45,max=Math.max(1,...items.flatMap(t=>[t.o,t.e])),span=W-L-R;
  let svg=`<svg viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Observed blue bars and expected orange bars">`;
  svg+=`<rect x="${L}" y="5" width="12" height="11" fill="#1689d6"/>${svgText(L+18,15,'Observed','font-size="12" fill="#34495b"')}<rect x="${L+120}" y="5" width="12" height="11" fill="#f47735"/>${svgText(L+138,15,'Expected','font-size="12" fill="#34495b"')}`;
  items.forEach((t,i)=>{const y=30+i*rowH,ow=t.o/max*span,ew=t.e/max*span;
    svg+=svgText(L-10,y+18,t.label.length>27?t.label.slice(0,26)+'…':t.label,'font-size="12" text-anchor="end" fill="#4a6072"');
    svg+=`<rect x="${L}" y="${y}" width="${ow}" height="15" fill="#1689d6" rx="2"/><rect x="${L}" y="${y+18}" width="${ew}" height="15" fill="#f47735" rx="2"/>`;
    svg+=svgText(L+ow+5,y+12,String(t.o),'font-size="11" fill="#34495b"')+svgText(L+ew+5,y+30,fmt(t.e,2),'font-size="11" fill="#34495b"');
  });$('observed-expected-chart').innerHTML=svg+'</svg>';
}

function renderResult(s){
  $('n-total').textContent=s.n;
  $('x-count').textContent=s.xs.length;
  $('f-count').textContent=s.fs.length;
  $('df').textContent=s.df;
  $('df2').textContent=s.df;
  $('chi2').textContent=fmt(s.chi2,4);
  $('p-value').textContent=s.p<0.000001?'< 0.000001':fmt(s.p,6);
  $('cramer').textContent=fmt(s.v,4);
  $('min-expected').textContent=fmt(Math.min(...s.e.flat()),2);
  renderTables(s);renderAssociation(s);renderContributions(s);renderObservedExpected(s);
  const alpha=Number($('alpha').value),reject=s.p<alpha;
  const caution=s.e.flat().some(v=>v<5)?' <strong>Caution:</strong> Some expected counts are below 5; the asymptotic p-value may be unreliable. Consider an exact/permutation test or more data.':'';
  $('test-conclusion').innerHTML=reject?
    `<strong>Reject H₀ at α = ${fmt(alpha,2)}.</strong> The observed counts differ sufficiently from independence expectations (χ² = ${fmt(s.chi2,3)}, df = ${s.df}, p ${s.p<0.000001?'&lt; 0.000001':'= '+fmt(s.p,5)}). This sample provides statistical evidence of an association between X and F.${caution}`:
    `<strong>Fail to reject H₀ at α = ${fmt(alpha,2)}.</strong> The chi-square test does not provide sufficient evidence of an association (χ² = ${fmt(s.chi2,3)}, df = ${s.df}, p = ${fmt(s.p,5)}). This does <em>not</em> prove that X and F are independent.${caution}`;
  $('final-discussion').textContent=reject?
    `In this sample of ${s.n} paired observations, the chi-square test indicates an association between X and F (p ${s.p<0.000001?'< 0.000001':'= '+fmt(s.p,5)} at α = ${fmt(alpha,2)}). This finding alone does not establish a causal relationship. The data are illustrative and other explanations may exist.`:
    `In this sample of ${s.n} paired observations, we do not find sufficient evidence to reject independence (p = ${fmt(s.p,5)} at α = ${fmt(alpha,2)}). A non-significant result is not proof of independence, and no causal conclusion can be drawn.`;
}
function run(){
  try{
    const s=contingency(parsePairs($('dataset').value));
    renderResult(s);$('input-status').textContent=`Calculated successfully from ${s.n} paired observations.`;$('input-status').className='status';
  }catch(err){$('input-status').textContent=err.message;$('input-status').className='status error';}
}
$('preset').addEventListener('change',()=>{
  if($('preset').value==='custom'){run();return;}
  $('dataset').value=makeExample($('preset').value==='associated');run();
});
let updateTimer;
$('dataset').addEventListener('input',()=>{
  $('preset').value='custom';
  clearTimeout(updateTimer);
  updateTimer=setTimeout(run,300);
});
$('alpha').addEventListener('change',run);
$('run').addEventListener('click',run);
$('reset').addEventListener('click',()=>{$('preset').value='associated';$('alpha').value='0.05';$('dataset').value=makeExample(true);run();});
$('dataset').value=makeExample(true);run();
