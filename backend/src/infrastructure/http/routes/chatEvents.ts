import type { FastifyInstance } from "fastify";
import type { ChatEvent } from "../../../application/services/ChatEventService";

const SSE_HEADERS = {
  "Content-Type": "text/event-stream",
  "Cache-Control": "no-cache",
  Connection: "keep-alive",
};

function formatSseEvent(event: ChatEvent): string {
  const eventName = event.type;
  const payload = JSON.stringify(event);
  return `event: ${eventName}\n` + `data: ${payload}\n\n`;
}

export function registerChatEventRoutes(app: FastifyInstance): void {
  app.get("/chats/:id/events", async (request, reply) => {
    const { id } = request.params as { id: string };

    reply.raw.writeHead(200, SSE_HEADERS);
    reply.raw.flushHeaders?.();
    reply.hijack();

    const send = (event: ChatEvent) => {
      reply.raw.write(formatSseEvent(event));
    };

    const unsubscribe = app.chatEventService.subscribe(id, send);
    const ping = setInterval(() => {
      if (!reply.raw.writableEnded) {
        reply.raw.write(`: ping ${Date.now()}\n\n`);
      }
    }, 15000);

    const cleanup = () => {
      clearInterval(ping);
      unsubscribe();
    };

    request.raw.on("close", cleanup);
    request.raw.on("error", cleanup);

    reply.raw.write(`: connected to chat ${id}\n\n`);
  });
}
