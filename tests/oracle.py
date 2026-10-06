#!/usr/bin/env python3
"""Oracle: cross-check expected facts with the real vobject library.
Builder facts are authoritative for structure; vobject independently
decodes the same files so a wrong hand-written fact gets caught."""
import json, quopri, vobject

exp = json.load(open('tests/expected.json'))
problems = []
for item in exp['items']:
    if 'expect_warning' in item:
        continue
    text = open('tests/corpus/' + item['file'], encoding='utf-8').read()
    cards = list(vobject.readComponents(text))
    assert len(cards) == item['contact_count'], (item['file'], 'count', len(cards))
    for got, want in zip(cards, item['contacts']):
        if 'fn' in want:
            v = got.fn.value
            if v != want['fn']:
                problems.append((item['file'], 'fn', repr(v), repr(want['fn'])))
        if 'n' in want:
            n = got.n.value
            for k in want['n']:
                v = getattr(n, k)
                if v != want['n'][k]:
                    problems.append((item['file'], 'n.' + k, repr(v), repr(want['n'][k])))
        if 'tel' in want:
            got_tel = [(t.value, [str(x) for x in t.params.get('TYPE', t.params.get('type', []))]) for t in got.contents.get('tel', [])]
            want_tel = [(t['value'], t['types']) for t in want['tel']]
            if [t[0] for t in got_tel] != [t[0] for t in want_tel]:
                problems.append((item['file'], 'tel values', got_tel, want_tel))
        if 'email' in want:
            got_em = [e.value for e in got.contents.get('email', [])]
            if got_em != [e['value'] for e in want['email']]:
                problems.append((item['file'], 'email', got_em))
        if 'org' in want:
            if list(got.org.value) != want['org']:
                problems.append((item['file'], 'org', list(got.org.value)))
        if 'note' in want:
            if got.note.value != want['note']:
                problems.append((item['file'], 'note', repr(got.note.value)))
        if 'bday' in want:
            if str(got.bday.value) != want['bday']:
                problems.append((item['file'], 'bday', repr(got.bday.value)))
for p in problems:
    print('ORACLE MISMATCH:', p)
print('oracle ok' if not problems else 'oracle found %d problems' % len(problems))
raise SystemExit(1 if problems else 0)
