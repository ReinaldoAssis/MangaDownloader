import compress_images from "compress-images";
import PDFDocument from "pdfkit";
import fs from "fs";
import { chaplink, out, name } from "./index.js";
import { createSpinner } from "nanospinner";
import got from "got";

function saveSetting(name, value) {
  let info = JSON.parse(fs.readFileSync("./info.json").toString());
  info[name] = value;

  fs.writeFileSync("./info.json", JSON.stringify(info), () => {});
}

function readSetting(name) {
  let info = JSON.parse(fs.readFileSync("./info.json").toString());
  try {
    return info[name];
  } catch {
    info[name] = "null";
  }
  return info[name];
}

async function generatePdf(l) {
  const manga = new PDFDocument({
    autoFirstPage: false,
    size: [960, 1481],
    compress: true,
  });

  manga.pipe(fs.createWriteStream(`./${out}/${name}.pdf`));

  //   images = images == null ? [] : images;
  //   const l = images.length == 0 ? length : images.length;

  const spinPdf = createSpinner("Gerando pdf...").start();

  //   if (readSetting("compress"))
  //     await compressMangaPages(`./${out}/`, `./${out}/`);

  for (let i = 0; i < l; i++) {
    manga
      .addPage({ margin: 0, size: [960, 1481] })
      .image(`./${out}/${name}-${i}.jpg`, 0, 0, {
        height: manga.page.height,
      });
    // manga.addPage().image(`./${out}/${name}-${i}.jpg`, 220, 380, {
    //   fit: [220, 380],
    //   align: "center",
    //   valign: "center",
    // });

    fs.unlinkSync(`./${out}/${name}-${i}.jpg`, () => {});
  }

  manga.end();
  spinPdf.success({ text: "Pdf concluido. Aproveite sua leitura!" });
}

function compressMangaPages(input, output) {
  compress_images(
    input,
    output,
    { compress_force: false, statistic: true, autoupdate: true },
    false,
    { jpg: { engine: "mozjpeg", command: ["-quality", "70"] } },
    { png: { engine: "pngquant", command: ["--quality=20-50", "-o"] } },
    { svg: { engine: "svgo", command: "--multipass" } },
    {
      gif: { engine: "gifsicle", command: ["--colors", "64", "--use-col=web"] },
    },
    function (error, completed, statistic) {
      console.log("-------------");
      console.log(error);
      console.log(completed);
      console.log(statistic);
      console.log("-------------");
    }
  );
}

function delImagesInPath(path, name, range) {
  for (let i = 0; i < range; i++) {
    fs.unlinkSync(`./${path}/${name}-${i}.jpg`, () => {});
  }
}

export { generatePdf, delImagesInPath, readSetting, saveSetting };
