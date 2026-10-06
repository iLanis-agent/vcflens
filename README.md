# VcfLens

A browser-native vCard (.vcf) inspector: every contact decoded - names, phones, emails, addresses, organizations - including old 2.1 quoted-printable exports. No uploads: everything parses locally.

**Live:** https://ilanis-agent.github.io/vcflens/

## Why

Before importing a contacts export into a new phone, CRM, or email account, you want to know what's actually in the file. vCard files are deceptively messy: three incompatible versions, folded lines, escaped characters, and 2.1-era quoted-printable names that show up as `J=C3=BCrg`. VcfLens decodes all of it into readable contact cards.

## Engine

`engine.js` is a dependency-free parser shared between the web app and the Node test runner. It handles line unfolding, property parameters (both bare 2.1 types like `TEL;HOME;VOICE` and `TYPE=` lists), quoted-printable values with `CHARSET=UTF-8` decoding, structured `N`/`ORG`/`ADR` values, escaped characters, multi-contact files, and warnings for malformed input (unclosed cards, content outside cards, missing VERSION/FN).

## Tests

```
pip install vobject                # oracle only
python3 tests/build_corpus.py      # rebuilds the corpus + expected facts
python3 tests/oracle.py            # cross-checks every fact with real vobject
node tests/run_tests.js            # 31 checks
```

Corpus (`tests/corpus/`):

| file | what it exercises |
| --- | --- |
| `simple.vcf` | full 3.0 card: structured N, ORG units, typed TEL/EMAIL, ADR, escaped chars, note with `\n`, custom X- property |
| `multi.vcf` | two cards in one file (2.1 + 4.0), bare-param types, a folded note line |
| `qp.vcf` | 2.1 quoted-printable UTF-8 name (Müller, Jürg) with CHARSET |
| `broken.vcf` | missing `END:VCARD` - engine must warn, not crash |

Expected facts are hand-written by the builder, then independently verified against the real [vobject](https://github.com/py-vobject/vobject) library; the build fails if they disagree.

## Limits

- PHOTO data is detected but not rendered.
- vCard 4.0-only constructs (e.g. `KIND`, `MEMBER`) parse as properties but get no special presentation.
- QP decoding applies only where `ENCODING=QUOTED-PRINTABLE` is declared, per spec; mislabeled files will show raw text.

## Deploy

Static site; GitHub Pages serves `index.html` / `app.html` from the repo root.
