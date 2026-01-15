const { createClient } = require('./skinport-client');
const open = (...args) => import('open').then(mod => mod.default(...args));

// Sale IDs to watch for
const WATCH_SALE_IDS = [74353285];

console.log('Skinport monitor started');
console.log('Watching sale IDs:', WATCH_SALE_IDS.join(', '));

createClient({
  onSale: async (sale, url) => {
    if (!WATCH_SALE_IDS.includes(sale.saleId)) return;

    console.log(`Found watched item: ${sale.marketName}`);
    console.log(`Opening: ${url}`);

    try {
      await open(url);
    } catch (err) {
      console.error('Failed to open browser:', err);
    }
  }
});
