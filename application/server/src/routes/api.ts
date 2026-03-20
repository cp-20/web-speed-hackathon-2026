import { NextFunction, Request, Response, Router } from "express";
import httpErrors from "http-errors";
import { ValidationError } from "sequelize";

import { authRouter } from "@web-speed-hackathon-2026/server/src/routes/api/auth";
import { crokRouter } from "@web-speed-hackathon-2026/server/src/routes/api/crok";
import { directMessageRouter } from "@web-speed-hackathon-2026/server/src/routes/api/direct_message";
import { imageRouter } from "@web-speed-hackathon-2026/server/src/routes/api/image";
import { initializeRouter } from "@web-speed-hackathon-2026/server/src/routes/api/initialize";
import { movieRouter } from "@web-speed-hackathon-2026/server/src/routes/api/movie";
import { postRouter } from "@web-speed-hackathon-2026/server/src/routes/api/post";
import { searchRouter } from "@web-speed-hackathon-2026/server/src/routes/api/search";
import { soundRouter } from "@web-speed-hackathon-2026/server/src/routes/api/sound";
import { userRouter } from "@web-speed-hackathon-2026/server/src/routes/api/user";
import {
  getInvalidationTagsForApiWrite,
  invalidateAllSsrCache,
  invalidateSsrCacheByTags,
} from "@web-speed-hackathon-2026/server/src/routes/ssr_cache";

export const apiRouter = Router();

apiRouter.use((req: Request, res: Response, next: NextFunction) => {
  const method = req.method.toUpperCase();
  const isMutationMethod = method === "POST" || method === "PUT" ||
    method === "PATCH" || method === "DELETE";

  if (!isMutationMethod) {
    return next();
  }

  res.on("finish", () => {
    if (res.statusCode >= 400) {
      return;
    }

    const activeUser = (req as any).user ?? null;
    const invalidation = getInvalidationTagsForApiWrite({
      apiPath: req.path,
      activeUser,
    });

    if (invalidation === "all") {
      invalidateAllSsrCache();
      return;
    }

    invalidateSsrCacheByTags(invalidation);
  });

  next();
});

apiRouter.use(initializeRouter);
apiRouter.use(userRouter);
apiRouter.use(postRouter);
apiRouter.use(directMessageRouter);
apiRouter.use(searchRouter);
apiRouter.use(movieRouter);
apiRouter.use(imageRouter);
apiRouter.use(soundRouter);
apiRouter.use(authRouter);
apiRouter.use(crokRouter);

apiRouter.use(
  async (err: Error, _req: Request, _res: Response, _next: NextFunction) => {
    if (err instanceof ValidationError) {
      throw new httpErrors.BadRequest();
    }
    throw err;
  },
);

apiRouter.use(
  async (err: Error, _req: Request, res: Response, _next: NextFunction) => {
    if (!httpErrors.isHttpError(err) || err.status === 500) {
      console.error(err);
    }

    return res
      .status(httpErrors.isHttpError(err) ? err.status : 500)
      .type("application/json")
      .send({
        message: err.message,
      });
  },
);
