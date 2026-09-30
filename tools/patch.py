# Replace exact quoted strings in a track file: python3 tools/patch.py <track> <json-mapping-file>
import json, sys
track, mp = sys.argv[1], sys.argv[2]
p = f"www/tracks/{track}.js"; s = open(p).read(); m = json.load(open(mp))
for a, b in m.items():
    k = json.dumps(a, ensure_ascii=False)
    if k not in s: sys.exit(f"not found: {a}")
    s = s.replace(k, json.dumps(b, ensure_ascii=False), 1 if s.count(k) == 1 else s.count(k))
open(p, "w").write(s); print(f"patched {len(m)} strings")
