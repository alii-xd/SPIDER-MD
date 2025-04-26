import '@whiskeysockets/baileys';
import 'awesome-phonenumber';
import chalk from 'chalk';
import { watchFile } from 'fs';

const terminalImage = global.opts.img ? require("terminal-image") : '';
const urlRegexOptions = {
  strict: false
};
const urlRegex = (await import("url-regex-safe")).default(urlRegexOptions);
const defaultConn = {
  user: {}
};

export default async function (message, conn = defaultConn) {
  try {
    if (!message || !message.key || !message.key.remoteJid) {
      console.error("❌ Message or remoteJid is undefined. Skipping processing.");
      return;
    }

    const key = message.key.remoteJid;
    if (typeof key !== "string" && typeof key !== "number") {
      console.error("❌ Invalid key type. Expected string or number, found: " + typeof key);
      return;
    }

    let img;
    try {
      if (global.opts.img) {
        img = /sticker|image/gi.test(message.mtype) ? await terminalImage.buffer(await message.download()) : false;
      }
    } catch (error) {
      console.error("❌ Error loading image:", error.message || error);
    }

    const filesize = (message.msg 
      ? message.msg.vcard 
        ? message.msg.vcard.length 
        : message.msg.fileLength 
          ? message.msg.fileLength.low || message.msg.fileLength 
          : message.msg.axolotlSenderKeyDistributionMessage 
            ? message.msg.axolotlSenderKeyDistributionMessage.length 
            : message.text 
              ? message.text.length 
              : 0 
      : message.text 
        ? message.text.length 
        : 0) || 0;

    const timeOptions = {
      timeZone: "Asia/Karachi",
      hour12: false
    };

    console.log(`╭────⬡ SIGMA-MD ⬡────
├▢💻 ${chalk.hex('#FE0041').bold("SIGMA-MD [BOT SYSTEM]")}
├▢⏰ Date & Time: ${chalk.green(new Date().toLocaleString("es-ES", timeOptions))}
├▢📂 Chat: ${chalk.blueBright('MASKED')}
├▢📦 File Size: ${chalk.magenta(filesize + 'B')}
├▢👤 Sender: ${chalk.redBright("MASKED")}
├▢💬 Message Type: ${chalk.yellow(message.mtype || "UNKNOWN")}
╰────────────────`.trim());

    if (img) {
      console.log("📸 Image received:", img.trimEnd());
    }

    if (typeof message.text === "string" && message.text) {
      let log = message.text.replace(/\u200e+/g, "MASKED");
      const mdRegex = /(?<=(?:^|[\s\n])\S?)(?:([*_~])(.+?)\1|```((?:.||[\n\r])+?)```)(?=\S?(?:[\s\n]|$))/g;
      
      const mdFormat = (depth = 4) => (_, type, text, monospace) => {
        const formatMap = {
          '_': "italic",
          '*': "bold",
          '~': 'strikethrough'
        };
        text = text || monospace;
        return !formatMap[type] || depth < 1 ? text : chalk[formatMap[type]](text.replace(mdRegex, mdFormat(depth - 1)));
      };

      if (log.length < 1024) {
        log = log.replace(urlRegex, url => chalk.blueBright("MASKED URL"));
      }

      log = log.replace(mdRegex, mdFormat(4));
      
      console.log(message.error != null 
        ? chalk.red("❌ Error: " + log) 
        : message.isCommand 
          ? chalk.yellow("⚡ Command: MASKED COMMAND") 
          : "📝 Log: " + log);
    }

    if (message.messageStubParameters) {
      console.log(message.messageStubParameters.map(() => chalk.gray("🔒 Masked Message Stub")).join(", "));
    }

    if (/document/i.test(message.mtype)) {
      console.log("📄 Document received");
    } else if (/ContactsArray/i.test(message.mtype)) {
      console.log("👥 Contacts received");
    } else if (/contact/i.test(message.mtype)) {
      console.log("👤 Contact received");
    } else if (/audio/i.test(message.mtype)) {
      const duration = message.msg.seconds || 0;
      console.log((message.msg.ptt ? "🎤 (PTT " : "🎶 (") + "Audio) " + 
        Math.floor(duration / 60).toString().padStart(2, '0') + ':' + 
        (duration % 60).toString().padStart(2, '0'));
    }
  } catch (error) {
    console.error("❌ An error occurred:", error.message || error);
  }

  console.log();
  
  const file = global.__filename(import.meta.url);
  watchFile(file, () => {
    console.log(chalk.redBright("📝 Update 'lib/print.js' detected. Reloading..."));
  });
}