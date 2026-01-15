const { Client, GatewayIntentBits, ActionRowBuilder, ButtonBuilder, ButtonStyle, REST, Routes } = require('discord.js');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const { getThreads, addThread, removeThread } = require('./storage');
const { definitions: commands, createHandler, CHANNEL_NAME } = require('./commands');
const { init: initSkinport } = require('./skinport');

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
});

const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_BOT_TOKEN);
const targetGuildId = process.env.DISCORD_GUILD_ID;

function updatePresence() {
  const threads = getThreads();
  let totalTracked = 0;
  for (const t of threads) {
    totalTracked += (t.trackedListings?.length || 0);
  }

  client.user.setPresence({
    status: 'online',
    activities: [{ name: `${totalTracked} listing(s)`, type: 3 }],
  });
}

client.once('clientReady', async () => {
  console.log(`✅ Logged in as ${client.user.tag}`);

  initSkinport(client, updatePresence);

  for (const [guildId, guild] of client.guilds.cache) {
    if (targetGuildId && guildId !== targetGuildId) {
      await guild.leave();
      console.log(`Left guild: ${guild.name}`);
      continue;
    }

    try {
      await rest.put(
        Routes.applicationGuildCommands(process.env.DISCORD_CLIENT_ID, guild.id),
        { body: commands }
      );
      await setupBotChannel(guild);
    } catch (err) {
      console.error(`❌ Could not register commands for guild ${guild.id}:`, err);
    }
  }

  updatePresence();
});

async function setupBotChannel(guild) {
  let channel = guild.channels.cache.find(ch => ch.name === CHANNEL_NAME && ch.type === 0);

  if (!channel) {
    channel = await guild.channels.create({
      name: CHANNEL_NAME,
      type: 0,
      topic: 'Track CS2 skins on Skinport and get notified when they become tradable!',
      permissionOverwrites: [
        { id: guild.roles.everyone, allow: ['ViewChannel'], deny: ['SendMessages'] },
        { id: client.user.id, allow: ['SendMessages', 'CreatePrivateThreads', 'SendMessagesInThreads', 'ReadMessageHistory', 'UseApplicationCommands', 'MentionEveryone'] },
      ],
    });
    console.log(`✅ Created #${channel.name}`);
  }

  const messages = await channel.messages.fetch({ limit: 1 });
  if (messages.size > 0) return;

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId('start-thread')
      .setLabel('Start Private Thread')
      .setStyle(ButtonStyle.Primary)
  );

  await channel.send({
    content: '👋 @everyone Welcome to CS2 Skins Tracker!\n\n' +
      'Track Skinport listings and get notified when they become tradable.\n\n' +
      '**How to use:**\n' +
      '1. Click the button below to create your private thread\n' +
      '2. Find a listing on Skinport (the sale ID is in the URL)\n' +
      '3. Use `/track sale_id:12345` to track it\n' +
      '4. Get notified when the trade lock expires!\n\n' +
      'Click below to start:',
    components: [row],
  });
  console.log('Posted bot intro message');
}

client.on('guildCreate', async (guild) => {
  console.log(`✅ Joined guild: ${guild.name}`);

  if (targetGuildId && guild.id !== targetGuildId) {
    await guild.leave();
    return;
  }

  await rest.put(
    Routes.applicationGuildCommands(process.env.DISCORD_CLIENT_ID, guild.id),
    { body: commands }
  );
  await setupBotChannel(guild);
});

client.on('interactionCreate', async (interaction) => {
  if (interaction.isButton() && interaction.customId === 'start-thread') {
    const { user, guild, channel } = interaction;

    const threads = getThreads();
    let threadInfo = threads.find(t => t.guildId === guild.id && t.userId === user.id);
    let thread = null;

    if (threadInfo) {
      try {
        thread = await guild.channels.fetch(threadInfo.threadId);
        if (!thread || thread.archived) {
          removeThread(threadInfo.threadId);
          thread = null;
        }
      } catch {
        removeThread(threadInfo.threadId);
      }
    }

    if (!thread) {
      thread = await channel.threads.create({
        name: `skins-${user.username}`,
        autoArchiveDuration: 1440,
        type: 12,
        invitable: false
      });

      await thread.members.add(user.id);
      addThread(guild.id, thread.id, user.id);

      await interaction.reply({
        content: `📩 Your private thread has been created! [Click here](https://discord.com/channels/${guild.id}/${thread.id}).`,
        ephemeral: true
      });

      await thread.send(
        `👋 Hey **${user.username}**, welcome to your skin tracking space!\n\n` +
        `**Commands:**\n` +
        `- \`/track sale_id:12345\` - Track a listing\n` +
        `- \`/track sale_id:12345 name:AWP Dragon Lore\` - Track with custom name\n` +
        `- \`/untrack sale_id:12345\` - Stop tracking\n` +
        `- \`/list\` - View all tracked items\n\n` +
        `**How to find the sale ID:**\n` +
        `Go to Skinport, find an item, and look at the URL:\n` +
        `\`https://skinport.com/item/awp-dragon-lore/12345\`\n` +
        `The sale ID is \`12345\` at the end.`
      );
    } else {
      await thread.members.add(user.id);
      await interaction.reply({
        content: `📩 You already have a thread. [Click here](https://discord.com/channels/${guild.id}/${thread.id}).`,
        ephemeral: true
      });
    }
  }
});

client.on('interactionCreate', createHandler(updatePresence));

client.login(process.env.DISCORD_BOT_TOKEN);
