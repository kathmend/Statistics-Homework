'use strict';
const $ = id => document.getElementById(id);
const mod=(a,m)=>((a%m)+m)%m;
function caesar(text,k){return text.replace(/[A-Za-z]/g,c=>String.fromCharCode((c>='a'?97:65)+mod(c.charCodeAt(0)-(c>='a'?97:65)+k,26)));}
function runCaesar(){const k=Number($('caesar-key').value),d=Number($('caesar-decrypt-key').value);if(!Number.isInteger(k)||k<0||k>25||!Number.isInteger(d)||d<0||d>25){$('caesar-cipher').textContent='Choose shifts from 0 to 25.';$('caesar-plain').textContent='—';return;}const c=caesar($('message').value,k);$('caesar-cipher').textContent=c;$('caesar-plain').textContent=caesar(c,-d);}
$('caesar-run').addEventListener('click',runCaesar);
// Actual secp256k1 point arithmetic with BigInt; the tiny private-key range is intentional.
const P=0xFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFEFFFFFC2Fn;
const G={x:0x79BE667EF9DCBBAC55A06295CE870B07029BFCDB2DCE28D959F2815B16F81798n,y:0x483ADA7726A3C4655DA4FBFC0E1108A8FD17B448A68554199C47D08FFB10D4B8n};
function inverse(a){let t=0n,nt=1n,r=P,nr=mod(a,P);while(nr!==0n){const q=r/nr;[t,nt]=[nt,t-q*nt];[r,nr]=[nr,r-q*nr];}if(r!==1n)throw Error('No inverse');return mod(t,P);}
function add(A,B){if(!A)return B;if(!B)return A;if(A.x===B.x&&mod(A.y+B.y,P)===0n)return null;const slope=A.x===B.x&&A.y===B.y?mod(3n*A.x*A.x*inverse(2n*A.y),P):mod((B.y-A.y)*inverse(B.x-A.x),P);const x=mod(slope*slope-A.x-B.x,P);return {x,y:mod(slope*(A.x-x)-A.y,P)};}
function mul(n,pt=G){let r=null,a=pt;while(n>0n){if(n&1n)r=add(r,a);a=add(a,a);n>>=1n;}return r;}
// Direct educational EC ElGamal: each UTF-8 byte b is mapped to M = (b+1)G.
// This is deliberately inefficient and insecure; never use it for real data.
const pointHex=p=>p ? '0x'+p.x.toString(16).padStart(64,'0')+', 0x'+p.y.toString(16).padStart(64,'0') : 'O';
const shortPoint=p=>p ? '('+p.x.toString(16).slice(0,18)+'…, '+p.y.toString(16).slice(0,18)+'…)' : 'O';
const neg=p=>p ? {x:p.x,y:mod(-p.y,P)} : null;
const equal=(a,b)=>a===null ? b===null : b!==null&&a.x===b.x&&a.y===b.y;
const bytePoints=Array.from({length:256},(_,i)=>mul(BigInt(i+1)));
const pointId=p=>p.x.toString(16)+':'+p.y.toString(16);
const byteLookup=new Map(bytePoints.map((p,i)=>[pointId(p),i]));
function randomScalar(){const v=new Uint32Array(1);crypto.getRandomValues(v);return BigInt(v[0]%128+1);}
function decryptECC(cipher,k){const bytes=cipher.map(([C1,C2])=>{const M=add(C2,neg(mul(k,C1)));const b=M?byteLookup.get(pointId(M)):undefined;if(b===undefined)throw Error('Message point cannot be decoded.');return b;});return new TextDecoder('utf-8',{fatal:true}).decode(Uint8Array.from(bytes));}
let latest=null;
function runECC(){const k=Number($('ecc-key').value);if(!Number.isInteger(k)||k<1||k>256){$('ecc-status').textContent='Choose a private key from 1 to 256.';return;}if(!globalThis.crypto?.getRandomValues){$('ecc-status').textContent='Secure browser randomness is unavailable. Use HTTPS or localhost.';return;}try{const priv=BigInt(k),pub=mul(priv),data=new TextEncoder().encode($('message').value);if(data.length<1||data.length>60){$('ecc-status').textContent='Use a message of 1 to 60 UTF-8 bytes for this demonstration.';return;}const cipher=Array.from(data,b=>{const r=randomScalar(),C1=mul(r),C2=add(bytePoints[b],mul(r,pub));return [C1,C2];});const plain=decryptECC(cipher,priv);latest={pub,cipher,k};$('ecc-public').textContent='Q = '+shortPoint(pub);$('ecc-r').textContent='First ciphertext point C1 = '+shortPoint(cipher[0][0]);$('ecc-cipher').textContent='First ciphertext point C2 = '+shortPoint(cipher[0][1])+' | '+cipher.length+' encrypted byte(s)';$('ecc-plain').textContent=plain;$('ecc-status').textContent='Encryption and decryption completed. A fresh temporary scalar r (1–128) was selected for each byte. Full ciphertext is kept in browser memory.';$('ecc-found').textContent='—';$('ecc-attempts').textContent='—';$('ecc-attack-status').textContent='—';$('ecc-attack-time').textContent='Search time will appear here (browser dependent).';$('ecc-attack-note').textContent='Ready to test the 256 possible receiver private keys.';}catch(e){$('ecc-status').textContent='Experiment failed: '+e.message;}}
$('ecc-run').addEventListener('click',runECC);
$('ecc-attack').addEventListener('click',()=>{if(!latest){$('ecc-attack-note').textContent='Run ECC encryption first.';return;}const started=performance.now();let cur=null,found=null,attempts=0;for(let i=1;i<=256;i++){cur=add(cur,G);attempts++;if(equal(cur,latest.pub)){found=i;break;}}$('ecc-attack-time').textContent='Search time: '+(performance.now()-started).toFixed(2)+' ms (browser dependent).';$('ecc-found').textContent=found??'None';$('ecc-attempts').textContent=attempts;$('ecc-attack-status').textContent=found===latest.k?'Match':'Failed';if(found!==null){try{const plaintext=decryptECC(latest.cipher,BigInt(found));$('ecc-attack-note').textContent='Recovered plaintext using the guessed private key: '+plaintext;}catch(e){$('ecc-attack-note').textContent='Key recovered, but decryption failed: '+e.message;}}});
const ENGLISH=[8.167,1.492,2.782,4.253,12.702,2.228,2.015,6.094,6.966,0.153,0.772,4.025,2.406,6.749,7.507,1.929,0.095,5.987,6.327,9.056,2.758,0.978,2.360,0.150,1.974,0.074];
const corpus=`The study of language and statistics provides a useful example of how patterns can reveal hidden information. In ordinary English writing some letters occur more frequently than others. A simple substitution cipher changes the appearance of a message but keeps many of its statistical properties. When we collect enough text we can compare the observed distribution of letters with a reference distribution and find a likely key. Short messages may not contain enough evidence to identify the correct shift. Longer passages generally give more reliable estimates, although the topic and writing style can still affect the frequencies. The purpose of this experiment is to observe how a simple statistical method behaves as the sample size increases. Cryptographic systems should not depend on keeping their algorithms secret. A strong design needs a large key space and should resist known analytical attacks. In this exercise we deliberately choose small keys so that students can explore the algorithms and see their limitations in a browser. `;
function score(text){const counts=Array(26).fill(0);for(const c of text.toUpperCase())if(c>='A'&&c<='Z')counts[c.charCodeAt(0)-65]++;const n=counts.reduce((a,b)=>a+b,0);return counts.reduce((sum,c,i)=>{const e=n*ENGLISH[i]/100;return sum+(c-e)**2/e;},0);}
function runFrequency(){const n=Number($('text-length').value),shift=Number($('attack-shift').value);if(!Number.isInteger(shift)||shift<0||shift>25){$('attack-summary').textContent='Choose a shift from 0 to 25.';return;}const sample=corpus.repeat(Math.ceil(n/corpus.length)+2).toUpperCase().replace(/[^A-Z]/g,'').slice(0,n),encrypted=caesar(sample,shift),results=Array.from({length:26},(_,k)=>({k,s:score(caesar(encrypted,-k))})).sort((a,b)=>a.s-b.s),guess=results[0].k;$('attack-guess').textContent=guess;$('attack-actual').textContent=shift;$('attack-match').textContent=guess===shift?'Correct':'Incorrect';$('attack-summary').textContent=`Used ${n} letters. Best chi-square score: ${results[0].s.toFixed(2)}. Short samples may give misleading results.`;$('score-table').replaceChildren(...results.slice(0,5).map(x=>{const tr=document.createElement('tr');for(const value of [x.k,x.s.toFixed(2)]){const td=document.createElement('td');td.textContent=value;tr.append(td);}return tr;}));const counts=Array(26).fill(0);for(const c of encrypted)counts[c.charCodeAt(0)-65]++;const bars=$('letter-bars');bars.replaceChildren(...counts.map((count,i)=>{const row=document.createElement('div');row.className='bar-row';const label=document.createElement('span');label.textContent=String.fromCharCode(65+i);const track=document.createElement('div');track.className='bar-track';const fill=document.createElement('div');fill.className='bar-fill';fill.style.width=(count/n*100/16*100)+'%';track.append(fill);const val=document.createElement('span');val.textContent=(count/n*100).toFixed(1)+'%';row.append(label,track,val);return row;}));}
$('caesar-attack').addEventListener('click',runFrequency);
runCaesar();runFrequency();

