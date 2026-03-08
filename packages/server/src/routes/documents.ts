import type { FastifyPluginAsync } from "fastify";
import {
  createBoardDocumentSchema,
  updateBoardDocumentSchema,
} from "@agent-board/shared";

const documentRoutes: FastifyPluginAsync = async (fastify) => {
  const svc = fastify.services.documents;

  // List all document sections for a board
  fastify.get<{ Params: { boardId: string } }>(
    "/boards/:boardId/documents",
    async (req) => {
      return svc.listByBoard(req.params.boardId);
    },
  );

  // Get a specific section by key
  fastify.get<{ Params: { boardId: string; section: string } }>(
    "/boards/:boardId/documents/:section",
    async (req, reply) => {
      const doc = svc.getByBoardAndSection(
        req.params.boardId,
        req.params.section,
      );
      if (!doc) return reply.code(404).send({ error: "Document section not found" });
      return doc;
    },
  );

  // Create a new document section
  fastify.post<{ Params: { boardId: string } }>(
    "/boards/:boardId/documents",
    async (req, reply) => {
      const input = createBoardDocumentSchema.parse({
        ...(req.body as object),
        boardId: req.params.boardId,
      });
      const doc = svc.create(input);
      fastify.services.audit.log({
        boardId: req.params.boardId,
        entity: "document",
        entityId: doc.id,
        action: "create",
        actorType: input.updatedBy ? "agent" : "human",
        actorId: input.updatedBy ?? "system",
      });
      fastify.sse.emit(`board:${req.params.boardId}`, "document:created", doc);
      return reply.code(201).send(doc);
    },
  );

  // Update a document section
  fastify.patch<{ Params: { id: string } }>(
    "/documents/:id",
    async (req, reply) => {
      const input = updateBoardDocumentSchema.parse(req.body);
      const doc = svc.update(req.params.id, input);
      if (!doc) return reply.code(404).send({ error: "Document section not found" });
      fastify.services.audit.log({
        boardId: doc.boardId,
        entity: "document",
        entityId: doc.id,
        action: "update",
        actorType: input.updatedBy ? "agent" : "human",
        actorId: input.updatedBy ?? "system",
      });
      fastify.sse.emit(`board:${doc.boardId}`, "document:updated", doc);
      return doc;
    },
  );

  // Delete a document section
  fastify.delete<{ Params: { id: string } }>(
    "/documents/:id",
    async (req, reply) => {
      const existing = svc.getById(req.params.id);
      if (!existing) return reply.code(404).send({ error: "Document section not found" });
      svc.delete(req.params.id);
      fastify.services.audit.log({
        boardId: existing.boardId,
        entity: "document",
        entityId: existing.id,
        action: "delete",
        actorType: "human",
        actorId: "system",
      });
      fastify.sse.emit(`board:${existing.boardId}`, "document:deleted", { id: existing.id });
      return { success: true };
    },
  );
};

export default documentRoutes;
