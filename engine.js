/* VcfLens engine: parse vCard files (2.1/3.0/4.0). Unfolding, params,
   structured N/ADR values, quoted-printable + charset decoding, escaped
   chars, multi-contact files, malformed-input warnings.
   No dependencies; runs in the browser and in Node (tests). */
(function(root,factory){
  if(typeof module==='object'&&module.exports){module.exports=factory();}
  else{root.VcfLens=factory();}
})(typeof self!=='undefined'?self:this,function(){
'use strict';
function qpDecode(s){
  return s.replace(/=\r?\n|=\r/g,'')
          .replace(/=([0-9A-Fa-f]{2})/g,function(m,h){return String.fromCharCode(parseInt(h,16));});
}
function latin1ToUtf8(s){
  var bytes=[];for(var i=0;i<s.length;i++)bytes.push(s.charCodeAt(i));
  try{return decodeURIComponent(escape(s));}catch(e){return s;}
}
function unescapeVal(s){
  return s.replace(/\\n/gi,'\n').replace(/\\N/g,'\n').replace(/\\([\\;,])/g,'$1');
}
function splitUnescaped(s,sep){
  var out=[],cur='',i;
  for(i=0;i<s.length;i++){
    var c=s[i];
    if(c==='\\'&&i+1<s.length){cur+=c+s[i+1];i++;continue;}
    if(c===sep){out.push(cur);cur='';continue;}
    cur+=c;
  }
  out.push(cur);
  return out;
}
function parse(text){
  var r={errors:[],warnings:[],contacts:[],folded_lines:0,raw_lines:0};
  var lines=text.split(/\r\n|\r|\n/);
  r.raw_lines=lines.length;
  var logical=[],i;
  for(i=0;i<lines.length;i++){
    var ln=lines[i];
    if((ln[0]===' '||ln[0]==='\t')&&logical.length){logical[logical.length-1]+=ln.slice(1);r.folded_lines++;}
    else if(ln.length)logical.push(ln);
  }
  var cur=null;
  function prop(line){
    var colon=-1,inQ=false;
    for(var j=0;j<line.length;j++){
      var ch=line[j];
      if(inQ){if(ch==='"')inQ=false;continue;}
      if(ch==='"'){inQ=true;continue;}
      if(ch===':'){colon=j;break;}
    }
    if(colon<0){r.warnings.push('line without colon skipped: '+line.slice(0,40));return;}
    var head=line.slice(0,colon),value=line.slice(colon+1);
    var parts=head.split(';');
    var name=parts[0].toUpperCase();
    var dot=name.indexOf('.');
    if(dot>=0)name=name.slice(dot+1);
    var params={},paramList=[];
    for(var k=1;k<parts.length;k++){
      var p=parts[k],eq=p.indexOf('=');
      if(eq<0){paramList.push(p.toUpperCase());}
      else{
        var pk=p.slice(0,eq).toUpperCase(),pv=p.slice(eq+1);
        if(params[pk])params[pk]+=','+pv;else params[pk]=pv;
      }
    }
    var enc=(params.ENCODING||'').toUpperCase();
    var decoded=value,wasQP=false;
    if(enc==='QUOTED-PRINTABLE'||enc==='QP'){
      decoded=qpDecode(value);wasQP=true;
      var cs=(params.CHARSET||'').toUpperCase();
      if(cs==='UTF-8'||cs==='UTF8')decoded=latin1ToUtf8(decoded);
    }
    cur.props.push({name:name,value:decoded,raw:value,params:params,types:paramList.concat(params.TYPE?params.TYPE.split(','):[]),quoted_printable:wasQP});
  }
  for(i=0;i<logical.length;i++){
    var L=logical[i];
    var up=L.toUpperCase();
    if(up==='BEGIN:VCARD'){
      if(cur)r.warnings.push('nested BEGIN:VCARD');
      cur={props:[]};
    }else if(up==='END:VCARD'){
      if(!cur){r.warnings.push('END:VCARD without BEGIN');continue;}
      r.contacts.push(cur);cur=null;
    }else if(cur){prop(L);}
    else r.warnings.push('content outside VCARD skipped: '+L.slice(0,40));
  }
  if(cur)r.warnings.push('truncated: VCARD missing END:VCARD');
  for(i=0;i<r.contacts.length;i++){
    var c=r.contacts[i],out={tel:[],email:[],adr:[],url:[],other:0};
    for(var j=0;j<c.props.length;j++){
      var p=c.props[j],v=p.value;
      switch(p.name){
        case 'VERSION':out.version=v;break;
        case 'FN':out.fn=unescapeVal(v);break;
        case 'N':
          var np=splitUnescaped(v,';');
          out.n={family:unescapeVal(np[0]||''),given:unescapeVal(np[1]||''),additional:unescapeVal(np[2]||''),prefix:unescapeVal(np[3]||''),suffix:unescapeVal(np[4]||'')};
          break;
        case 'TEL':out.tel.push({value:v,types:p.types});break;
        case 'EMAIL':out.email.push({value:v,types:p.types});break;
        case 'ORG':out.org=splitUnescaped(v,';').map(unescapeVal);break;
        case 'TITLE':out.title=unescapeVal(v);break;
        case 'ADR':
          var ap=splitUnescaped(v,';');
          out.adr.push({types:p.types,city:unescapeVal(ap[3]||''),region:unescapeVal(ap[4]||''),code:unescapeVal(ap[5]||''),country:unescapeVal(ap[6]||'')});
          break;
        case 'BDAY':out.bday=v;break;
        case 'URL':out.url.push(v);break;
        case 'NOTE':out.note=unescapeVal(v);break;
        case 'NICKNAME':out.nickname=v;break;
        case 'PHOTO':out.has_photo=true;break;
        case 'VERSION':break;
        default:if(p.name.indexOf('X-')===0)out.other++;else if(p.name!=='BEGIN'&&p.name!=='END')out.other++;
      }
    }
    if(!out.version)r.warnings.push('contact '+(i+1)+' has no VERSION');
    if(!out.fn&&!out.n)r.warnings.push('contact '+(i+1)+' has no FN or N');
    r.contacts[i].summary=out;
  }
  return r;
}
return {parse:parse,qpDecode:qpDecode,unescapeVal:unescapeVal};
});
