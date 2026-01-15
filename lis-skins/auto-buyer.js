const { Centrifuge, UnauthorizedError } = require('centrifuge');
const WebSocket = require('ws');
const crypto = require('crypto');
const { getWsToken, buy } = require('./api-client');

const STEAM_PARTNER = process.env.STEAM_PARTNER || '302536666';
const STEAM_TOKEN = process.env.STEAM_TOKEN || 'zjkEDJLy';

// Skins to watch with max prices
const WATCH_LIST = {
  'FAMAS | Bad Trip (Battle-Scarred)': 41.0,
  'AWP | Printstream (Battle-Scarred)': 41.0,
  'CS:GO Weapon Case': 66.02,
  'Fever Case': 0.67,
};

const purchasedIds = new Map();

const centrifuge = new Centrifuge('wss://ws.lis-skins.com/connection/websocket', {
  websocket: WebSocket,
  getToken: async () => {
    console.log('Fetching WS token...');
    try {
      const token = await getWsToken();
      console.log('Token obtained');
      return token;
    } catch (err) {
      if (err.response?.status === 403) throw new UnauthorizedError();
      throw err;
    }
  }
});

centrifuge.on('connecting', ctx => console.log('Connecting:', ctx.reason));
centrifuge.on('connected', ctx => console.log('Connected:', ctx.transport));
centrifuge.on('disconnected', ctx => console.log('Disconnected:', ctx.reason));
centrifuge.on('error', err => console.error('Error:', err));

const subscription = centrifuge.newSubscription('public:obtained-skins');

subscription.on('subscribing', ctx => console.log('Subscribing:', ctx.reason));
subscription.on('subscribed', () => console.log('Subscribed to obtained-skins'));
subscription.on('error', err => console.error('Subscription error:', err));

subscription.on('publication', async (ctx) => {
  if (!ctx?.data || ctx.data.event === 'obtained_skin_deleted') return;

  const { name, price, id } = ctx.data;
  const maxPrice = WATCH_LIST[name];

  if (!maxPrice || price > maxPrice) return;
  if (!id) {
    console.warn('Skipping: missing skin ID');
    return;
  }

  if (purchasedIds.has(id)) {
    console.log(`Already attempted purchase for ${id}`);
    return;
  }

  const customId = crypto.randomUUID();
  purchasedIds.set(id, customId);

  console.log(`Buying: ${name} at ${price} (max: ${maxPrice})`);

  try {
    const response = await buy(id, {
      partner: STEAM_PARTNER,
      token: STEAM_TOKEN,
      maxPrice: price,
      customId,
    });
    console.log('Purchase response:', response);
  } catch (error) {
    const msg = error.response?.data || error.message;
    console.error('Purchase failed:', msg);
  }
});

subscription.subscribe();
centrifuge.connect();

console.log('Auto-buyer started. Watching:', Object.keys(WATCH_LIST).join(', '));
