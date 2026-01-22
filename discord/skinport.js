const { createClient, buildItemUrl} = require('../skinport/skinport-client');
const { getAllTrackedSaleIds, getThreadsTrackingSaleId, removeTrackedListing } = require('./storage');

let socket = null;
let discordClient = null;
let onListingNotified = null;

function init(client, onNotify) {
  discordClient = client;
  onListingNotified = onNotify;

  socket = createClient({
    reconnection: true,
    onSale: async (sale) => {
      const trackedIds = getAllTrackedSaleIds();
      if (trackedIds.size === 0) return;
      if (!trackedIds.has(sale.saleId)) return;

      console.log(`Tracked item listed: ${sale.marketName} (${sale.saleId})`);

      const threads = getThreadsTrackingSaleId(sale.saleId);
      for (const threadData of threads) {
        try {
          const thread = await discordClient.channels.fetch(threadData.threadId);
          const salePriceInEUR = (sale.salePrice / 100).toFixed(2);

          await thread.send({
            content: `<@${threadData.userId}> Your tracked item is now tradable!\n\n` +
              `**${sale.marketName}**\n` +
              `Price: €${salePriceInEUR}\n` +
              `[View on Skinport](${buildItemUrl(sale)})`,
          });

          removeTrackedListing(threadData.threadId, sale.saleId);
          if (onListingNotified) onListingNotified();
        } catch (err) {
          console.error(`Failed to notify thread ${threadData.threadId}:`, err.message);
        }
      }
    }
  });

  return socket;
}

module.exports = {init};
