import re

with open('backend/config/api.py', 'r', encoding='utf-8') as f:
    text = f.read()

# Add VFXOut schema
vfx_schema = """
class VFXSfxItemOut(Schema):
    id: uuid.UUID
    element_type: str
    target: str
    custom_notes: str
    is_continuity_critical: bool
    scene_id: uuid.UUID
"""

if "class VFXSfxItemOut" not in text:
    text = text.replace("class CatalogsOut(Schema):", vfx_schema + "\nclass CatalogsOut(Schema):")

routes = """
@breakdown_router.get("/projects/{project_id}/catalogs/locations", response=List[MasterLocationOut])
def get_project_locations(request, project_id: uuid.UUID):
    project = get_object_or_404(Project, id=project_id)
    locs = MasterLocation.objects.filter(project=project)
    return [
        MasterLocationOut(
            id=loc.id,
            name=loc.name,
            address=loc.address,
            gps_coordinates=loc.gps_coordinates,
            sun_path_notes=loc.sun_path_notes
        )
        for loc in locs
    ]

@breakdown_router.get("/projects/{project_id}/catalogs/characters", response=List[CharacterOut])
def get_project_characters(request, project_id: uuid.UUID):
    project = get_object_or_404(Project, id=project_id)
    chars = Character.objects.filter(project=project).prefetch_related('costume_looks')
    characters_out = []
    for c in chars:
        looks_out = [
            CostumeLookOut(
                id=lk.id,
                character_id=c.id,
                character_name=c.name,
                look_number=lk.look_number,
                description=lk.description,
                continuity_photo_url=lk.continuity_photo_url
            )
            for lk in c.costume_looks.all()
        ]
        characters_out.append(
            CharacterOut(
                id=c.id,
                name=c.name,
                cast_id_number=c.cast_id_number,
                actor_name=c.actor_name,
                looks=looks_out
            )
        )
    return characters_out

@breakdown_router.get("/projects/{project_id}/catalogs/props", response=List[PropOut])
def get_project_props(request, project_id: uuid.UUID):
    project = get_object_or_404(Project, id=project_id)
    props = Prop.objects.filter(project=project)
    return [
        PropOut(id=p.id, name=p.name, is_hero_prop=p.is_hero_prop, quantity=p.quantity)
        for p in props
    ]

@breakdown_router.get("/projects/{project_id}/catalogs/vfx", response=List[VFXSfxItemOut])
def get_project_vfx(request, project_id: uuid.UUID):
    project = get_object_or_404(Project, id=project_id)
    items = SceneBreakdownItem.objects.filter(scene__sequence__act__project=project, element_type__in=['VFX', 'SFX'])
    return [
        VFXSfxItemOut(
            id=item.id,
            element_type=item.element_type,
            target=item.prop.name if item.prop else (f"{item.costume}" if item.costume else item.custom_notes),
            custom_notes=item.custom_notes,
            is_continuity_critical=item.is_continuity_critical,
            scene_id=item.scene_id
        )
        for item in items
    ]
"""

# Inject before breakdown_router.get("/catalogs/{project_id}")
if "def get_project_locations" not in text:
    text = text.replace("@breakdown_router.get(\"/catalogs/{project_id}\", response=CatalogsOut)", routes + "\n@breakdown_router.get(\"/catalogs/{project_id}\", response=CatalogsOut)")

with open('backend/config/api.py', 'w', encoding='utf-8') as f:
    f.write(text)

print('Added catalog endpoints to api.py')