// Additional experiments inspired by the assignment comparison; independent implementation.
$('custom-attack').addEventListener('click',()=>{
 const cipher=$('custom-cipher').value;
 const letters=(cipher.match(/[A-Za-z]/g)||[]).length;
 if(!letters){$('custom-result').textContent='Enter ciphertext containing English letters.';return;}
 const ranked=Array.from({length:26},(_,k)=>({k,plain:caesar(cipher,-k),value:score(caesar(cipher,-k))})).sort((a,b)=>a.value-b.value);
 $('custom-result').textContent='Most likely shift: '+ranked[0].k+' | Chi-square: '+ranked[0].value.toFixed(2)+' | Letters: '+letters+' | Candidate plaintext: '+ranked[0].plain;
});
$('length-attack').addEventListener('click',()=>{
 const shift=Number($('attack-shift').value);
 if(!Number.isInteger(shift)||shift<0||shift>25){$('length-table').textContent='Choose a valid secret shift above.';return;}
 const letters=corpus.toUpperCase().replace(/[^A-Z]/g,'');
 const lengths=[10,20,40,80,160,300,600,900];
 $('length-table').replaceChildren(...lengths.map(n=>{
   const sample=letters.repeat(Math.ceil(n/letters.length)).slice(0,n),cipher=caesar(sample,shift);
   const guesses=Array.from({length:26},(_,k)=>({k,value:score(caesar(cipher,-k))})).sort((a,b)=>a.value-b.value);
   const tr=document.createElement('tr');
   for(const v of [n,shift,guesses[0].k,guesses[0].k===shift?'Recovered':'Incorrect']){const td=document.createElement('td');td.textContent=v;tr.append(td);}
   return tr;
 }));
});
