#!/usr/bin/env python3
"""Build the VcfLens corpus: vobject-created cards plus hand-written edge
cases, and emit structural facts the builder knows by construction."""
import json, os
os.makedirs('tests/corpus', exist_ok=True)
expected = []

def write(name, text):
    open('tests/corpus/' + name, 'w', newline='').write(text)

# 1. simple.vcf - one 3.0 card, hand-written so expected facts are exact
simple = (
"BEGIN:VCARD\r\n"
"VERSION:3.0\r\n"
"N:Doe;Jane;Marie;Dr.;PhD\r\n"
"FN:Dr. Jane Marie Doe\\, PhD\r\n"
"ORG:Acme Corp;Research Division\r\n"
"TITLE:Chief Scientist\r\n"
"TEL;TYPE=CELL:+1-555-0100\r\n"
"TEL;TYPE=WORK,VOICE:+1-555-0200\r\n"
"EMAIL;TYPE=HOME:jane@example.com\r\n"
"EMAIL;TYPE=WORK:j.doe@acme.example\r\n"
"ADR;TYPE=HOME:;;123 Main St;Springfield;IL;62704;USA\r\n"
"BDAY:19850412\r\n"
"URL:https://jane.example.com\r\n"
"NOTE:First line\\nSecond line\r\n"
"X-CUSTOM-ID:abc-123\r\n"
"END:VCARD\r\n")
write('simple.vcf', simple)
expected.append({'file':'simple.vcf','contact_count':1,'contacts':[{
  'version':'3.0','fn':'Dr. Jane Marie Doe, PhD',
  'n':{'family':'Doe','given':'Jane','additional':'Marie','prefix':'Dr.','suffix':'PhD'},
  'org':['Acme Corp','Research Division'],'title':'Chief Scientist',
  'tel':[{'value':'+1-555-0100','types':['CELL']},{'value':'+1-555-0200','types':['WORK','VOICE']}],
  'email':[{'value':'jane@example.com','types':['HOME']},{'value':'j.doe@acme.example','types':['WORK']}],
  'adr':[{'types':['HOME'],'city':'Springfield','region':'IL','code':'62704','country':'USA'}],
  'bday':'19850412','url':['https://jane.example.com'],
  'note':'First line\nSecond line','other':1}]})

# 2. multi.vcf - two cards, one with a folded line and old-style bare params
multi = (
"BEGIN:VCARD\r\n"
"VERSION:2.1\r\n"
"N:Smith;Bob;;;\r\n"
"FN:Bob Smith\r\n"
"TEL;HOME;VOICE:+44 20 7946 0958\r\n"
"NOTE:A very long note that gets folded onto a second physical line accor\r\n"
" ding to the vCard folding rules\r\n"
"END:VCARD\r\n"
"BEGIN:VCARD\r\n"
"VERSION:4.0\r\n"
"N:Garcia;Ana;;;\r\n"
"FN:Ana Garcia\r\n"
"EMAIL;TYPE=home:ana@example.org\r\n"
"END:VCARD\r\n")
write('multi.vcf', multi)
expected.append({'file':'multi.vcf','contact_count':2,'folded_lines':1,'contacts':[
  {'version':'2.1','fn':'Bob Smith','n':{'family':'Smith','given':'Bob','additional':'','prefix':'','suffix':''},
   'tel':[{'value':'+44 20 7946 0958','types':['HOME','VOICE']}],
   'note':'A very long note that gets folded onto a second physical line according to the vCard folding rules'},
  {'version':'4.0','fn':'Ana Garcia','email':[{'value':'ana@example.org','types':['home']}]}]})

# 3. qp.vcf - 2.1 quoted-printable UTF-8 name ("Müller, Jürg")
qpname = 'M=C3=BCller;J=C3=BCrg'
qp = (
"BEGIN:VCARD\r\n"
"VERSION:2.1\r\n"
"N;CHARSET=UTF-8;ENCODING=QUOTED-PRINTABLE:" + qpname + ";;;\r\n"
"FN;CHARSET=UTF-8;ENCODING=QUOTED-PRINTABLE:J=C3=BCrg_M=C3=BCller\r\n"
"END:VCARD\r\n")
write('qp.vcf', qp)
expected.append({'file':'qp.vcf','contact_count':1,'contacts':[{
  'version':'2.1','fn':'Jürg_Müller',
  'n':{'family':'Müller','given':'Jürg','additional':'','prefix':'','suffix':''}}]})

# 4. broken.vcf - missing END:VCARD
write('broken.vcf', "BEGIN:VCARD\r\nVERSION:3.0\r\nFN:Unclosed Card\r\n")
expected.append({'file':'broken.vcf','expect_warning':'missing END:VCARD'})

json.dump({'items': expected}, open('tests/expected.json','w'), indent=1)
print('corpus:', [e['file'] for e in expected])
