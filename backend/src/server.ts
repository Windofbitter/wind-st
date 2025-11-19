import { buildApp } from "./infrastructure/http/app";

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
