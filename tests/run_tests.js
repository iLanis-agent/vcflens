/* VcfLens tests: shared engine over the corpus vs tests/expected.json
   (builder-known structure, cross-checked by the real vobject library
   in tests/oracle.py). */
'use strict';
const fs=require('fs'),path=require('path');
const engine=require(path.join(__dirname,'..','engine.js'));
const items=JSON.parse(fs.readFileSync(path.join(__dirname,'expected.json'),'utf8')).items;
let fail=0,pass=0;
function eq(a,b,label){
  if(JSON.stringify(a)===JSON.stringify(b)){pass++;return;}
  fail++;console.log('FAIL '+label+': got '+JSON.stringify(a)+' want '+JSON.stringify(b));
}
for(const item of items){
  const text=fs.readFileSync(path.join(__dirname,'corpus',item.file),'utf8');
  const r=engine.parse(text);
  const T=item.file+' ';
  if(item.expect_warning){
    if(r.warnings.some(w=>w.indexOf(item.expect_warning)>=0))pass++;
    else{fail++;console.log('FAIL '+T+'missing warning '+item.expect_warning+' got '+JSON.stringify(r.warnings));}
    continue;
  }
  eq(r.errors.length,0,T+'errors');
  eq(r.contacts.length,item.contact_count,T+'contact_count');
  if(item.folded_lines!==undefined)eq(r.folded_lines,item.folded_lines,T+'folded_lines');
  item.contacts.forEach((want,i)=>{
    const got=r.contacts[i].summary,TT=T+'contact'+(i+1)+' ';
    for(const k of ['version','fn','n','org','title','tel','email','adr','bday','url','note','nickname','other']){
      if(want[k]!==undefined)eq(got[k],want[k],TT+k);
    }
  });
}
console.log(pass+' passed, '+fail+' failed');
process.exit(fail?1:0);
