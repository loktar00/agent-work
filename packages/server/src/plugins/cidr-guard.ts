import type { FastifyPluginAsync } from "fastify";
import fp from "fastify-plugin";
import { networkInterfaces } from "node:os";

function ipToLong(ip: string): number {
  return ip
    .split(".")
    .reduce((acc, octet) => (acc << 8) + parseInt(octet, 10), 0) >>> 0;
}

function parseCidr(cidr: string): { network: number; mask: number } {
  const [ip, bits] = cidr.split("/");
  const mask = bits ? (~0 << (32 - parseInt(bits, 10))) >>> 0 : 0xffffffff;
  return { network: ipToLong(ip) & mask, mask };
}

function isIpInCidr(ip: string, cidr: string): boolean {
  const { network, mask } = parseCidr(cidr);
  return (ipToLong(ip) & mask) === network;
}

function extractIp(raw: string): string {
  if (raw.startsWith("::ffff:")) return raw.slice(7);
  if (raw === "::1") return "127.0.0.1";
  return raw;
}

const cidrGuard: FastifyPluginAsync<{ allowedCidrs?: string[] }> = async (
  fastify,
  opts,
) => {
  if (!opts.allowedCidrs || opts.allowedCidrs.length === 0) return;

  const cidrs = opts.allowedCidrs;

  fastify.addHook("onRequest", async (request, reply) => {
    const ip = extractIp(request.ip);
    const allowed = cidrs.some((cidr) => isIpInCidr(ip, cidr));
    if (!allowed) {
      reply.code(403).send({ error: "Forbidden", message: "IP not allowed" });
    }
  });
};

export default fp(cidrGuard, { name: "cidr-guard" });
