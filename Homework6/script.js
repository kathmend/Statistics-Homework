'use strict';
const $ = id => document.getElementById(id);
const html = (id, v) => { $(id).innerHTML = v; };
const num = (v, digits=7) => Number.isFinite(v) ? v.toFixed(digits) : '—';
const sci = v => Number.isFinite(v) ? v.toExponential(2) : '—';
const safe = x => String(x).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const PI = Math.PI;
const functions = {
  sin:{name:'sin(x)',a:0,b:PI,exact:2, lo:0,hi:1, f:x=>Math.sin(x),description:'Continuous and smooth. The exact integral on [0, π] is 2.'},
  square:{name:'x²',a:0,b:1,exact:1/3,lo:0,hi:1,f:x=>x*x,description:'Continuous and smooth. The exact integral on [0, 1] is 1/3.'},
  step:{name:'1 if x < 0.5; otherwise 3',a:0,b:1,exact:2,lo:1,hi:3,f:x=>x<.5?1:3,description:'Piecewise constant with a jump. The exact integral is 0.5×1 + 0.5×3 = 2.'},
  abs:{name:'|x − 0.5|',a:0,b:1,exact:.25,lo:0,hi:.5,f:x=>Math.abs(x-.5),description:'Continuous with a corner at 0.5. The exact integral is 1/4.'},
  inverse:{name:'1/√x',a:0,b:1,exact:2,lo:1,hi:10,f:x=>1/Math.sqrt(x),description:'Unbounded at x=0, but the improper integral converges to 2. Midpoints avoid evaluating x=0; a finite range cutoff underestimates high values near zero.'},
  indicator:{name:'1 if x < 0.5; otherwise 0',a:0,b:1,exact:.5,lo:0,hi:1,f:x=>x<.5?1:0,description:'Indicator of a half interval. The exact integral equals its length: 0.5.'},
  sinc:{name:'sin(x)/x',a:0,b:PI,exact:1.851937051982466,lo:0,hi:1,f:x=>x===0?1:Math.sin(x)/x,description:'The value at x=0 is the continuous limit 1. The integral is Si(π) ≈ 1.851937052 (special function).'},
  dirichlet:{name:'Dirichlet',a:0,b:1,exact:0,pathological:true,description:'Not Riemann-integrable; Lebesgue integral 0. A finite floating-point grid cannot represent irrational inputs faithfully.'},
  thomae:{name:'Thomae',a:0,b:1,exact:0,pathological:true,description:'Riemann- and Lebesgue-integrable, both equal to 0. Exact rational/irrational classification is not possible with ordinary floating-point samples.'}
};
function midpoint(f,N){let s=0;const d=(f.b-f.a)/N; for(let i=0;i<N;i++)s+=f.f(f.a+(i+.5)*d);return {value:s*d,evals:N};}
// Range-based histogram: bin the *values* and estimate each preimage measure from 8N domain samples.
function valueBins(f,K,M=8*K){
 const dx=(f.b-f.a)/M, vals=new Float64Array(M);
 let vmin=Infinity,vmax=-Infinity;
 for(let i=0;i<M;i++){const v=f.f(f.a+(i+.5)*dx);vals[i]=v;if(v<vmin)vmin=v;if(v>vmax)vmax=v;}
 // For a constant function, its only level set covers the whole domain.
 if(vmax-vmin<1e-13)return {value:vmin*(f.b-f.a),evals:M,bins:[{x:vmin,y:f.b-f.a}],lower:vmin,upper:vmax};
 const width=(vmax-vmin)/K, counts=new Uint32Array(K);
 for(const v of vals){const j=Math.min(K-1,Math.max(0,Math.floor((v-vmin)/width)));counts[j]++;}
 const bins=[]; let value=0;
 for(let j=0;j<K;j++){const level=vmin+(j+.5)*width, mass=counts[j]*dx; value+=level*mass;bins.push({x:level,y:mass});}
 return {value,evals:M,bins,lower:vmin,upper:vmax};
}
function svgFrame(W=720,H=290){return {W,H,L:52,R:15,T:20,B:43,w:W-67,h:H-63};}
function graphLine(series, opts={}){
 const F=svgFrame(opts.W||720,opts.H||290), {W,H,L,T,w,h}=F;
 const xs=series.flatMap(s=>s.points.map(p=>p.x));const ys=series.flatMap(s=>s.points.map(p=>p.y)).filter(Number.isFinite);
 if(!xs.length || !ys.length)return '<div class="empty-chart-note">No data available.</div>';
 let xmin=opts.xmin??Math.min(...xs),xmax=opts.xmax??Math.max(...xs);
 let ymin=opts.ymin??Math.min(...ys),ymax=opts.ymax??Math.max(...ys);
 if(xmin===xmax){xmin-=1;xmax+=1;}if(ymin===ymax){ymin-=.5;ymax+=.5;}
 const padx=(xmax-xmin)*.015,pady=(ymax-ymin)*.08;xmin-=padx;xmax+=padx;ymin-=pady;ymax+=pady;
 const X=x=>L+(x-xmin)/(xmax-xmin)*w,Y=y=>T+(ymax-y)/(ymax-ymin)*h;
 let out=`<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="${safe(opts.alt||'Line comparison chart')}" xmlns="http://www.w3.org/2000/svg">`;
 for(let i=0;i<=4;i++){const v=ymin+(ymax-ymin)*i/4, yy=Y(v);out+=`<line x1="${L}" y1="${yy}" x2="${L+w}" y2="${yy}" stroke="#dce4eb"/><text x="${L-9}" y="${yy+4}" font-size="11" text-anchor="end" fill="#536371">${Number(v.toPrecision(3))}</text>`;}
 for(let i=0;i<=4;i++){const v=xmin+(xmax-xmin)*i/4, xx=X(v);out+=`<line x1="${xx}" y1="${T}" x2="${xx}" y2="${T+h}" stroke="#e7ebef"/><text x="${xx}" y="${H-21}" font-size="11" text-anchor="middle" fill="#536371">${Number(v.toPrecision(3))}</text>`;}
 out+=`<line x1="${L}" y1="${T+h}" x2="${L+w}" y2="${T+h}" stroke="#64748b"/><line x1="${L}" y1="${T}" x2="${L}" y2="${T+h}" stroke="#64748b"/>`;
 series.forEach(s=>{const pts=s.points.filter(p=>Number.isFinite(p.y));if(pts.length<2)return;let d='';
 if(pts.length>=3 && opts.smooth!==false && !s.dash){
  d=`M${X(pts[0].x).toFixed(2)},${Y(pts[0].y).toFixed(2)}`;
  for(let i=0;i<pts.length-1;i++){
   const p0=pts[Math.max(0,i-1)],p1=pts[i],p2=pts[i+1],p3=pts[Math.min(pts.length-1,i+2)];
   const xx1=X(p1.x)+(X(p2.x)-X(p0.x))/6,yy1=Y(p1.y)+(Y(p2.y)-Y(p0.y))/6;
   const xx2=X(p2.x)-(X(p3.x)-X(p1.x))/6,yy2=Y(p2.y)-(Y(p3.y)-Y(p1.y))/6;
   d+=` C${xx1.toFixed(2)},${yy1.toFixed(2)} ${xx2.toFixed(2)},${yy2.toFixed(2)} ${X(p2.x).toFixed(2)},${Y(p2.y).toFixed(2)}`;
  }
 }else{d=pts.map((p,i)=>`${i?'L':'M'}${X(p.x).toFixed(2)},${Y(p.y).toFixed(2)}`).join(' ');}
 out+=`<path d="${d}" fill="none" stroke="${s.color||'#2563eb'}" stroke-width="${s.width||2.8}" stroke-linecap="round" stroke-linejoin="round" ${s.dash?'stroke-dasharray="6 5"':''}/>`;});
 if(opts.xlabel)out+=`<text x="${L+w/2}" y="${H-2}" text-anchor="middle" fill="#536371" font-size="12">${safe(opts.xlabel)}</text>`;
 if(opts.legend){let xx=L; for(const s of series){out+=`<line x1="${xx}" y1="10" x2="${xx+20}" y2="10" stroke="${s.color}" stroke-width="3"/><text x="${xx+25}" y="13" fill="#536371" font-size="11">${safe(s.name)}</text>`;xx+=Math.max(110,s.name.length*7+44);}}
 return out+'</svg>';
}
function barGraph(bins){
 if(!bins.length)return '<div class="empty-chart-note">Not applicable for this mathematical example.</div>';
 const W=650,H=260,L=44,T=24,w=590,h=195,max=Math.max(...bins.map(b=>b.y),.000001),bw=w/bins.length;
 let out=`<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Range bins with estimated preimage measures">`;
 for(let i=0;i<=4;i++){const y=T+h*(1-i/4);out+=`<line x1="${L}" x2="${L+w}" y1="${y}" y2="${y}" stroke="#dde4eb"/><text x="${L-8}" y="${y+4}" font-size="11" text-anchor="end" fill="#536371">${num(max*i/4,2)}</text>`;}
 for(let i=0;i<bins.length;i++){const b=bins[i], ht=b.y/max*h;out+=`<rect x="${L+i*bw+.4}" y="${T+h-ht}" width="${Math.max(.35,bw-.8)}" height="${ht}" fill="#2563eb" opacity=".85"/>`;}
 out+=`<text x="${L}" y="${H-17}" fill="#536371" font-size="11">${num(bins[0].x,2)}</text><text x="${L+w}" y="${H-17}" fill="#536371" font-size="11" text-anchor="end">${num(bins[bins.length-1].x,2)}</text><text x="${L+w/2}" y="${H-2}" text-anchor="middle" fill="#536371" font-size="12">Function-value bins</text></svg>`;
 return out;
}
function pathChart(f){
 const pts=[];const count=240;
 for(let i=0;i<=count;i++){const x=f.a+(i+.5)/(count+1)*(f.b-f.a),y=f.f(x);if(Number.isFinite(y))pts.push({x,y});}
 // Separate the two sides of jump discontinuities in step and indicator functions.
 if(f===functions.step||f===functions.indicator){let series=[{name:'Left',color:'#2563eb',points:[{x:0,y:f.f(0)},{x:.49999,y:f.f(.49999)}]},{name:'Right',color:'#2563eb',points:[{x:.5,y:f.f(.5)},{x:1,y:f.f(1)}]}];return graphLine(series,{xlabel:'Domain x',alt:'Piecewise constant function',smooth:false});}
 return graphLine([{name:'f(x)',color:'#2563eb',points:pts}],{xlabel:'Domain x',alt:f.name});
}
function updateFunction(){
 const f=functions[$('function-select').value];$('function-description').textContent=f.description;
 if(f.pathological){html('function-chart','<div class="empty-chart-note">Exact rationality cannot be represented by a finite floating-point plot. See the mathematical explanation below.</div>');html('range-chart','<div class="empty-chart-note">For the exact Lebesgue measure, the set where f is nonzero has measure zero.</div>');}
}
function runIntegral(){
 const f=functions[$('function-select').value],N=Number($('resolution').value),K=Number($('value-bins').value),M=Number($('preimage-probes').value);
 if(!Number.isInteger(N)||N<8||N>800||!Number.isInteger(K)||K<8||K>800||!Number.isInteger(M)||M<64||M>50000){$('integral-note').textContent='Use N and K between 8 and 800, and M between 64 and 50,000.';return;}
 updateFunction();html('exact-result',num(f.exact,7));
 if(f.pathological){html('riemann-result',f===functions.dirichlet?'Does not exist':'0 (exact)');html('lebesgue-result','0 (exact)');$('integral-note').textContent=f===functions.dirichlet?'Dirichlet is not Riemann-integrable; the exact Lebesgue integral is 0. No misleading floating-point estimate is displayed.':'Thomae is integrable by both definitions, with exact value 0. Pointwise numerical sampling cannot fully represent rationality.';return;}
 const a=midpoint(f,N),b=valueBins(f,K,M);html('riemann-result',num(a.value));html('lebesgue-result',num(b.value));
 $('integral-note').textContent=`Absolute errors: midpoint ${sci(Math.abs(a.value-f.exact))}; range-bin ${sci(Math.abs(b.value-f.exact))}. Function evaluations: ${a.evals} vs ${b.evals}. ${f===functions.inverse?'Near x=0, a finite range and finite x-grid miss part of the high-value tail.':''}`;
 html('function-chart',pathChart(f));html('range-chart',barGraph(b.bins));
}
function runConvergence(){
 const f=functions[$('function-select').value];if(f.pathological){html('convergence-body','<tr><td colspan="11">No finite-grid convergence comparison: exact rationality and measure-zero sets require mathematical treatment.</td></tr>');html('convergence-chart','<div class="empty-chart-note">Select an ordinary function for numerical convergence.</div>');return;}
 const ns=[8,16,32,64,128,256,512],rm=[],lm=[];let rows='';
 for(const n of ns){let t=performance.now();const r=midpoint(f,n),tr=performance.now()-t;t=performance.now();const k=n,m=8*n,l=valueBins(f,k,m),tl=performance.now()-t;const re=Math.abs(r.value-f.exact),le=Math.abs(l.value-f.exact);rm.push({x:n,y:Math.max(re,1e-14)});lm.push({x:n,y:Math.max(le,1e-14)});
 rows+=`<tr><td>${n}</td><td>${k}</td><td>${m}</td><td>${num(r.value,7)}</td><td>${num(l.value,7)}</td><td>${sci(re)}</td><td>${sci(le)}</td><td>${r.evals}</td><td>${l.evals}</td><td>${num(tr,3)}</td><td>${num(tl,3)}</td></tr>`;
 }
 html('convergence-body',rows);html('convergence-chart',graphLine([{name:'Midpoint',color:'#2563eb',points:rm},{name:'Range bins',color:'#f43f5e',points:lm}],{xlabel:'Resolution (N / K)',legend:true,alt:'Absolute error versus resolution'}));
}
// EXERCISE 2: normal CDF. Implement independent numerical methods.
const pdf = x=>Math.exp(-.5*x*x)/Math.sqrt(2*PI);
function cdfSimpson(z,n){const v=Math.abs(z),h=v/n;if(v===0)return {value:.5,ops:0};let s=pdf(0)+pdf(v);for(let i=1;i<n;i++)s+=(i%2?4:2)*pdf(h*i);const area=s*h/3;return {value:z<0?.5-area:.5+area,ops:n+1};}
function erfSeries(z){ // erf(t)=2/sqrt(pi) sum (-1)^k t^(2k+1)/(k!(2k+1))
 const t=Math.abs(z)/Math.SQRT2;let pow=t,sum=0,terms=0;
 for(let k=0;k<160;k++){const term=pow/(2*k+1);sum+=term;terms=k+1;if(Math.abs(term)<1e-16*Math.max(1,Math.abs(sum)))break;pow*=-(t*t)/(k+1);}
 const p=.5+(z<0?-1:1)*sum/Math.sqrt(PI); // since erf(t)/2 = sum/sqrt(pi)
 return {value:p,ops:terms};
}
function erfFast(x){ // Abramowitz & Stegun 7.1.26; max absolute erf error approximately 1.5e-7
 const sign=x<0?-1:1,z=Math.abs(x),t=1/(1+.3275911*z);
 const polynomial=((((1.061405429*t-1.453152027)*t+1.421413741)*t-.284496736)*t+.254829592)*t;
 return sign*(1-polynomial*Math.exp(-z*z));
}
function cdfFast(z){return {value:.5*(1+erfFast(z/Math.SQRT2)),ops:1};}
const refs=[[-3,.0013498980316301],[-2,.0227501319481792],[-1,.1586552539314571],[0,.5],[.5,.6914624612740131],[1,.8413447460685429],[2,.9772498680518208],[3,.9986501019683699]];
function refFor(z){let hit=refs.find(r=>Math.abs(r[0]-z)<1e-12);return hit?hit[1]:erfSeries(z).value;}
function runCdf(){let z=Number($('z-input').value),n=Number($('simpson-n').value);
 if(!Number.isFinite(z)||Math.abs(z)>4||!Number.isInteger(n)||n<2||n>4000||n%2){$('cdf-input-note').textContent='Use −4 ≤ z ≤ 4 and an even number of Simpson intervals from 2 to 4000.';return;}
 $('cdf-input-note').textContent='';const s=cdfSimpson(z,n),e=erfSeries(z),a=cdfFast(z),reference=refFor(z);
 html('simpson-result',num(s.value,9));html('series-result',num(e.value,9));html('approx-result',num(a.value,9));
 const rows=[['Simpson rule',s],['erf power series',e],['Fast erf approximation',a]];
 html('cdf-single-table',rows.map(([name,v])=>`<tr><td>${name}</td><td>${num(v.value,12)}</td><td>${sci(Math.abs(v.value-reference))}</td><td>${v.ops}</td></tr>`).join(''));
 const pts=[];for(let i=0;i<=160;i++){const x=-4+i/20;pts.push({x,y:erfSeries(x).value});}
 html('cdf-chart',graphLine([{name:'Φ(z)',color:'#2563eb',points:pts},{name:'Selected probability',color:'#f43f5e',points:[{x:z,y:0},{x:z,y:reference}]}],{xmin:-4,xmax:4,ymin:0,ymax:1,xlabel:'z score',alt:'Standard normal cumulative distribution'}));
}
function runBenchmark(){let n=Number($('simpson-n').value);if(!Number.isInteger(n)||n<2||n>4000||n%2)n=40;
 const errors=[0,0,0],rows=[];let totals=[0,0,0];
 for(const [z,reference] of refs){let t=performance.now(),s=cdfSimpson(z,n),ts=performance.now()-t;t=performance.now();let e=erfSeries(z),te=performance.now()-t;t=performance.now();let a=cdfFast(z),ta=performance.now()-t;totals[0]+=ts;totals[1]+=te;totals[2]+=ta;
 const er=[s,e,a].map(v=>Math.abs(v.value-reference));er.forEach((v,i)=>errors[i]=Math.max(errors[i],v));
 rows.push(`<tr><td>${z}</td><td>${num(reference,10)}</td><td>${num(s.value,10)}</td><td>${num(e.value,10)}</td><td>${num(a.value,10)}</td><td>${sci(er[0])}</td><td>${sci(er[1])}</td><td>${sci(er[2])}</td></tr>`);
 }
 html('cdf-benchmark-body',rows.join(''));
 const chartSeries=[{name:'Simpson',color:'#2563eb',points:[{x:0,y:errors[0]},{x:1,y:errors[0]}]},{name:'Series',color:'#10b981',points:[{x:0,y:errors[1]},{x:1,y:errors[1]}]},{name:'Fast erf',color:'#f43f5e',points:[{x:0,y:errors[2]},{x:1,y:errors[2]}]}];
 // A numerical comparison is more interpretable than a linear plot across very different error scales.
 html('cdf-error-chart',`<div class="error-bars">${[['Simpson',errors[0],'#2563eb'],['erf series',errors[1],'#10b981'],['Fast erf',errors[2],'#f43f5e']].map(([label,err,color])=>`<div class="error-row"><span>${label}</span><div class="error-track"><div style="width:${Math.max(1,Math.min(100,100*(Math.log10(err+1e-17)+17)/12))}%;background:${color}"></div></div><strong>${sci(err)}</strong></div>`).join('')}</div><p class="hint">Bar widths use a log-like visual scaling; the numeric maximum absolute errors are exact to the displayed precision.</p>`);
 $('cdf-benchmark-summary').textContent=`Maximum absolute errors at these ${refs.length} reference points: Simpson ${sci(errors[0])}, series ${sci(errors[1])}, fast erf ${sci(errors[2])}. Simpson uses ${n+1} density evaluations per nonzero z; erf-series uses a variable number of terms; fast erf uses a fixed polynomial/exponential calculation. Tiny browser timing measurements are unreliable, so operations provide the primary efficiency comparison.`;
}
$('function-select').addEventListener('change',()=>{runIntegral();});$('run-integral').addEventListener('click',runIntegral);$('compare-integrals').addEventListener('click',runConvergence);$('run-cdf').addEventListener('click',runCdf);$('run-cdf-benchmark').addEventListener('click',runBenchmark);
runIntegral();runConvergence();runCdf();runBenchmark();
