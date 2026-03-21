import bodyParser from "body-parser";
import Express from "express";

import { apiRouter } from "@web-speed-hackathon-2026/server/src/routes/api";
import { staticRouter } from "@web-speed-hackathon-2026/server/src/routes/static";
import { sessionMiddleware } from "@web-speed-hackathon-2026/server/src/session";

export const app = Express();

app.set("trust proxy", true);

app.use(sessionMiddleware);
app.use(bodyParser.json());
app.use(
  bodyParser.raw({
    inflate: true,
    limit: "10mb",
    type: "application/octet-stream",
  }),
);

app.use("/api/v1", apiRouter);
app.use(staticRouter);
