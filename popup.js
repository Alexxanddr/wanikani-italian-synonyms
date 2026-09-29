const defaults = { enabled: true, autoAdd: true, autoNotes: true, autoReadingNotes: true };

async function load() {
  const settings = await chrome.storage.sync.get(defaults);
  for (const [key, value] of Object.entries(settings)) {
    const element = document.getElementById(key);
    if (element) element.checked = value;
  }
}

document.addEventListener("change", async (event) => {
  if (event.target instanceof HTMLInputElement) {
    await chrome.storage.sync.set({ [event.target.id]: event.target.checked });
  }
});

load();
