import Fastify from "fastify";

const app = Fastify({
  logger: true,
});

app.get("/health", async () => {
  return { status: "ok" };
});

const port = Number(process.env.PORT ?? 3000);

app
  .listen({ port, host: "0.0.0.0" })
  .then((address) => {
    app.log.info(`Server listening at ${address}`);
  })
  .catch((err) => {
    app.log.error(err);
    process.exit(1);
  });

