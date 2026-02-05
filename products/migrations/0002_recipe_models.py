"""
No-op migration.

Previously this file introduced new recipe tables and removed RecipeItem.
It has been intentionally converted to a no-op to "roll back" that refactor
without breaking existing migration history.
"""

from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        ('products', '0001_initial'),
    ]

    operations = [
        migrations.RunPython(migrations.RunPython.noop, migrations.RunPython.noop),
    ]
