import os
import sys
import django
from django.utils.text import slugify

# Setup Django environment
sys.path.append(os.path.join(os.path.dirname(__file__), 'backend'))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'LAMS.settings')
django.setup()

from organizations.models import Organization

def backfill_slugs():
    seen = set(
        Organization.objects.exclude(sub_domain='').exclude(sub_domain__isnull=True)
        .values_list('sub_domain', flat=True)
    )
    for org in Organization.objects.filter(sub_domain__in=['', None]).order_by('id'):
        base = slugify(org.name) or f'org-{org.id}'
        candidate = base
        suffix = 2
        while candidate in seen:
            candidate = f'{base}-{suffix}'
            suffix += 1
        org.sub_domain = candidate
        org.save(update_fields=['sub_domain'])
        seen.add(candidate)
        print(f"Backfilled org {org.id} ({org.name}) with slug: {candidate}")

if __name__ == '__main__':
    backfill_slugs()
    print("Backfill complete. You can now modify the model to make sub_domain a SlugField with unique=True")
