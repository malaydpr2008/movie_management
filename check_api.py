import re

with open('backend/config/api.py', 'r', encoding='utf-8') as f:
    text = f.read()

schema = re.search(r'class CatalogsOut\(Schema\):.*?(class|#)', text, flags=re.DOTALL)
if schema:
    print(schema.group(0))
else:
    print('CatalogsOut not found')

func = re.search(r'@breakdown_router\.get\(\"/catalogs/\{project_id\}\", response=CatalogsOut\).*?return CatalogsOut[^\)]*\)', text, flags=re.DOTALL)
if func:
    print(func.group(0))
else:
    print('get_project_catalogs not found')
