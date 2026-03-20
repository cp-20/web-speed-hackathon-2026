import {
  ImageMagick,
  initializeImageMagick,
  MagickFormat,
} from "@imagemagick/magick-wasm";
import magickWasmUrl from "@imagemagick/magick-wasm/magick.wasm?url";
import { dump, ImageIFD, insert } from "piexifjs";

interface Options {
  extension: MagickFormat;
}

interface ConvertedImage {
  alt: string;
  blob: Blob;
}

export async function convertImage(
  file: File,
  options: Options,
): Promise<ConvertedImage> {
  const magickWasm = await fetch(magickWasmUrl).then((res) =>
    res.arrayBuffer()
  );
  await initializeImageMagick(new Uint8Array(magickWasm));

  const byteArray = new Uint8Array(await file.arrayBuffer());

  return new Promise((resolve) => {
    ImageMagick.read(byteArray, (img) => {
      img.format = options.extension;

      const alt = img.comment ?? "";

      img.write((output) => {
        if (alt === "") {
          resolve({
            alt,
            blob: new Blob([output as Uint8Array<ArrayBuffer>]),
          });
          return;
        }

        // ImageMagick では EXIF の ImageDescription フィールドに保存されているデータが
        // 非標準の Comment フィールドに移されてしまうため
        // piexifjs を使って ImageDescription フィールドに書き込む
        const binary = Array.from(output as Uint8Array<ArrayBuffer>)
          .map((b) => String.fromCharCode(b))
          .join("");
        const descriptionBinary = Array.from(new TextEncoder().encode(alt))
          .map((b) => String.fromCharCode(b))
          .join("");
        const exifStr = dump({
          "0th": { [ImageIFD.ImageDescription]: descriptionBinary },
        });
        const outputWithExif = insert(exifStr, binary);
        const bytes = Uint8Array.from(
          outputWithExif.split("").map((c) => c.charCodeAt(0)),
        );
        resolve({
          alt,
          blob: new Blob([bytes]),
        });
      });
    });
  });
}
