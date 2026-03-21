import { promises as fs } from "fs";
import path from "path";

import { Router } from "express";
import exifr from "exifr";
import httpErrors from "http-errors";
import sharp from "sharp";
import { v4 as uuidv4 } from "uuid";

import { UPLOAD_PATH } from "@web-speed-hackathon-2026/server/src/paths";

// 変換した画像の拡張子
const EXTENSION = "webp";
const FULL_IMAGE_WIDTH = 600;
const WEBP_UPLOAD_QUALITY = 95;
const WEBP_UPLOAD_EFFORT = 0;

export const imageRouter = Router();

imageRouter.post("/images", async (req, res) => {
  if (req.session.userId === undefined) {
    throw new httpErrors.Unauthorized();
  }
  if (Buffer.isBuffer(req.body) === false) {
    throw new httpErrors.BadRequest();
  }

  const metadata = await sharp(req.body).metadata();
  if (metadata.width == null || metadata.height == null) {
    throw new httpErrors.BadRequest("Invalid image metadata");
  }

  const exif = await exifr.parse(req.body, true);
  const altRaw = exif?.ImageDescription;
  const alt = typeof altRaw === "string" ? altRaw : "";

  const fullSizeImage = await sharp(req.body)
    .resize({ width: FULL_IMAGE_WIDTH, fit: "cover" })
    .webp({ quality: WEBP_UPLOAD_QUALITY, effort: WEBP_UPLOAD_EFFORT })
    .withMetadata()
    .toBuffer();

  const imageId = uuidv4();

  const fullSizeFilePath = path.resolve(
    UPLOAD_PATH,
    `./images/${imageId}.${EXTENSION}`,
  );
  const halfSizeFilePath = path.resolve(
    UPLOAD_PATH,
    `./images/${imageId}-300.${EXTENSION}`,
  );
  await fs.mkdir(path.resolve(UPLOAD_PATH, "images"), { recursive: true });
  await Promise.all([
    fs.writeFile(fullSizeFilePath, fullSizeImage),
    // サーバーの処理を高速化するために、変換を1回で済ませる
    fs.writeFile(halfSizeFilePath, fullSizeImage),
  ]);

  return res.status(200).type("application/json").send({
    alt,
    height: metadata.height,
    id: imageId,
    width: metadata.width,
  });
});
