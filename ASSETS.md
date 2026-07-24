# Image provenance

Every image in `static/images/` is sourced from **Wikimedia Commons** under a
free licence, not from image search or a press agency.

That is a deliberate choice. Press and event photography carries its own
copyright held by the photographer or agency (Getty, PTI, and others), entirely
separate from any personality-rights question about the subject — and agencies
enforce it. Commons images are licensed for reuse, so the only obligation is
attribution, which this file discharges. See PLAN.md §8.

Most of these are **CC BY 3.0**, which _requires_ visible credit. The `/about`
page carries that credit; do not remove it.

| File                  | Source                                                                                             | Licence   | Credit            |
| --------------------- | -------------------------------------------------------------------------------------------------- | --------- | ----------------- |
| `salman-2015.jpg`     | [Commons](https://commons.wikimedia.org/wiki/File%3ASalman_Khan_2015.jpg)                          | CC BY 3.0 | Bollywood Hungama |
| `salman-filmfare.jpg` | [Commons](https://commons.wikimedia.org/wiki/File%3ASalman_Khan_filmfare.jpg)                      | CC BY 3.0 | Bollywood Hungama |
| `salman-2023.jpg`     | [Commons](https://commons.wikimedia.org/wiki/File%3ASalman_Khan_in_2023_%281%29_%28cropped%29.jpg) | CC BY 3.0 | Bollywood Hungama |
| `salman-2012.jpg`     | [Commons](https://commons.wikimedia.org/wiki/File%3ASalman_Khan_in_May_2012.jpg)                   | CC BY 3.0 | Bollywood Hungama |
| `salman-eid.jpg`      | [Commons](https://commons.wikimedia.org/wiki/File%3ASalman_Khan_on_Eid.jpg)                        | CC BY 3.0 | Bollywood Hungama |
| `salman-snapped.jpg`  | [Commons](https://commons.wikimedia.org/wiki/File%3ASalman_Khan_snapped_1.jpg)                     | CC BY 3.0 | Bollywood Hungama |

## Adding more

Search Commons, not the open web:

```bash
curl -A "YourApp/1.0 (contact@example.com)" \
  "https://commons.wikimedia.org/w/api.php?action=query&format=json&generator=search&gsrsearch=SUBJECT&gsrnamespace=6&gsrlimit=30&prop=imageinfo&iiprop=url|extmetadata"
```

Wikimedia returns 403 without a descriptive User-Agent — set one.

Record every new file in the table above with its licence and credit. An image
without a row here should be treated as unlicensed and removed.
