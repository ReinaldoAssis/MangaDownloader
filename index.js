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

const pipeline = promisify(stream.pipeline);

let chaplink = "";
let out = "";
let name = "";

//UTILS

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
  };
  fs.writeFileSync("./info.json", JSON.stringify(obj), () => {});
  //`{"out":"manga","name":"hello","chaplink":"","range":"0-100"}`
}

saveSetting("compress", true);
saveSetting("quality", 70);

//*************** */

mainMenu();

async function mainMenu() {
  let test = encodeURI(
    `http://file.io/${process.env.FILEIO}?file=${fs.readFileSync("hello.jpg")}`
  );

  await axios
    .post(test)
    .then()
    .catch((er) => console.log(er));

  const resp = await inquirer.prompt({
    name: "mainMenu",
    type: "list",
    choices: ["Baixar manga", "Converter imagens em pdf"],
  });

  if (resp.mainMenu == "Baixar manga") MainFlow();
  else imgsToPdf();
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

  await generatePdf(l);
}

async function MainFlow() {
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
    const brow = await puppeteer.launch();
    const page = await brow.newPage();

    let resul;

    const spinPageLoad = createSpinner("Carregando pagina...").start();

    await page.goto(chaplink);
    await page.waitForTimeout(300);

    spinPageLoad.success({ text: "Pagina carregada." });

    const spinFullPage = createSpinner("Carregando imagens...").start();

    await page.select("#readingmode", "full");
    await page.waitForTimeout(3500);

    spinFullPage.success({ text: "Imagens carregadas." });

    const spinImages = createSpinner("Processando imagens...").start();
    const imgprocessing = new cliProgress.SingleBar(
      {},
      cliProgress.Presets.shades_classic
    );

    const images = await page.evaluate(() =>
      Array.from(document.querySelectorAll(".ts-main-image"), (e) => e.src)
    );

    spinImages.success({ text: "Links obtidos." });

    imgprocessing.start(images.length, 1);

    const downloads = [];

    for (let i = 0; i < images.length; i++) {
      downloads.push(downloadImage(images[i], `./${out}/${name}-${i}.jpg`));
      imgprocessing.update(i + 1);
    }

    imgprocessing.stop();

    const spinDownload = createSpinner("Baixando imagens...").start();

    await Promise.all(downloads).then(() => {
      spinDownload.success({ text: "Todas as imagens foram baixadas!" });
    });

    await generatePdf(images.length);

    //page.screenshot({ path: out, fullPage: true, quality: 70, type: "jpeg" });
  })();

  process.exit(0);
}

export { chaplink, out, name };
