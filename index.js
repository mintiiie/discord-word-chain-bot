require("dotenv").config();
const http = require("http");

const port = process.env.PORT || 3000;

http.createServer((req, res) => {
  res.writeHead(200);
  res.end("Bot is running");
}).listen(port, () => {
  console.log(`Web server running on port ${port}`);
});
const { Client, GatewayIntentBits } = require("discord.js");

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ]
});

const games = new Map();

const WORD_COOLDOWN = 20;

const fs = require("fs");

function loadDictionary() {
  return fs
    .readFileSync("./dictionary.txt", "utf8")
    .split("\n")
    .map(x => x.trim().toLowerCase())
    .filter(Boolean);
}

const starterWords = fs
  .readFileSync("./starterwords.txt", "utf8")
  .split("\n")
  .map(x => x.trim())
  .filter(Boolean);

function loadEndWords() {
  return fs
    .readFileSync("./endwords.txt", "utf8")
    .split("\n")
    .map(x => x.trim().toLowerCase())
    .filter(Boolean);
}

function normalize(text) {
  return text.toLowerCase().trim().replace(/\s+/g, " ");
}

function loadLeaderboard() {
  try {
    return JSON.parse(
      fs.readFileSync("./leaderboard.json", "utf8")
    );
  } catch {
    return {};
  }
}

function saveLeaderboard(data) {
  fs.writeFileSync(
    "./leaderboard.json",
    JSON.stringify(data, null, 2)
  );
}

function startGame(channelId) {
  const startWord =
    starterWords[Math.floor(Math.random() * starterWords.length)];

 games.set(channelId, {
  lastWord: startWord.split(" ").slice(-1)[0],
  recentWords: [startWord],
  lastPlayer: null,
  running: true
});

  return startWord;
}

function stopGame(channelId) {
  games.delete(channelId);
}

client.once("ready", () => {
  console.log("🤖 Bot nối từ online");
  console.log("Bot:", client.user.tag);
  console.log("ID:", client.user.id);
});

client.on("messageCreate", async (msg) => {
  if (msg.author.bot) return;

  const content = normalize(msg.content);

  // ===== START =====
if (content === "dstart") {
  const startWord = startGame(msg.channel.id);

  return msg.channel.send(
    `🎮 Bắt đầu nối từ!\n\nTừ đầu tiên: **${startWord}**`
  );
}

  // ===== STOP =====
  if (content === "dstop") {
    stopGame(msg.channel.id);
    return msg.channel.send("🛑 Đã dừng game.");
  }

  // ===== RESET =====
if (content === "dreset") {
  const startWord = startGame(msg.channel.id);

  return msg.channel.send(
    `🔄 Đã reset.\n\nTừ đầu tiên: **${startWord}**`
  );
}

// ===== RANK =====
if (content === "drank") {

  const leaderboard = loadLeaderboard();

  const ranking = Object.values(leaderboard)
    .sort((a, b) => b.wins - a.wins)
    .slice(0, 10);

const player =
    leaderboard[msg.author.id];

 if (!player) {
    return msg.reply(
      "📊 Bạn chưa có dữ liệu."
    );
  }

  return msg.channel.send(
`📈 THỐNG KÊ CỦA ${msg.author.username}

👑 Số trận thắng: ${player.wins}
✍️ Số từ đã chơi: ${player.wordsPlayed}
🔥 Chuỗi thắng hiện tại: ${player.streak}
🏆 Chuỗi thắng cao nhất: ${player.bestStreak}`
  );

  if (ranking.length === 0) {
    return msg.channel.send(
      "📊 Chưa có dữ liệu xếp hạng."
    );
  }

  let text = "🏆 BẢNG XẾP HẠNG\n\n";

  ranking.forEach((p, i) => {
    text += `${i + 1}. ${p.name} — ${p.wins} thắng\n`;
  });

  return msg.channel.send(text);
}

 // ===== HELP =====
if (content === "dhelp") {
  return msg.channel.send(`
🎮 BOT NỐI TỪ

dstart - bắt đầu trò chơi
dstop - dừng trò chơi
dreset - bắt đầu ván mới
drank - xem bảng xếp hạng
dhelp - xem hướng dẫn

📌 Luật chơi:
• Nối chữ cuối của từ trước với chữ đầu của từ sau.
• Chỉ nhận từ ghép 2 chữ.
• Từ đã dùng sẽ bị khóa trong 20 lượt gần nhất.
• Chat dài hơn 2 chữ sẽ bị bot bỏ qua.
• Chạm vào từ kết thúc sẽ chiến thắng.

🏆 Khi thắng, game sẽ tự động reset và bắt đầu ván mới.
`);
}

const game = games.get(msg.channel.id);

if (!game || !game.running) return;

const words = content.split(" ");

// Không phải từ ghép 2 chữ thì bỏ qua hoàn toàn
if (words.length !== 2) {
  return;
}

// ===== TỪ KẾT THÚC =====
const endWords = loadEndWords();

if (endWords.includes(content)) {

  console.log("END WORD HIT:", content);

  const newStartWord = startGame(msg.channel.id);

  await msg.channel.send(
    `🏆 Không còn từ để nối tiếp!\n` +
    `🎉 ${msg.author} là người chiến thắng!\n\n` +
    `🔄 Ván mới bắt đầu!\n` +
    `🎮 Từ đầu tiên: **${newStartWord}**`
  );

  return;
}

// Kiểm tra từ điển
const dictionary = loadDictionary();

if (!dictionary.includes(content)) {
  return msg.reply(
    "📖 Từ này không có trong từ điển!"
  );
}

// không được tự nối 2 lượt liên tiếp
if (game.lastPlayer === msg.author.id) {
  return msg.reply(
    "⛔ Bạn vừa chơi lượt trước, hãy chờ người khác nối tiếp!"
  );
}

  // kiểm tra chữ đầu
  if (words[0] !== game.lastWord) {
    return msg.reply(
      `❌ Từ phải bắt đầu bằng **${game.lastWord}**`
    );
  }

  // kiểm tra trùng
 if (game.recentWords.includes(content)) {
  return msg.reply(
    `❌ Từ này đã xuất hiện trong ${WORD_COOLDOWN} lượt gần nhất!`
  );
}

game.recentWords.push(content);

const leaderboard = loadLeaderboard();

const playerId = msg.author.id;

if (!leaderboard[playerId]) {
  leaderboard[playerId] = {
    name: msg.author.username,
    wins: 0,
    wordsPlayed: 0,
    streak: 0,
    bestStreak: 0
  };
}

leaderboard[playerId].wins++;

leaderboard[playerId].streak++;

if (
  leaderboard[playerId].streak >
  leaderboard[playerId].bestStreak
) {
  leaderboard[playerId].bestStreak =
    leaderboard[playerId].streak;
}

saveLeaderboard(leaderboard);

game.lastPlayer = msg.author.id;

// chỉ giữ lại 20 từ gần nhất
if (game.recentWords.length > WORD_COOLDOWN) {
  game.recentWords.shift();
}


// ===== CẬP NHẬT GAME =====
game.lastWord = words[words.length - 1];

try {
  await msg.react("✅");
} catch {}
});

client.login(process.env.TOKEN);
