require("dotenv-safe").config();
import { Telegraf } from "telegraf";

const bot = new Telegraf(process.env.BOT_TOKEN);
bot.telegram.send;
