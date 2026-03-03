import type { FastifyPluginAsync, FastifyReply } from "fastify";
import fp from "fastify-plugin";
import { EventEmitter } from "node:events";

declare module "fastify" {
  interface FastifyInstance {
    sse: {
      emitter: EventEmitter;
      emit(channel: string, event: string, data: unknown): void;
    };
  }
}

const ssePlugin: FastifyPluginAsync = async (fastify) => {
  const emitter = new EventEmitter();
  emitter.setMaxListeners(200);

  fastify.decorate("sse", {
    emitter,
    emit(channel: string, event: string, data: unknown) {
      emitter.emit(channel, { event, data });
    },
  });
};

export default fp(ssePlugin, { name: "sse" });

export function sseStream(
  reply: FastifyReply,
  emitter: EventEmitter,
  channel: string,
): void {
  reply.raw.writeHead(200, {
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache",
    Connection: "keep-alive",
  });

  const handler = (msg: { event: string; data: unknown }) => {
    reply.raw.write(`event: ${msg.event}\ndata: ${JSON.stringify(msg.data)}\n\n`);
  };

  emitter.on(channel, handler);

  const keepAlive = setInterval(() => {
    reply.raw.write(": keepalive\n\n");
  }, 15000);

  reply.raw.on("close", () => {
    clearInterval(keepAlive);
    emitter.off(channel, handler);
  });
}
