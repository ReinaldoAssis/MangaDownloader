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

async function generatePdf(
  l,
  { width = null, height = null, autodelete = false }
) {
  const manga = new PDFDocument({
    autoFirstPage: false,
    size: [960, 1481],
    compress: true,
  });

  manga.pipe(fs.createWriteStream(`./${out}/${name}.pdf`));

  width = width ?? 960;
  height = height ?? 1481;

  const spinPdf = createSpinner("Gerando pdf...").start();

  for (let i = 0; i < l; i++) {
    manga
      .addPage({ margin: 0, size: [width, height] })
      .image(`./${out}/${name}-${i}.jpg`, 0, 0, {
        height: manga.page.height,
      });

    if (autodelete) fs.unlinkSync(`./${out}/${name}-${i}.jpg`, () => {});
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

// function downloadManga() {
//   const brow = await puppeteer.launch(pupconfig);
//   const page = await brow.newPage();

//   const bodyhandler = await page.$("body");
//   const hv = await(await bodyhandler.boundingBox()).height;
//   await bodyhandler.dispose();

//   page.setViewport({ width: 414, height: 896 });

//   let resul;

//   const spinPageLoad = createSpinner("Carregando pagina...").start();

//   await page.goto(chaplink, { waitUntil: "load" });
//   await page.waitForTimeout(delay);

//   spinPageLoad.success({ text: "Pagina carregada." });

//   const spinFullPage = createSpinner("Carregando imagens...").start();

//   await page.select("#readingmode", "full");
//   //await page.waitForTimeout(3500);

//   await scrollPageToBottom(page, { delay: 1000 });

//   spinFullPage.success({ text: "Imagens carregadas." });

//   const spinImages = createSpinner("Processando imagens...").start();
//   const imgprocessing = new cliProgress.SingleBar(
//     {},
//     cliProgress.Presets.shades_classic
//   );

//   const images = await page.evaluate(() =>
//     Array.from(
//       document.querySelectorAll("#readerarea > .ts-main-image"),
//       (e) => e.src
//     )
//   );

//   spinImages.success({ text: "Links obtidos." });

//   imgprocessing.start(images.length, 1);

//   for (let i = 0; i < images.length; i++) {
//     //downloads.push(downloadImage(images[i], `./${out}/${name}-${i}.jpg`));
//     console.log(images[i]);
//     imgprocessing.update(i + 1);
//   }

//   imgprocessing.stop();

//   let width = 0;
//   let height = 0;

//   await page.evaluate(() => {
//     width = document.querySelector(".ts-main-image").width;
//     height = document.querySelector(".ts-main-image").height;
//   });

//   const spinDownload = createSpinner("Baixando imagens...").start();

//   await Promise.all(downloads).then(() => {
//     spinDownload.success({ text: "Todas as imagens foram baixadas!" });
//   });

//   await generatePdf(downloads.length, { width: width, height: height });

//   //page.screenshot({ path: out, fullPage: true, quality: 70, type: "jpeg" });
// }

export { generatePdf, delImagesInPath, readSetting, saveSetting };
