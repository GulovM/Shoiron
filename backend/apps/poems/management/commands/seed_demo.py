from datetime import date
import random

from django.core.management.base import BaseCommand

from apps.authors.models import Author
from apps.poems.models import Poem


TAJIK_LINES = [
    'Ҳар кӣ дар ин роҳ қадам мезанад, сухан мегӯяд.',
    'Дар дил чароғи муҳаббат фурӯзон аст.',
    'Шабҳои дароз ба хотири субҳҳои равшан.',
]


class Command(BaseCommand):
    help = 'Seed demo authors and poems.'

    def add_arguments(self, parser):
        parser.add_argument('--force', action='store_true', help='Clear existing data before seeding')

    def handle(self, *args, **options):
        force = options.get('force')
        if Author.objects.exists() and not force:
            self.stdout.write(self.style.WARNING('Data already exists. Use --force to reseed.'))
            return

        if force:
            Poem.objects.all().delete()
            Author.objects.all().delete()

        authors_data = [
            {
                'full_name': 'Абулқосим Фирдавсӣ',
                'birth_date': date(940, 1, 1),
                'death_date': date(1020, 1, 1),
                'biography_md': 'Классик персидской поэзии, автор «Шахнаме».',
            },
            {
                'full_name': 'Рудаки',
                'birth_date': date(858, 1, 1),
                'death_date': date(941, 1, 1),
                'biography_md': 'Основоположник таджикской литературы.',
            },
            {
                'full_name': 'Омар Хайям',
                'birth_date': date(1048, 1, 1),
                'death_date': date(1131, 1, 1),
                'biography_md': 'Поэт, философ и математик.',
            },
            {
                'full_name': 'Мирзо Турсунзода',
                'birth_date': date(1911, 5, 2),
                'death_date': date(1977, 9, 24),
                'biography_md': 'Поэт XX века, общественный деятель.',
            },
            {
                'full_name': 'Лоиқ Шералӣ',
                'birth_date': date(1941, 5, 20),
                'death_date': date(2000, 6, 30),
                'biography_md': 'Один из крупнейших таджикских поэтов современности.',
            },
        ]

        authors = [Author.objects.create(**data) for data in authors_data]

        poem_samples = [
            ('Субҳи нав', 'Субҳи нав омад\nБоди нарм дар дарё\nРӯшноӣ ба дил'),
            ('Садои дил', 'Садои дил мешунавад\nКасе, ки ором аст'),
            ('Чашмаи нур', 'Чашмаи нур дар дил\nҲамеша ҷорист'),
            ('Роҳи умед', 'Умед роҳи равшан аст\nБа сӯи фардо'),
            ('Шеъри кӯтоҳ', 'Як мисраъ\nЯк орзу\nЯк ҷаҳон'),
            ('Дуо', 'Дар лаб дуо\nДар дил оромӣ'),
        ]

        poems = []
        for i in range(30):
            author = authors[i % len(authors)]
            title, text = random.choice(poem_samples)
            extra = '\n'.join(random.sample(TAJIK_LINES, k=2))
            poem = Poem.objects.create(
                author=author,
                title=f'{title} {i + 1}',
                text=f'{text}\n{extra}',
                views=random.randint(0, 500),
            )
            poems.append(poem)

        self.stdout.write(self.style.SUCCESS(f'Seeded {len(authors)} authors and {len(poems)} poems.'))