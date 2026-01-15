const { SlashCommandBuilder } = require('discord.js');
const { getThreads, addTrackedListing, removeTrackedListing, getTrackedListings } = require('./storage');

const CHANNEL_NAME = 'cs2-skins-bot';

const definitions = [
  new SlashCommandBuilder()
    .setName('track')
    .setDescription('Track a Skinport listing ID for trade unlock notification')
    .addIntegerOption(option =>
      option.setName('sale_id')
        .setDescription('The Skinport sale ID to track')
        .setRequired(true)
    )
    .addStringOption(option =>
      option.setName('name')
        .setDescription('Optional item name for your reference')
        .setRequired(false)
    ).toJSON(),
  new SlashCommandBuilder()
    .setName('untrack')
    .setDescription('Stop tracking a listing')
    .addIntegerOption(option =>
      option.setName('sale_id')
        .setDescription('The sale ID to stop tracking')
        .setRequired(true)
    ).toJSON(),
  new SlashCommandBuilder()
    .setName('list')
    .setDescription('List all your tracked items')
    .toJSON(),
];

function createHandler(updatePresence) {
  return async function handleCommand(interaction) {
    if (!interaction.isChatInputCommand()) return;

    const threads = getThreads();
    const threadInfo = threads.find(t =>
      t.guildId === interaction.guild.id && t.userId === interaction.user.id
    );

    if (!threadInfo || threadInfo.threadId !== interaction.channelId) {
      await interaction.reply({
        content: `Couldn't find your thread. Please use the button in #${CHANNEL_NAME} to create one.`,
        ephemeral: true
      });
      return;
    }

    switch (interaction.commandName) {
      case 'track': {
        const saleId = interaction.options.getInteger('sale_id');
        const itemName = interaction.options.getString('name') || `Listing #${saleId}`;
        const added = addTrackedListing(interaction.channelId, saleId, itemName);

        if (added) {
          updatePresence();
          await interaction.reply(
            `Now tracking: **${itemName}** (ID: ${saleId})\n` +
            `You'll be notified when it becomes tradable.`
          );
        } else {
          await interaction.reply(`You're already tracking this listing.`);
        }
        break;
      }
      case 'untrack': {
        const saleId = interaction.options.getInteger('sale_id');
        const removed = removeTrackedListing(interaction.channelId, saleId);

        if (removed) {
          updatePresence();
          await interaction.reply(`Stopped tracking listing ${saleId}.`);
        } else {
          await interaction.reply(`You weren't tracking that listing.`);
        }
        break;
      }
      case 'list': {
        const listings = getTrackedListings(interaction.channelId);

        if (listings.length === 0) {
          await interaction.reply(`You're not tracking any listings.\nUse \`/track sale_id:12345\` to start.`);
          return;
        }

        const listText = listings.map((l, i) =>
          `${i + 1}. **${l.itemName}** (ID: ${l.saleId})`
        ).join('\n');

        await interaction.reply(`**Your tracked listings:**\n${listText}`);
        break;
      }
    }
  };
}

module.exports = { definitions, createHandler, CHANNEL_NAME };
