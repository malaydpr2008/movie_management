import os
from django.db import connection

# Truncate and Drop the tables if they exist
with connection.cursor() as cursor:
    cursor.execute("DROP TABLE IF EXISTS shots_take CASCADE;")
    cursor.execute("DROP TABLE IF EXISTS shots_shot CASCADE;")
    cursor.execute("DROP TABLE IF EXISTS shots_camerasetup CASCADE;")
    # Delete from migrations history
    cursor.execute("DELETE FROM django_migrations WHERE app = 'shots';")

print("Tables dropped and migrations cleared.")
