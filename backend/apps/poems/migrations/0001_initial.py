from django.db import migrations, models
import django.contrib.postgres.indexes
import django.contrib.postgres.search
import django.db.models.deletion


class Migration(migrations.Migration):

    initial = True

    dependencies = [
        ('authors', '0001_initial'),
    ]

    operations = [
        migrations.CreateModel(
            name='Poem',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('title', models.CharField(db_index=True, max_length=255)),
                ('text', models.TextField()),
                ('views', models.PositiveIntegerField(db_index=True, default=0)),
                ('search_vector', django.contrib.postgres.search.SearchVectorField(null=True)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('author', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='poems', to='authors.author')),
            ],
            options={
                'ordering': ['id'],
            },
        ),
        migrations.CreateModel(
            name='PoemView',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('user_hash', models.CharField(db_index=True, max_length=64)),
                ('viewed_at', models.DateTimeField(auto_now_add=True)),
                ('viewed_date', models.DateField(db_index=True)),
                ('poem', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='views_log', to='poems.poem')),
            ],
        ),
        migrations.AddIndex(
            model_name='poem',
            index=django.contrib.postgres.indexes.GinIndex(fields=['search_vector'], name='poems_search_gin'),
        ),
        migrations.AddConstraint(
            model_name='poemview',
            constraint=models.UniqueConstraint(fields=('poem', 'user_hash', 'viewed_date'), name='uniq_poem_view_per_day'),
        ),
    ]
