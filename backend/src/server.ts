import Fastify from "fastify";
import { openDatabase } from "./infrastructure/sqlite/db";
import { CharacterRepositorySqlite } from "./infrastructure/sqlite/CharacterRepositorySqlite";
import { CharacterService } from "./application/services/CharacterService";

declare module "fastify" {
  interface FastifyInstance {
    characterService: CharacterService;
  }
}

async function buildApp() {
  const db = openDatabase();
  const characterRepository = new CharacterRepositorySqlite(db);
  const characterService = new CharacterService(characterRepository);

  const app = Fastify({
    logger: true,
  });

  app.decorate("characterService", characterService);

  app.get("/health", async () => {
    return { status: "ok" };
  });

  return app;
}

async function start() {
  const app = await buildApp();

  const port = Number(process.env.PORT ?? 3000);

  try {
    const address = await app.listen({ port, host: "0.0.0.0" });
    app.log.info(`Server listening at ${address}`);
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
}

start();
