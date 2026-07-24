# Image provenance

| File                              | Source                        | Notes                                                                |
| --------------------------------- | ----------------------------- | -------------------------------------------------------------------- |
| `static/images/salman-avatar.png` | Supplied by the project owner | 48×48. The single avatar on every tweet card, and the hero portrait. |

That is the only image in the project.

## Why only one

An earlier revision pulled six portraits from Wikimedia Commons under CC BY.
Those were removed at the owner's request in favour of one consistent avatar —
which is also the better call visually, since every card represents posts by the
same account and rotating portraits read as different people.

Removing them also removed the CC BY attribution obligation those images carried,
so `/about` no longer needs a photo credit.

## If you add more

Prefer **Wikimedia Commons** over image search. Press and event photography
carries its own copyright held by the photographer or agency (Getty, PTI, and
others) entirely separately from any personality-rights question about the
subject, and agencies do enforce it. Commons images are licensed for reuse and
only require attribution.

```bash
curl -A "YourApp/1.0 (contact@example.com)" \
  "https://commons.wikimedia.org/w/api.php?action=query&format=json&generator=search&gsrsearch=SUBJECT&gsrnamespace=6&gsrlimit=30&prop=imageinfo&iiprop=url|extmetadata"
```

Wikimedia returns 403 without a descriptive User-Agent — set one.

Record every new file in the table above with its source and licence. Any image
without a row here should be treated as unlicensed and removed. If you add a
CC BY image, its credit must appear somewhere user-visible — that is a licence
condition, not a courtesy.
