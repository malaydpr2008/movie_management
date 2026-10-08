import os
with open('backend/config/api.py', 'r', encoding='utf-8') as f:
    text = f.read()

lines = text.split('\n')
start = lines.index('shots_router = Router(tags=["Shots & Coverage"])')
end = lines.index('breakdown_router = Router(tags=["Breakdown Elements & Catalogs"])') - 4

with open('backend/config/shots_router_replacement.py', 'r', encoding='utf-8') as f:
    replacement = f.read()

new_text = '\n'.join(lines[:start]) + '\n' + replacement + '\n' + '\n'.join(lines[end:])
with open('backend/config/api.py', 'w', encoding='utf-8') as f:
    f.write(new_text)
