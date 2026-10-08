from django.db import connection
with connection.cursor() as cursor:
    cursor.execute("TRUNCATE shots_take CASCADE;")
    cursor.execute("TRUNCATE shots_shot CASCADE;")
    cursor.execute("TRUNCATE shots_camerasetup CASCADE;")
print("Tables truncated")
