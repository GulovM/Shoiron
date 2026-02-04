from django.db.models import Count

from .models import Reaction


REACTION_TYPES = [r[0] for r in Reaction.TYPE_CHOICES]


def get_reaction_counts(poem_id):
    counts = {key: 0 for key in REACTION_TYPES}
    rows = Reaction.objects.filter(poem_id=poem_id).values('type').annotate(c=Count('id'))
    for row in rows:
        counts[row['type']] = row['c']
    return counts


def get_user_flags(poem_id, user_hash):
    flags = {key: False for key in REACTION_TYPES}
    if not user_hash:
        return flags
    rows = Reaction.objects.filter(poem_id=poem_id, user_hash=user_hash).values_list('type', flat=True)
    for rtype in rows:
        flags[rtype] = True
    return flags
