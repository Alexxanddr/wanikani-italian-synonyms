(() => {
  "use strict";

  const MARKER_ID = "wk-italian-synonyms-status";
  const NOTES_MARKER_ID = "wk-italian-notes-status";
  const DEFAULTS = { enabled: true, autoAdd: true, autoNotes: true };
  const NOTE_MAX_LENGTH = 500;
  const STABLE_FOR_MS = 800;
  const UI_LABELS = new Set([
    "primary",
    "primary meaning",
    "meaning",
    "meanings",
    "reading",
    "readings",
    "radical",
    "radicals",
    "context",
    "example",
    "examples"
  ]);
  const INVALID_TRANSLATIONS = new Set(["primary", "primario", "primaria"]);
  let processing = false;
  let lastKey = "";
  let candidateKey = "";
  let candidateSince = 0;
  let retryAfter = 0;
  let observerTimer;

  const normalize = (value) => value.replace(/\s+/g, " ").trim();

  function visible(element) {
    if (!element) return false;
    const style = getComputedStyle(element);
    return style.display !== "none" && style.visibility !== "hidden" && element.getClientRects().length > 0;
  }

  function textMatches(element, pattern) {
    return visible(element) && pattern.test(normalize(element.textContent || ""));
  }

  function findByText(selector, pattern, root = document) {
    return [...root.querySelectorAll(selector)].find((element) => textMatches(element, pattern));
  }

  function getSubject() {
    const candidates = [
      "[data-testid='subject-character']",
      ".character-header__characters",
      ".subject-character",
      "header h1",
      "main h1"
    ];
    for (const selector of candidates) {
      const element = document.querySelector(selector);
      if (visible(element) && normalize(element.textContent || "")) return normalize(element.textContent);
    }
    return "";
  }

  function getPrimaryMeaning() {
    const candidates = [
      "div.character-header__meaning",
      "[data-testid='subject-meaning']"
    ];
    for (const selector of candidates) {
      const element = document.querySelector(selector);
      const text = element && visible(element) ? normalize(element.textContent || "") : "";
      if (
        text &&
        /^[A-Za-z][A-Za-z ,'-]*$/.test(text) &&
        !UI_LABELS.has(text.toLocaleLowerCase("en"))
      ) return text;
    }
    return "";
  }

  function getSynonymsSection() {
    const exactSection = document.querySelector("#user_synonyms");
    if (visible(exactSection)) return exactSection;
    const heading = findByText("h1,h2,h3,h4,legend", /^User Synonyms$/i);
    return heading?.closest("section,article,div") || null;
  }

  function findHeading(label) {
    return findByText("h1,h2,h3,h4,h5,h6", new RegExp(`^${label}$`, "i"));
  }

  function headingLevel(heading) {
    return Number(heading?.tagName.slice(1)) || 6;
  }

  function nextHeading(heading, sameOrHigherOnly = false) {
    const level = headingLevel(heading);
    return [...document.querySelectorAll("h1,h2,h3,h4,h5,h6")].find((candidate) =>
      heading.compareDocumentPosition(candidate) & Node.DOCUMENT_POSITION_FOLLOWING &&
      (!sameOrHigherOnly || headingLevel(candidate) <= level)
    ) || null;
  }

  function isBetween(element, start, end) {
    if (!element || !start) return false;
    const followsStart = Boolean(start.compareDocumentPosition(element) & Node.DOCUMENT_POSITION_FOLLOWING);
    const precedesEnd = !end || Boolean(element.compareDocumentPosition(end) & Node.DOCUMENT_POSITION_FOLLOWING);
    return followsStart && precedesEnd;
  }

  function textFollowingHeading(label) {
    const heading = findHeading(label);
    if (!heading) return "";
    const end = nextHeading(heading);
    const range = document.createRange();
    range.setStartAfter(heading);
    if (end) range.setEndBefore(end);
    else range.setEndAfter(document.body.lastChild || document.body);
    return normalize(range.toString());
  }

  function getMeaningContent() {
    return {
      mnemonic: textFollowingHeading("Meaning Mnemonic"),
      hint: textFollowingHeading("Hint")
    };
  }

  function currentSynonyms(section) {
    if (!section) return [];
    return [...section.querySelectorAll("li,button,span,a")]
      .map((element) => normalize(element.textContent || ""))
      .filter(Boolean);
  }

  async function translate(text) {
    if (!("Translator" in self)) {
      throw new Error("La Translator API non è disponibile in questa versione di Chrome.");
    }
    const options = { sourceLanguage: "en", targetLanguage: "it" };
    const availability = await Translator.availability(options);
    if (availability === "unavailable") {
      throw new Error("Il pacchetto di traduzione inglese→italiano non è disponibile.");
    }
    const translator = await Translator.create(options);
    try {
      return normalize(await translator.translate(text));
    } finally {
      translator.destroy?.();
    }
  }

  function setStatus(message, state = "working") {
    let status = document.getElementById(MARKER_ID);
    const section = getSynonymsSection();
    if (!section) return;
    if (!status) {
      status = document.createElement("div");
      status.id = MARKER_ID;
      section.append(status);
    }
    status.dataset.state = state;
    status.textContent = message;
  }

  function setNotesStatus(message, state = "working") {
    const heading = findHeading("Meaning Notes");
    if (!heading) return;
    let status = document.getElementById(NOTES_MARKER_ID);
    if (!status) {
      status = document.createElement("div");
      status.id = NOTES_MARKER_ID;
      heading.insertAdjacentElement("afterend", status);
    }
    status.dataset.state = state;
    status.textContent = message;
  }

  function findAddButton(section) {
    const exactButton = section.querySelector("a .wk-button__text")?.closest("a");
    if (visible(exactButton)) return exactButton;
    return [...section.querySelectorAll("button,a")].find((element) =>
      visible(element) && /add synonym|manage synonyms/i.test(normalize(element.textContent || ""))
    );
  }

  async function waitFor(getter, timeout = 3000) {
    const started = Date.now();
    while (Date.now() - started < timeout) {
      const result = getter();
      if (result) return result;
      await new Promise((resolve) => setTimeout(resolve, 80));
    }
    return null;
  }

  async function addSynonym(translation, section) {
    const existing = currentSynonyms(section);
    if (existing.some((value) => value.localeCompare(translation, "it", { sensitivity: "base" }) === 0)) {
      setStatus(`“${translation}” è già presente.`, "success");
      return;
    }

    let inlineInput = [...section.querySelectorAll("#synonym,input[type='text'],input:not([type]),textarea")].find(visible);
    if (!inlineInput) {
      const addButton = findAddButton(section);
      if (!addButton) throw new Error("Pulsante Add/Manage Synonyms non trovato.");
      addButton.click();
    }

    const editor = await waitFor(() => {
      const modal = document.querySelector("#modal");
      if (visible(modal)) return modal;
      inlineInput = [...section.querySelectorAll("#synonym,input[type='text'],input:not([type]),textarea")].find(visible);
      if (inlineInput) return section;
      return [...document.querySelectorAll("[role='dialog'],dialog,.modal")].find(visible);
    });
    if (!editor) throw new Error("Editor dei sinonimi non trovato.");

    const exactInput = editor.querySelector("#synonym");
    const input = visible(exactInput)
      ? exactInput
      : [...editor.querySelectorAll("input[type='text'],input:not([type]),textarea")].find(visible);
    if (!input) throw new Error("Campo del sinonimo non trovato.");

    input.focus();
    const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")?.set;
    if (input instanceof HTMLInputElement && setter) setter.call(input, translation);
    else input.value = translation;
    input.dispatchEvent(new Event("input", { bubbles: true }));
    input.dispatchEvent(new Event("change", { bubbles: true }));

    const exactConfirm = editor.querySelector("form fieldset:nth-of-type(2) button");
    const confirm = visible(exactConfirm)
      ? exactConfirm
      : [...editor.querySelectorAll("button,a,input[type='submit']")].find((element) =>
      visible(element) && (/^(add|save)$/i.test(normalize(element.textContent || element.value || "")) || element.type === "submit")
    );
    if (!confirm) throw new Error("Pulsante Add/Save non trovato.");
    confirm.click();

    await waitFor(() => currentSynonyms(section).some((value) =>
      value.localeCompare(translation, "it", { sensitivity: "base" }) === 0
    ));
    const closeButton = [
      ...editor.querySelectorAll(".user-synonyms__close-button a, .user-synonyms__close-button button, button, a")
    ].find((element) => visible(element) && /^(done|close)$/i.test(normalize(element.textContent || "")));
    if (visible(closeButton)) closeButton.click();
    setStatus(`Aggiunto: ${translation}`, "success");
  }

  function truncateAtWord(text, maximum) {
    if (text.length <= maximum) return text;
    const shortened = text.slice(0, Math.max(0, maximum - 1));
    const boundary = shortened.lastIndexOf(" ");
    return `${shortened.slice(0, boundary > maximum * 0.7 ? boundary : shortened.length).trim()}…`;
  }

  function composeNote(mnemonic, hint) {
    const prefix = "MNEMONICO:\n";
    const divider = "\n\n──────────\n\nSUGGERIMENTO:\n";
    const available = NOTE_MAX_LENGTH - prefix.length - divider.length;
    const total = mnemonic.length + hint.length;
    if (total <= available) return `${prefix}${mnemonic}${divider}${hint}`;

    const hintBudget = Math.max(100, Math.round(available * hint.length / total));
    const mnemonicBudget = available - hintBudget;
    return `${prefix}${truncateAtWord(mnemonic, mnemonicBudget)}${divider}${truncateAtWord(hint, hintBudget)}`;
  }

  async function addMeaningNotes(mnemonic, hint) {
    const heading = findHeading("Meaning Notes");
    if (!heading) throw new Error("Sezione Meaning Notes non trovata.");
    const end = nextHeading(heading, true);
    const controls = () => [...document.querySelectorAll("button,a,input,textarea")]
      .filter((element) => visible(element) && isBetween(element, heading, end));
    const addButton = controls().find((element) =>
      /^add note$/i.test(normalize(element.textContent || element.value || ""))
    );

    if (!addButton) {
      setNotesStatus("Nota già presente: nessuna modifica effettuata.", "success");
      return;
    }

    addButton.click();
    const input = await waitFor(() => controls().find((element) => element instanceof HTMLTextAreaElement));
    if (!input) throw new Error("Campo Meaning Notes non trovato.");

    const note = composeNote(mnemonic, hint);
    input.focus();
    const setter = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, "value")?.set;
    if (setter) setter.call(input, note);
    else input.value = note;
    input.dispatchEvent(new Event("input", { bubbles: true }));
    input.dispatchEvent(new Event("change", { bubbles: true }));

    const save = controls().find((element) =>
      /^save$/i.test(normalize(element.textContent || element.value || ""))
    );
    if (!save) throw new Error("Pulsante Save di Meaning Notes non trovato.");
    save.click();
    await waitFor(() => !visible(input));
    setNotesStatus("Mnemonic e Hint tradotti e aggiunti.", "success");
  }

  async function processItem() {
    if (processing) return;
    if (Date.now() < retryAfter) return;
    const settings = await chrome.storage.sync.get(DEFAULTS);
    if (!settings.enabled || (!settings.autoAdd && !settings.autoNotes)) return;

    const section = getSynonymsSection();
    const meaning = getPrimaryMeaning();
    const subject = getSubject();
    const { mnemonic, hint } = getMeaningContent();
    if (!meaning || !subject) return;
    if (settings.autoAdd && !section) return;
    if (settings.autoNotes && (!mnemonic || !hint)) return;

    const key = `${location.pathname}|${subject}|${meaning}`;
    if (key !== candidateKey) {
      candidateKey = key;
      candidateSince = Date.now();
      return;
    }
    if (Date.now() - candidateSince < STABLE_FOR_MS) return;
    if (key === lastKey) return;
    processing = true;
    try {
      if (settings.autoAdd) {
        setStatus(`Traduzione di “${meaning}”…`);
        const italian = await translate(meaning);
        if (!italian) throw new Error("La traduzione restituita è vuota.");
        if (INVALID_TRANSLATIONS.has(italian.toLocaleLowerCase("it"))) {
          throw new Error(`Traduzione ignorata perché non valida: “${italian}”.`);
        }
        await addSynonym(italian, section);
      }

      if (settings.autoNotes) {
        setNotesStatus("Traduzione di Mnemonic e Hint…");
        const [italianMnemonic, italianHint] = await Promise.all([
          translate(mnemonic),
          translate(hint)
        ]);
        await addMeaningNotes(italianMnemonic, italianHint);
      }
      lastKey = key;
    } catch (error) {
      console.error("[WaniKani Italian Synonyms]", error);
      setStatus(error instanceof Error ? error.message : String(error), "error");
      setNotesStatus(error instanceof Error ? error.message : String(error), "error");
      retryAfter = Date.now() + 5000;
    } finally {
      processing = false;
    }
  }

  function schedule() {
    clearTimeout(observerTimer);
    observerTimer = setTimeout(processItem, 250);
  }

  new MutationObserver(schedule).observe(document.documentElement, {
    childList: true,
    subtree: true,
    characterData: true
  });
  window.addEventListener("popstate", schedule);
  document.addEventListener("turbo:load", schedule);
  document.addEventListener("turbo:render", schedule);
  setInterval(schedule, 750);
  schedule();
})();
