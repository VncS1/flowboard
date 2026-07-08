import { config } from "dotenv";

config({ quiet: true });

const { buildApp } = await import("./app.js");

const app = buildApp();
const port = Number(process.env["PORT"] ?? 4000);

app
  .listen({ port, host: "0.0.0.0" })
  .then(() => {
    app.log.info(`server listening on port ${port}`);
  })
  .catch((error: unknown) => {
    app.log.error(error);
    process.exitCode = 1;
  });
