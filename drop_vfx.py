import os
from django.db import connection

with connection.cursor() as cursor:
    cursor.execute("DROP TABLE IF EXISTS shots_vfxshot CASCADE;")
    cursor.execute("DELETE FROM django_migrations WHERE app = 'shots';")

print("VfxShot table dropped.")
