import re, json

h = open('akld.html', encoding='utf-8', errors='replace').read()
# File contains RSC payload with backslash-escaped quotes: \"tweet\":
u = h.replace('\\"', '"')

anchors = [m.start() for m in re.finditer(r'"plaqueTitle":', u)]
print('plaque anchors:', len(anchors))

recs = []
for i, s in enumerate(anchors):
    end = anchors[i + 1] if i + 1 < len(anchors) else s + 6000
    blk = u[s:end]

    def g(pat, d=''):
        m = re.search(pat, blk, re.S)
        return m.group(1) if m else d

    cat = ''
    # category label appears just BEFORE plaqueTitle in the record
    pre = u[max(0, s - 600):s]
    mc = re.findall(r'"label":"([^"]*)"', pre)
    if mc:
        cat = mc[-1]

    txt = g(r'"text":"((?:[^"\\]|\\.)*)"')
    try:
        txt = json.loads('"' + txt + '"')
    except Exception:
        pass

    recs.append({
        'category': cat,
        'year': g(r'"yearHint":"([^"]*)"'),
        'date': g(r'"created_at":"([^"]{10})')[:10],
        'likes': int(g(r'"favorite_count":(\d+)', '0')),
        'plaque': g(r'"plaqueTitle":"((?:[^"\\]|\\.)*)"'),
        'text': txt,
    })

recs = [r for r in recs if r['text']]
print('extracted:', len(recs))
json.dump(recs, open('tweets.json', 'w'), ensure_ascii=False, indent=1)

for r in sorted(recs, key=lambda x: -x['likes']):
    print(f"[{r['category'][:18]:18}] {r['date']} {r['likes']:>6} | {r['text'][:150]}")
