#!/usr/bin/env node

import inquirer from "inquirer";
import fs, { existsSync } from "fs";
import puppeteer from "puppeteer";
import { createSpinner } from "nanospinner";
import cliProgress from "cli-progress";
import { promisify } from "util";
import got from "got";
import stream from "stream";
import { saveSetting, readSetting, generatePdf } from "./utils.js";
import axios from "axios";
import { scrollPageToBottom } from "puppeteer-autoscroll-down";

const pipeline = promisify(stream.pipeline);

let chaplink = "";
let out = "";
let name = "";
let delay = 400;
let steps_to_scroll = 400;

//UTILS

// const pupconfig = {
//   headless: true,
//   defaultViewport: null,
//   args: ["--incognito", "--no-sandbox", "--single-process", "--no-zygote"],
// };

const pupconfig = {};

if (existsSync("./info.json")) {
  let info = JSON.parse(fs.readFileSync("./info.json").toString());
  out = info.out;
  name = info.name;
  chaplink = info.chaplink;
} else {
  let obj = {
    out: "manga",
    name: "oi",
    chaplink: "null",
    range: "0-100",
    delay: delay,
  };
  fs.writeFileSync("./info.json", JSON.stringify(obj), () => {});
  //`{"out":"manga","name":"hello","chaplink":"","range":"0-100"}`
}

saveSetting("compress", true);
saveSetting("quality", 70);

//*************** */

mainMenu();

async function mainMenu() {
  const resp = await inquirer.prompt({
    name: "mainMenu",
    type: "list",
    choices: ["Baixar manga", "Buscar manga", "Converter imagens em pdf"],
  });

  if (resp.mainMenu == "Baixar manga") MainFlow();
  else if (resp.mainMenu == "Converter imagens em pdf") imgsToPdf();
  else if (resp.mainMenu == "Buscar manga") searchMangaFlow();
}

//NOT DONE
async function searchMangaFlow() {
  const prompt = await inquirer.prompt({
    name: "name",
    type: "input",
    message: "Name",
    default() {
      return name;
    },
  });

  name = prompt.name;

  const brow = await puppeteer.launch(pupconfig);
  const page = await brow.newPage();

  const spinPageLoad = createSpinner("Carregando pagina...").start();

  await page.goto(chaplink);
  await page.waitForTimeout(300);

  spinPageLoad.success({ text: "Pagina carregada." });
}

async function imgsToPdf() {
  const prp = await inquirer.prompt({
    name: "range",
    type: "input",
    message: "Start and End index",
    default() {
      return readSetting("range");
    },
  });

  const prp2 = await inquirer.prompt({
    name: "name",
    type: "input",
    message: "Name",
    default() {
      return name;
    },
  });

  name = prp2.name;
  const spl = String(prp.range).split("-");
  const start = spl[0];
  const end = spl[1];
  const l = Number.parseInt(spl[1]) - Number.parseInt(spl[0]);

  const prompt = await inquirer.prompt({
    name: "out",
    type: "input",
    message: "Destination output",
    default() {
      return out;
    },
  });

  out = prompt.out;

  saveSetting("chaplink", chaplink);
  saveSetting("out", out);
  saveSetting("name", name);
  saveSetting("range", prp.range);

  await generatePdf(l, { autodelete: true });
}

async function MainFlow() {
  const downloads = [];

  async function askLink() {
    const promptlink = await inquirer.prompt({
      name: "link",
      type: "input",
      message: "Chapter link",
      default() {
        return chaplink;
      },
    });

    chaplink = promptlink.link;
  }

  async function askDestination() {
    const prompt = await inquirer.prompt({
      name: "out",
      type: "input",
      message: "Destination output",
      default() {
        return out;
      },
    });

    out = prompt.out;
  }

  async function askName() {
    const prompt = await inquirer.prompt({
      name: "name",
      type: "input",
      message: "Name",
      default() {
        return name;
      },
    });

    name = prompt.name;
  }

  await askLink();
  await askDestination();
  await askName();

  saveSetting("chaplink", chaplink);
  saveSetting("out", out);
  saveSetting("name", name);

  //************************************************ */

  async function downloadImage(url, name) {
    await pipeline(got.stream(url), fs.createWriteStream(name));
  }

  await (async () => {
    const brow = await puppeteer.launch(pupconfig);
    const page = await brow.newPage();

    page.setViewport({ width: 414, height: 896 });

    let resul;

    const spinPageLoad = createSpinner("Carregando pagina...").start();

    await page.goto(chaplink, { waitUntil: "load" });
    await page.waitForTimeout(delay);

    spinPageLoad.success({ text: "Pagina carregada." });

    const spinFullPage = createSpinner("Carregando imagens...").start();

    await page.select("#readingmode", "single");
    await page.waitForTimeout(500);

    spinFullPage.success({ text: "Imagens carregadas." });

    const spinImages = createSpinner("Processando imagens...").start();
    const imgprocessing = new cliProgress.SingleBar(
      {},
      cliProgress.Presets.shades_classic
    );

    let images = await page.evaluate(() =>
      Array.from(
        document.querySelectorAll("#readerarea > .ts-main-image"),
        (e) => e.src
      )
    );

    await page.waitForSelector("#select-paged", { timeout: 100 });
    let innerHTML = await page.$eval("#select-paged", (e) => {
      return e.innerHTML;
    });
    let tamanho = innerHTML.toString().split("value").length - 1;
    console.log(`TAMANHO ->> ${tamanho}`);

    //imgprocessing.start(tamanho, 1);
    images = [];

    for (let i = 0; i < tamanho; i++) {
      let atual = await page.$eval("#readerarea > .ts-main-image", (e) => {
        return e.src;
      });
      console.log(`ATUAL ${i} => ${atual}`);
      images.push(atual);
      // imgprocessing.update(i + 1);
      downloads.push(downloadImage(images[i], `./${out}/${name}-${i}.jpg`));
      await page.select("#select-paged", `${i + 2}`);
      await page.waitForTimeout(100);
    }

    spinImages.success({ text: "Links obtidos." });
    //imgprocessing.stop();

    let width = 0;
    let height = 0;

    await page.evaluate(() => {
      width = document.querySelector(".ts-main-image").width;
      height = document.querySelector(".ts-main-image").height;
    });

    const spinDownload = createSpinner("Baixando imagens...").start();

    await Promise.all(downloads).then(() => {
      spinDownload.success({ text: "Todas as imagens foram baixadas!" });
    });

    await generatePdf(downloads.length, { width: width, height: height });

    //page.screenshot({ path: out, fullPage: true, quality: 70, type: "jpeg" });
  })();

  process.exit(0);
}

export { chaplink, out, name };
