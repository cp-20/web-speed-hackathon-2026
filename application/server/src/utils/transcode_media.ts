import { spawn } from "node:child_process";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import Encoding from "encoding-japanese";
import { fileTypeFromBuffer } from "file-type";

const UNKNOWN_ARTIST = "Unknown Artist";
const UNKNOWN_TITLE = "Unknown Title";
const MP3_EXTENSION = "mp3";
const MP3_MIME_TYPE = "audio/mpeg";

interface SoundConversionResult {
  artist: string;
  audio: Buffer;
  title: string;
}

interface SoundMetadata {
  artist: string;
  title: string;
}

function runFfmpeg(args: string[]): Promise<void> {
  return new Promise((resolve, reject) => {
    const ffmpeg = spawn("ffmpeg", [
      "-y",
      "-hide_banner",
      "-loglevel",
      "error",
      ...args,
    ]);
    let stderr = "";

    ffmpeg.stderr.on("data", (chunk: Buffer) => {
      stderr += chunk.toString("utf-8");
    });

    ffmpeg.on("close", (code) => {
      if (code === 0) {
        resolve();
        return;
      }

      reject(
        new Error(stderr.trim() || `ffmpeg exited with code ${String(code)}`),
      );
    });

    ffmpeg.on("error", (error) => {
      reject(error);
    });
  });
}

function parseFFmetadata(ffmetadata: string): Partial<SoundMetadata> {
  return Object.fromEntries(
    ffmetadata
      .split("\n")
      .filter((line) => !line.startsWith(";") && line.includes("="))
      .map((line) => {
        const separatorIndex = line.indexOf("=");
        const key = line.slice(0, separatorIndex).trim();
        const value = line.slice(separatorIndex + 1).trim();
        return [key, value] as const;
      }),
  ) as Partial<SoundMetadata>;
}

async function extractMetadataFromSound(data: Buffer): Promise<SoundMetadata> {
  const tmpDir = await mkdtemp(path.join(os.tmpdir(), "cax-sound-meta-"));
  const inputPath = path.join(tmpDir, "input");
  const metadataPath = path.join(tmpDir, "meta.txt");

  try {
    await writeFile(inputPath, data);

    await runFfmpeg(["-i", inputPath, "-f", "ffmetadata", metadataPath]);

    const output = await readFile(metadataPath);
    const outputUtf8 = Encoding.convert(output, {
      from: "AUTO",
      to: "UNICODE",
      type: "string",
    });
    const meta = parseFFmetadata(outputUtf8);

    return {
      artist: meta.artist ?? UNKNOWN_ARTIST,
      title: meta.title ?? UNKNOWN_TITLE,
    };
  } catch {
    return {
      artist: UNKNOWN_ARTIST,
      title: UNKNOWN_TITLE,
    };
  } finally {
    await rm(tmpDir, { force: true, recursive: true });
  }
}

export async function convertMovieToMp4(data: Buffer): Promise<Buffer> {
  const tmpDir = await mkdtemp(path.join(os.tmpdir(), "cax-movie-"));
  const inputPath = path.join(tmpDir, "input");
  const outputPath = path.join(tmpDir, "output.mp4");

  try {
    await writeFile(inputPath, data);

    await runFfmpeg([
      "-i",
      inputPath,
      "-t",
      "5",
      "-r",
      "10",
      "-vf",
      "crop='min(iw,ih)':'min(iw,ih)',scale=600:600,format=yuv420p",
      "-c:v",
      "libx264",
      "-crf",
      "22",
      "-preset",
      "ultrafast",
      "-movflags",
      "+faststart",
      "-an",
      outputPath,
    ]);

    return await readFile(outputPath);
  } finally {
    await rm(tmpDir, { force: true, recursive: true });
  }
}

export async function convertSoundToMp3(
  data: Buffer,
): Promise<SoundConversionResult> {
  const metadata = await extractMetadataFromSound(data);
  const artist = metadata.artist;
  const title = metadata.title;
  const inputType = await fileTypeFromBuffer(data);

  // MP3 は再エンコードせずそのまま返してアップロードを高速化する。
  if (
    inputType?.ext === MP3_EXTENSION ||
    inputType?.mime === MP3_MIME_TYPE
  ) {
    return {
      artist,
      audio: data,
      title,
    };
  }

  const tmpDir = await mkdtemp(path.join(os.tmpdir(), "cax-sound-"));
  const inputPath = path.join(tmpDir, "input");
  const outputPath = path.join(tmpDir, "output.mp3");

  try {
    await writeFile(inputPath, data);

    await runFfmpeg([
      "-i",
      inputPath,
      "-metadata",
      `artist=${artist}`,
      "-metadata",
      `title=${title}`,
      "-vn",
      outputPath,
    ]);

    return {
      artist,
      audio: await readFile(outputPath),
      title,
    };
  } finally {
    await rm(tmpDir, { force: true, recursive: true });
  }
}
