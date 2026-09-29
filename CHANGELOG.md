# Changelog

Il formato segue [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) e il progetto usa [Semantic Versioning](https://semver.org/).

## [Unreleased]

## [0.3.1] - 2026-09-29

### Fixed

- Supporto alle pagine dei vocaboli che usano `Meaning Explanation` al posto di `Meaning Mnemonic`.
- L'assenza dell'Hint non blocca più la traduzione della spiegazione o l'elaborazione del sinonimo.

## [0.3.0] - 2026-09-29

### Added

- Traduzione automatica di Meaning Mnemonic e Hint nelle Meaning Notes.
- Separazione visiva delle due traduzioni e rispetto del limite di 500 caratteri.
- Impostazione dedicata nel popup per attivare o disattivare le note tradotte.
- Protezione delle Meaning Notes già compilate dall'utente.

## [0.2.1] - 2026-09-29

### Fixed

- Supporto per il nuovo editor dei sinonimi mostrato direttamente nella sezione `User Synonyms`, oltre alla precedente finestra modale.
- Riconoscimento dei controlli `Add` e `Done` quando WaniKani li presenta come link.

## [0.2.0] - 2026-09-29

### Added

- Traduzione locale inglese→italiano tramite la Translator API di Chrome.
- Inserimento automatico negli User Synonyms di WaniKani.
- Popup per controllare estensione e automazione.
- Stato dell'operazione visibile nella pagina.

### Fixed

- Rilevamento dei nuovi elementi senza refresh.
- Attesa della stabilizzazione del significato.
- Esclusione delle etichette `Primary`, `Primario` e `Primaria`.
- Prevenzione dei sinonimi duplicati.
