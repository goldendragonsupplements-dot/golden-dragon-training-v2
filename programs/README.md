# Programi (Golden Dragon Training)

Svaki program je jedna datoteka `programs/<id>.json`. Aplikacija ih učitava tek kad zatrebaju,
a zadnji korišteni program učita odmah pri otvaranju. Ostale pripremi u pozadini, pa rade i bez interneta.

Nakon svake izmjene ili novog programa obavezno pokreni:

    node tools/build_programs.js

Skripta upiše novu verziju (hash) svakog programa u `index.html` (`PROGRAM_FILES`).
Bez toga mobiteli ne vide izmjenu, jer program čuvaju u memoriji prema verziji.
