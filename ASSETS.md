# Image provenance

| File                               | Source                                                                     | Notes                                                                                                                                  |
| ---------------------------------- | -------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| `static/images/salman-avatar.jpg`  | `pbs.twimg.com` — the @BeingSalmanKhan profile picture, full-size original | 400×400. The single avatar everywhere: tweet cards, header, hero, and the OG share card.                                               |
| `src/lib/assets/salman-avatar.jpg` | Same file                                                                  | Duplicated into `src/` so Vite can inline it as a data URI for the OG renderer, which has no network access and cannot read `static/`. |

## Film posters

`static/images/films/*.jpg` — ten posters (Kick, Wanted, Dabangg, Dabangg 2,
Bodyguard, Ready, Tere Naam, Jai Ho, Saajan, Andaz Apna Apna), sourced from the
corresponding English Wikipedia articles.

**These are not free images.** Wikipedia hosts them under a **fair use / non-free**
rationale written for the encyclopedia article specifically; that rationale does
not transfer to this site. Copyright sits with the studios and distributors, not
Wikipedia. They are used here as thumbnail-scale illustration alongside quoted
dialogue on a non-commercial fan page — common fan-site practice, but a
materially different risk class from the avatar, since posters are studios'
commercial marketing assets and studios do issue takedowns.

The clean alternative is **TMDB**: a free API key, and their terms explicitly
permit poster use in applications provided you display "This product uses the
TMDB API but is not endorsed or certified by TMDB." Swapping is a small change —
the poster path is one field on each entry in `src/lib/dialogues.ts`.

Kept at Wikipedia's deliberately low resolution (~220–260px wide), which is
ample at the ~88px display size and keeps the fair-use posture defensible.

## Resolution

The project owner originally supplied this image at 48×48 — the `_normal`
variant X serves for inline avatars. At 48px it was visibly soft anywhere
larger than a list avatar, and badly so at the 112px hero and 76px OG sizes.

X stores the same upload at several sizes; stripping the `_normal` suffix from
the URL returns the original, which is 400×400 — about 8× the pixel data, and
enough for the 112px hero even on a 2× display. Same photograph, just not
upscaled.

Intrinsic `width`/`height` attributes are set to 2× the CSS display size so
high-density screens receive real pixels rather than interpolation.

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
