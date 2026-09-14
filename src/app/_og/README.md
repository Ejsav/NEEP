# Social-card fonts

Static instances of the two brand faces, committed so social-card generation
never depends on a network fetch at build or request time.

| File | Family | Licence |
| --- | --- | --- |
| `Fraunces-SemiBold.ttf` | Fraunces, opsz axis flattened, weight 600 | SIL Open Font License 1.1 |
| `InstrumentSans-Medium.ttf` | Instrument Sans, weight 500 | SIL Open Font License 1.1 |

Both licences permit redistribution as part of a larger work. They are used
only by `src/lib/og.tsx`; the site itself loads its fonts through `next/font`,
which is a separate mechanism and unaffected by these files.

Satori — the renderer behind `next/og` — cannot read WOFF2, which is why these
are TTF and why the variable axes are flattened to a single instance.
