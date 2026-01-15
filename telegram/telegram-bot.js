const { Telegraf, Markup } = require('telegraf');
const axios = require('axios');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const DATA_FILE = path.join(__dirname, 'user_data.json');
const API_URL = 'https://api.skinport.com/v1/items';
const POLL_INTERVAL = 10000; // 10 seconds

const bot = new Telegraf(process.env.TELEGRAM_BOT_TOKEN);
let allItems = [];

// In-memory cache with write-through
let cache = null;

function loadData() {
  if (cache) return cache;

  try {
    if (fs.existsSync(DATA_FILE)) {
      cache = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
    } else {
      cache = {};
    }
  } catch (error) {
    console.error('Error loading user data:', error);
    cache = {};
  }
  return cache;
}

function saveData() {
  fs.writeFileSync(DATA_FILE, JSON.stringify(cache, null, 2));
}

function getUser(userId) {
  const data = loadData();
  if (!data[userId]) {
    data[userId] = { skins: {} };
  }
  return data[userId];
}

const texts = {
  welcome: 'Welcome to CS2 Skin Monitor!\nGet notified when skins drop below your target price.',
  mainMenu: 'Main menu. Choose an action:',
  createAlert: 'Create price alert',
  viewAlerts: 'View alerts',
  deleteAlerts: 'Delete all alerts',
  enterNameAndPrice: 'Enter skin name and max price:\nFormat: Skin Name,Price\n\nExample: AWP | Dragon Lore (Field-Tested),500',
  alertCreated: 'Alert created! You will be notified when the price drops below your target.',
  noAlert: 'You have no active alerts.',
  currentAlerts: 'Your current alerts:',
  alertsDeleted: 'All alerts deleted.',
  invalidFormat: 'Invalid format. Use: Skin Name,Price',
  backToMenu: 'Back to menu',
  itemNotFound: 'Item not found. Make sure you use the exact market name.',
  priceAlert: 'Price alert triggered!',
};

async function fetchItems() {
  console.log(`Fetching items at ${new Date().toISOString()}`);
  const response = await axios.get(API_URL, {
    params: { app_id: 730, currency: 'EUR', tradable: 0 },
    headers: { 'Accept-Encoding': 'br' }
  });
  return response.data;
}

function findItem(name) {
  return allItems.find(item => item.market_hash_name === name);
}

function showMainMenu(ctx) {
  ctx.reply(texts.mainMenu, Markup.inlineKeyboard([
    [Markup.button.callback(texts.createAlert, 'create_alert')],
    [Markup.button.callback(texts.viewAlerts, 'view_alerts')],
    [Markup.button.callback(texts.deleteAlerts, 'delete_alerts')],
  ]));
}

bot.start((ctx) => {
  ctx.reply(texts.welcome);
  showMainMenu(ctx);
});

bot.action('create_alert', (ctx) => {
  const user = getUser(ctx.from.id.toString());
  user.awaitingInput = true;
  saveData();
  ctx.reply(texts.enterNameAndPrice);
});

bot.action('view_alerts', (ctx) => {
  const user = getUser(ctx.from.id.toString());
  const skins = user.skins;

  if (!skins || Object.keys(skins).length === 0) {
    ctx.reply(texts.noAlert, Markup.inlineKeyboard([
      Markup.button.callback(texts.backToMenu, 'back_to_menu')
    ]));
    return;
  }

  const alertsText = Object.entries(skins)
    .map(([name, data]) => `${name}\nTarget: ${data.targetPrice}EUR | Current: ${data.currentPrice}EUR`)
    .join('\n\n');

  ctx.reply(`${texts.currentAlerts}\n\n${alertsText}`, Markup.inlineKeyboard([
    Markup.button.callback(texts.backToMenu, 'back_to_menu')
  ]));
});

bot.action('delete_alerts', (ctx) => {
  const user = getUser(ctx.from.id.toString());
  user.skins = {};
  user.awaitingInput = false;
  saveData();
  ctx.reply(texts.alertsDeleted, Markup.inlineKeyboard([
    Markup.button.callback(texts.backToMenu, 'back_to_menu')
  ]));
});

bot.action('back_to_menu', (ctx) => showMainMenu(ctx));

bot.on('text', async (ctx) => {
  const userId = ctx.from.id.toString();
  const user = getUser(userId);

  if (!user.awaitingInput) return;

  const parts = ctx.message.text.split(',');
  if (parts.length < 2) {
    ctx.reply(texts.invalidFormat);
    return;
  }

  const name = parts.slice(0, -1).join(',').trim();
  const price = parseFloat(parts[parts.length - 1].trim());

  if (isNaN(price) || price <= 0) {
    ctx.reply(texts.invalidFormat);
    return;
  }

  const item = findItem(name);
  if (!item) {
    ctx.reply(texts.itemNotFound);
    return;
  }

  user.skins[name] = {
    targetPrice: price,
    currentPrice: item.min_price,
    notified: false
  };
  user.awaitingInput = false;
  saveData();

  ctx.reply(texts.alertCreated, Markup.inlineKeyboard([
    Markup.button.callback(texts.backToMenu, 'back_to_menu')
  ]));

  await checkPrices(true);
});

async function checkPrices(skipFetch = false) {
  try {
    if (!skipFetch) {
      allItems = await fetchItems();
    }

    const data = loadData();
    let changed = false;

    for (const [userId, userData] of Object.entries(data)) {
      const skins = userData.skins;
      if (!skins || Object.keys(skins).length === 0) continue;

      for (const [skinName, skinData] of Object.entries(skins)) {
        if (skinData.notified) continue;

        const item = findItem(skinName);
        if (!item) continue;

        const currentPrice = item.min_price;
        skinData.currentPrice = currentPrice;
        changed = true;

        if (currentPrice <= skinData.targetPrice) {
          const message = `${texts.priceAlert}\n\n${skinName}\nPrice: ${currentPrice}EUR (Target: ${skinData.targetPrice}EUR)\n\n${item.item_page || ''}`;

          bot.telegram.sendMessage(userId, message, Markup.inlineKeyboard([
            Markup.button.callback(texts.backToMenu, 'back_to_menu')
          ])).catch(err => {
            console.error(`Failed to send notification to ${userId}:`, err);
          });

          delete skins[skinName];
        }
      }
    }

    if (changed) saveData();
  } catch (error) {
    console.error('Error in checkPrices:', error);
  }

  setTimeout(checkPrices, POLL_INTERVAL);
}

// Initialize
loadData();
fetchItems().then(items => {
  allItems = items;
  checkPrices(true);
});

bot.catch((err, ctx) => {
  console.error(`Error for ${ctx.updateType}:`, err);
});

bot.launch()
  .then(() => console.log('Telegram bot started!'))
  .catch(err => console.error('Failed to start bot:', err));

process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));
