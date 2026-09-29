# WaniKani Italian Synonyms

Estensione Chrome che traduce in italiano il significato principale degli elementi WaniKani, lo salva negli **User Synonyms** e aggiunge le traduzioni delle spiegazioni nei tab **Meaning** e **Reading**.

La traduzione usa la [Translator API integrata in Chrome](https://developer.chrome.com/docs/ai/translator-api): non richiede chiavi API, non prevede costi e non invia il testo a servizi di traduzione esterni.

## Funzionalità

- Rileva kanji, vocaboli e radicali durante le lezioni WaniKani.
- Traduce il significato principale dall'inglese all'italiano.
- Aggiunge la traduzione tramite l'interfaccia **User Synonyms** di WaniKani.
- Traduce Meaning Mnemonic o Meaning Explanation e, quando presente, l'Hint; li salva nelle Meaning Notes in blocchi riconoscibili.
- Traduce Reading Mnemonic o Reading Explanation e, quando presente, l'Hint nelle Reading Notes.
- Non modifica le Meaning Notes quando contengono già una nota personale.
- Rispetta automaticamente il limite di 500 caratteri imposto da WaniKani.
- Funziona durante la navigazione interna senza richiedere un refresh per ogni elemento.
- Evita sinonimi duplicati.
- Ignora etichette transitorie dell'interfaccia come `Primary`.
- Permette di disattivare l'estensione o l'inserimento automatico dal popup.

## Requisiti

- Google Chrome desktop 138 o successivo.
- Un account WaniKani.
- Accesso alle pagine `wanikani.com`.

La prima traduzione può richiedere alcuni secondi perché Chrome deve scaricare il pacchetto linguistico inglese→italiano.

## Installazione manuale

1. Scarica l'archivio dell'ultima versione dalla pagina **Releases** e decomprimilo.
2. Apri `chrome://extensions`.
3. Attiva **Modalità sviluppatore**.
4. Seleziona **Carica estensione non pacchettizzata**.
5. Scegli la cartella estratta che contiene `manifest.json`.
6. Apri o ricarica una lezione WaniKani.

## Utilizzo

Durante una lezione apri la scheda **Meaning**. Quando appare la sezione **User Synonyms**, l'estensione:

1. attende che il nuovo soggetto sia completamente caricato;
2. traduce il significato mostrato nell'intestazione;
3. apre la finestra dei sinonimi;
4. inserisce e salva la traduzione;
5. chiude la finestra e mostra l'esito sotto **User Synonyms**.

Il popup dell'estensione contiene quattro opzioni:

- **Estensione attiva**: abilita o disabilita tutta l'estensione.
- **Aggiungi automaticamente**: controlla l'inserimento automatico dei sinonimi.
- **Traduci Mnemonic e Hint nelle note**: controlla la compilazione automatica delle Meaning Notes.
- **Traduci anche le Reading Notes**: controlla la traduzione automatica del tab Reading.

## Privacy

- Non sono raccolti dati personali o di navigazione.
- Non vengono usati analytics o server esterni.
- Il testo viene tradotto localmente dal modello linguistico di Chrome.
- Le sole preferenze salvate sono gli interruttori del popup, tramite `chrome.storage.sync`.

## Sviluppo

Il progetto usa Manifest V3 e non richiede dipendenze o una fase di build.

```bash
node --check content.js
node --check popup.js
python3 -m json.tool manifest.json >/dev/null
```

Per provare una modifica, premi **Ricarica** nella scheda dell'estensione in `chrome://extensions`, quindi ricarica la pagina WaniKani una sola volta per sostituire il content script già in memoria.

## Creare un pacchetto

Da macOS o Linux:

```bash
./scripts/package.sh
```

Il file ZIP viene creato nella directory `dist/`.

## Segnalazioni e contributi

Prima di aprire una issue, verifica che Chrome e l'estensione siano aggiornati. Per i bug, indica versione di Chrome, tipo di lezione, messaggio mostrato e passaggi per riprodurre il problema.

Le pull request sono benvenute; consulta [CONTRIBUTING.md](CONTRIBUTING.md).

## Licenza

Distribuito con licenza [MIT](LICENSE). Il progetto non è affiliato, sponsorizzato o approvato da WaniKani o Tofugu.
