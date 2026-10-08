import os

with open('backend/config/api.py', 'r', encoding='utf-8') as f:
    text = f.read()

# Fix shot/take queries
text = text.replace("Shot.objects.filter(scene=sc)", "Shot.objects.filter(setup__scene=sc)")
text = text.replace("Take.objects.filter(shot__scene=sc)", "Take.objects.filter(shot__setup__scene=sc)")
text = text.replace("Take.objects.filter(shot__scene=sc,", "Take.objects.filter(shot__setup__scene=sc,")

text = text.replace("Shot.objects.filter(scene=scene)", "Shot.objects.filter(setup__scene=scene)")
text = text.replace("Take.objects.filter(shot__scene=scene)", "Take.objects.filter(shot__setup__scene=scene)")
text = text.replace("Take.objects.filter(shot__scene=scene,", "Take.objects.filter(shot__setup__scene=scene,")

# Add setup_count to SceneTreeNode schema
text = text.replace("circle_take_count: int = 0", "circle_take_count: int = 0\n    setup_count: int = 0")

# Add setup_count variable generation
text = text.replace("sc_shots = Shot.objects.filter(setup__scene=sc).count()", "sc_setups = CameraSetup.objects.filter(scene=sc).count()\n            sc_shots = Shot.objects.filter(setup__scene=sc).count()")
text = text.replace("shot_count=sc_shots,", "setup_count=sc_setups,\n                    shot_count=sc_shots,")

# Update get_scene
text = text.replace("shot_count = Shot.objects.filter(setup__scene=scene).count()", "setup_count = CameraSetup.objects.filter(scene=scene).count()\n    shot_count = Shot.objects.filter(setup__scene=scene).count()")
text = text.replace("shot_count=shot_count,", "setup_count=setup_count,\n        shot_count=shot_count,")

# Update sequence tree
text = text.replace("shots = Shot.objects.filter(setup__scene=sc)", "setups = CameraSetup.objects.filter(scene=sc)\n            shots = Shot.objects.filter(setup__scene=sc)")
text = text.replace("shot_count = shots.count()", "setup_count = setups.count()\n            shot_count = shots.count()")
text = text.replace("circle_take_count=circle_take_count", "circle_take_count=circle_take_count,\n                    setup_count=setup_count")

with open('backend/config/api.py', 'w', encoding='utf-8') as f:
    f.write(text)
print("Updated api.py successfully.")
