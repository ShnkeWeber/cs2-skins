const { io } = require('socket.io-client');
const parser = require('socket.io-msgpack-parser');

const WS_URL = 'wss://skinport.com';
const SALE_FEED_CONFIG = { currency: 'EUR', locale: 'en', appid: 730 };

function buildItemUrl(sale) {
  return `https://skinport.com/item/${sale.url}/${sale.saleId}`;
}

function createClient(options = {}) {
  const { reconnection = true, onConnect, onSale, onDisconnect, onError } = options;

  const socketOptions = {
    transports: ['websocket'],
    parser,
  };

  if (reconnection) {
    socketOptions.reconnection = true;
    socketOptions.reconnectionDelay = 1000;
    socketOptions.reconnectionDelayMax = 5000;
  }

  const socket = io(WS_URL, socketOptions);

  socket.on('connect', () => {
    console.log('Connected to Skinport WebSocket');
    socket.emit('saleFeedJoin', SALE_FEED_CONFIG);
    if (onConnect) onConnect(socket);
  });

  socket.on('saleFeed', async (result) => {
    if (!result || result.eventType !== 'listed') return;
    if (!onSale) return;

    for (const sale of result.sales || []) {
      await onSale(sale, buildItemUrl(sale));
    }
  });

  socket.on('disconnect', () => {
    console.log('Disconnected from Skinport WebSocket');
    if (onDisconnect) onDisconnect();
  });

  socket.on('error', (err) => {
    console.error('Skinport WebSocket error:', err);
    if (onError) onError(err);
  });

  return socket;
}

module.exports = { createClient, buildItemUrl, SALE_FEED_CONFIG };
