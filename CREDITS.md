# Credits

Winnow is built on other people's work. This file lists every external thing the extension, the website, and the documentation depend on, with a link and a licence.

## The decision model

| What | Who | Link |
|---|---|---|
| Jev, the System One decision model that answers every typed question | TypeSafe AI | [typesafe.ai](https://typesafe.ai) |
| API documentation the client was written against | TypeSafe AI | [docs.typesafe.ai](https://docs.typesafe.ai) · [API reference](https://docs.typesafe.ai/api) · [Primitives](https://docs.typesafe.ai/primitives) · [jev-1.13 jaggedness](https://docs.typesafe.ai/model-jaggedness/jev-1.13) |
| Where you get a key | TypeSafe AI | [console.typesafe.ai](https://console.typesafe.ai) |

Winnow is not affiliated with TypeSafe AI. What the API actually does, as observed rather than as documented, is recorded in [`docs/jev-contract.md`](docs/jev-contract.md).

## Code

| What | Licence | Link |
|---|---|---|
| `@mozilla/readability` — article extraction | Apache-2.0 | [github.com/mozilla/readability](https://github.com/mozilla/readability) |
| Vite — build tool | MIT | [vite.dev](https://vite.dev) |
| `@crxjs/vite-plugin` — MV3 bundling | MIT | [crxjs.dev](https://crxjs.dev) |
| Vitest — test runner | MIT | [vitest.dev](https://vitest.dev) |
| happy-dom — DOM for tests | MIT | [github.com/capricorn86/happy-dom](https://github.com/capricorn86/happy-dom) |
| TypeScript | Apache-2.0 | [typescriptlang.org](https://www.typescriptlang.org) |
| tsx — TypeScript runner for scripts | MIT | [github.com/privatenumber/tsx](https://github.com/privatenumber/tsx) |

YouTube caption tracks are read through YouTube's own player endpoint from the page you are already on. No third-party service is involved.

## Typefaces

| Family | Used for | Licence | Link |
|---|---|---|---|
| Cabinet Grotesk | Display headlines on the website and the extension pages | ITF Free Font Licence | [fontshare.com/fonts/cabinet-grotesk](https://www.fontshare.com/fonts/cabinet-grotesk) |
| Inter | Body and interface text everywhere | SIL Open Font Licence 1.1 | [rsms.me/inter](https://rsms.me/inter/) · [Google Fonts](https://fonts.google.com/specimen/Inter) |
| JetBrains Mono | Labels, captions, code and numbers | SIL Open Font Licence 1.1 | [jetbrains.com/lp/mono](https://www.jetbrains.com/lp/mono/) |

The website loads these from [Fontshare](https://www.fontshare.com) and [Google Fonts](https://fonts.google.com). The extension pages bundle them locally instead, so opening a Winnow page makes no third-party request; see [`public/fonts/LICENSES.md`](public/fonts/LICENSES.md).

## Imagery

**Website, current.** The desert and oasis images on [winnow-seven.vercel.app](https://winnow-seven.vercel.app) and the social card were generated for this project with OpenAI's image model, from the prompts in [`docs/brand/GENERATION_PROMPTS.md`](docs/brand/GENERATION_PROMPTS.md). They are labelled "Generated for Winnow" where they appear. They depict no real place.

**Archived draft.** `site-oasis/` is an earlier draft of the site and uses photographs from Wikimedia Commons under Creative Commons licences. Attribution for each is in [`site-oasis/assets/photos/CREDITS.md`](site-oasis/assets/photos/CREDITS.md) and rendered on that page:

| Image | Photographer | Licence |
|---|---|---|
| Namib-Naukluft dunes at sunset | Yathin S Krishnappa | [CC BY-SA 3.0](https://creativecommons.org/licenses/by-sa/3.0/) |
| Dune 45, Sossusvlei | Giles Laurent | [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/) |
| Namib-Naukluft dune ridge | Buiobuione | [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/) |
| Namib Diamond Area dunes | Sonse | [CC BY 2.0](https://creativecommons.org/licenses/by/2.0/) |
| Huacachina from above | Jonathan M. Corredor O. | [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/) |
| Huacachina, wide | Diego Delso | [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/) |

Source pages for each file are in that same credits file.

## Brand

The Winnow mark, wordmark, palette, and design system are original to this project and documented in [`DESIGN.md`](DESIGN.md) and [`docs/brand/DESIGN.md`](docs/brand/DESIGN.md). The code is MIT licensed; the mark and wordmark are not, and identify this project.

## Hosting

The website is deployed on [Vercel](https://vercel.com) from the `site/` folder of this repository. Releases are built and published by GitHub Actions.
