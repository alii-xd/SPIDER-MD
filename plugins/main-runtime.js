let handler = async (m, { conn, args, usedPrefix, command }) => {
  m.react('⏳');

  let _muptime;
  if (process.send) {
    process.send('uptime');
    _muptime = await new Promise(resolve => {
      process.once('message', resolve);
      setTimeout(resolve, 1000);
    }) * 1000;
  }
  let muptime = clockString(_muptime);

  let str = `╭──〔 *SIGMA-MD UPTIME* 〕──⬣
│
│⏳ *Bot Active Since:*  
│➥ ${muptime}
│
╰──────────────⬣`;

  await conn.sendMessage(m.chat, {
    text: str,
    contextInfo: {
      mentionedJid: [m.sender],
      isForwarded: true,
      forwardedNewsletterMessageInfo: {
        newsletterJid: '120363417971954983@newsletter',
        newsletterName: "SIGMA-MD",
        serverMessageId: -1
      },
      forwardingScore: 999
    }
  });

  m.react('✅');
};

handler.help = ['runtime', 'uptime', 'run'];
handler.tags = ['main'];
handler.command = ['runtime', 'uptime', 'run'];

export default handler;

function clockString(ms) {
  if (isNaN(ms)) return '--d --h --m --s';
  let d = Math.floor(ms / 86400000);
  let h = Math.floor(ms / 3600000) % 24;
  let m = Math.floor(ms / 60000) % 60;
  let s = Math.floor(ms / 1000) % 60;
  return `${d}d ${h}h ${m}m ${s}s`;
    }
