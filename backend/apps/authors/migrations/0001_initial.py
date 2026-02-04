from django.db import migrations, models
import django.contrib.postgres.indexes
import django.contrib.postgres.search


class Migration(migrations.Migration):

    initial = True

    dependencies = []

    operations = [
        migrations.CreateModel(
            name='Author',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('full_name', models.CharField(db_index=True, max_length=255)),
                ('birth_date', models.DateField(blank=True, null=True)),
                ('death_date', models.DateField(blank=True, null=True)),
                ('photo', models.ImageField(blank=True, null=True, upload_to='authors/')),
                ('photo_url', models.URLField(blank=True, null=True)),
                ('biography_md', models.TextField(blank=True, null=True)),
                ('search_vector', django.contrib.postgres.search.SearchVectorField(null=True)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
            ],
            options={
                'ordering': ['full_name'],
            },
        ),
        migrations.AddIndex(
            model_name='author',
            index=django.contrib.postgres.indexes.GinIndex(fields=['search_vector'], name='authors_search_gin'),
        ),
    ]
