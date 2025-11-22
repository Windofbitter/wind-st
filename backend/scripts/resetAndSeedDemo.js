const fs = require("fs");
const path = require("path");

// Use compiled JS + Windows-friendly better-sqlite3 build from dist/.
const { openDatabase } = require("../dist/infrastructure/sqlite/db");
const {
  CharacterRepositorySqlite,
} = require("../dist/infrastructure/sqlite/CharacterRepositorySqlite");
const {
  PresetRepositorySqlite,
} = require("../dist/infrastructure/sqlite/PresetRepositorySqlite");
const {
  PromptPresetRepositorySqlite,
} = require("../dist/infrastructure/sqlite/PromptPresetRepositorySqlite");
const {
  LorebookRepositorySqlite,
} = require("../dist/infrastructure/sqlite/LorebookRepositorySqlite");
const {
  LorebookEntryRepositorySqlite,
} = require("../dist/infrastructure/sqlite/LorebookEntryRepositorySqlite");
const {
  CharacterLorebookRepositorySqlite,
} = require("../dist/infrastructure/sqlite/CharacterLorebookRepositorySqlite");
const {
  CharacterService,
} = require("../dist/application/services/CharacterService");
const {
  LorebookService,
} = require("../dist/application/services/LorebookService");
const {
  PromptStackService,
} = require("../dist/application/services/PromptStackService");

const PROJECT_ROOT = path.resolve(__dirname, "..");
const CONFIG_PATH = path.resolve(PROJECT_ROOT, "config.json");
const DEFAULT_DB_PATH = path.resolve(PROJECT_ROOT, "data", "app.db");

function resolveDbPath() {
  try {
    if (fs.existsSync(CONFIG_PATH)) {
      const raw = fs.readFileSync(CONFIG_PATH, "utf-8");
      const parsed = JSON.parse(raw);
      const configured = parsed?.database?.sqlitePath;
      if (configured && typeof configured === "string") {
        return path.resolve(PROJECT_ROOT, configured);
      }
    }
  } catch {
    // Fall back to default path if config is missing or malformed.
  }
  return DEFAULT_DB_PATH;
}

function resetDatabaseFiles(dbPath) {
  fs.rmSync(dbPath, { force: true });
  fs.rmSync(`${dbPath}-shm`, { force: true });
  fs.rmSync(`${dbPath}-wal`, { force: true });
  const dir = path.dirname(dbPath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

async function main() {
  const dbPath = resolveDbPath();
  console.log(`[reset] Removing old database at ${dbPath}`);
  resetDatabaseFiles(dbPath);

  const db = openDatabase(); // Runs migrations
  const characterRepo = new CharacterRepositorySqlite(db);
  const presetRepo = new PresetRepositorySqlite(db);
  const promptPresetRepo = new PromptPresetRepositorySqlite(db);
  const lorebookRepo = new LorebookRepositorySqlite(db);
  const lorebookEntryRepo = new LorebookEntryRepositorySqlite(db);
  const characterLorebookRepo = new CharacterLorebookRepositorySqlite(db);

  const characterService = new CharacterService(characterRepo);
  const lorebookService = new LorebookService(
    lorebookRepo,
    lorebookEntryRepo,
  );
  const promptStackService = new PromptStackService(
    characterRepo,
    presetRepo,
    promptPresetRepo,
    lorebookRepo,
    characterLorebookRepo,
  );

  const character = await characterService.createCharacter({
    name: "Demo Hero",
    description: "Explorer of the seeded demo world.",
    persona:
      "You are Demo Hero, upbeat and concise. Mention the Golden Isles when relevant.",
    avatarPath: "/avatars/demo.png",
    creatorNotes: "Seed data",
  });

  const lorebook = await lorebookService.createLorebook({
    name: "Golden Isles",
    description: "A tiny sample lorebook for quick-edit testing.",
  });

  await lorebookService.createLorebookEntry(lorebook.id, {
    keywords: ["capital", "isles", "harbor"],
    content:
      "Aurora Bay is the bustling capital of the Golden Isles, known for its copper markets.",
    insertionOrder: 0,
    isEnabled: true,
  });

  await lorebookService.createLorebookEntry(lorebook.id, {
    keywords: ["magic", "crystals"],
    content:
      "Windborne crystals power airships; they hum softly when storms are near.",
    insertionOrder: 1,
    isEnabled: true,
  });

  const staticPreset = await presetRepo.create({
    title: "System Primer",
    description: "Keep replies short and in-world.",
    kind: "static_text",
    content: "Stay concise, avoid spoilers, and keep tone adventurous.",
    builtIn: false,
    config: null,
  });

  await promptStackService.attachPresetToCharacter(character.id, {
    presetId: staticPreset.id,
    role: "system",
  });

  await promptStackService.attachPresetToCharacter(character.id, {
    kind: "lorebook",
    lorebookId: lorebook.id,
    role: "system",
  });

  const stack = await promptStackService.getPromptStackForCharacter(
    character.id,
  );

  console.log("[seed] Character:", character);
  console.log("[seed] Lorebook:", lorebook);
  console.log("[seed] Stack entries:", stack);

  db.close();
  console.log("[done] Database reset and demo data seeded.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
