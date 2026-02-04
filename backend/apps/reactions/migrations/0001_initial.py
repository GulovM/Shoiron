from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    initial = True

    dependencies = [
        ('poems', '0001_initial'),
    ]

    operations = [
        migrations.CreateModel(
            name='Reaction',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('type', models.CharField(choices=[('heart', 'Heart'), ('fire', 'Fire'), ('like', 'Like'), ('sad', 'Sad'), ('star', 'Star')], db_index=True, max_length=10)),
                ('user_hash', models.CharField(db_index=True, max_length=64)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('poem', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='reactions', to='poems.poem')),
            ],
        ),
        migrations.AddConstraint(
            model_name='reaction',
            constraint=models.UniqueConstraint(fields=('poem', 'type', 'user_hash'), name='uniq_reaction_per_user_type'),
        ),
    ]
