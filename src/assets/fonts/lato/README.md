# Lato 2.015

Copyright (c) 2011-2015 by tyPoland Lukasz Dziedzic (http://www.typoland.com/) with Reserved Font Name "Lato". Licensed under the SIL Open Font License, Version 1.1 (https://openfontlicense.org).

Source: the official Lato 2.015 web build (npm `lato-font@3.0.0`, from latofonts.com). This is used instead of the Google Fonts / Fontsource build because that build has no Cyrillic.

The files here are subsets made with `fontTools.subset` and contain Basic Latin, Latin-1, Latin Extended-A, Cyrillic (U+0400–045F plus Ґ and Ү), general punctuation, € and №. They are named by weight (400, 700, 900). To regenerate them, rerun the subset with the same `--unicodes` list against `fonts/lato-{normal,bold,black}/*.woff2` from that package.
