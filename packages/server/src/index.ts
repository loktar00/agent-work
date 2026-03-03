import { loadConfig } from "./config.js";
import { buildApp } from "./app.js";

async function main() {
  const config = loadConfig();
  const app = await buildApp(config);

  try {
    await app.listen({ host: config.server.host, port: config.server.port });
    console.log(
      `Agent Board server listening on ${config.server.host}:${config.server.port}`,
    );
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
}

main();
