# CS2 Skins Monitor

A comprehensive toolkit for monitoring and trading CS2 skins across multiple platforms. Includes auto-buying, pattern scanning, price alerts, and trade-lock notifications.

## Features

### Discord Bot
- **Trade-lock notifications** - Track Skinport listings and get notified when they become tradable
- **Private threads** - Each user gets their own notification space
- **Real-time WebSocket** - Instant notifications when items unlock

### Telegram Bot
- **Price alerts** - Get notified when skins drop below your target price
- **Skinport integration** - Monitors all CS2 items on Skinport

### LisSkins Tools
- **Auto-buyer** - Automatically purchase skins below specified thresholds
- **Pattern scanner** - Find rare fade/marble patterns on knives

### Skinport Monitor
- **Browser opener** - Automatically opens specific listings when they appear

### Skinport Quick Checkout (Browser Script)
- **Instant checkout** - Automatically clicks through the purchase flow on Skinport item pages
- Finalizing the purchase still requires manual confirmation for security
- Works great with the browser opener: monitor detects listing → opens browser → bookmarklet script handles most checkout steps
- This might not be fast enough for high-demand items, it's better to run the discord bot, have the page pre-loaded and click the bookmarklet as soon as you get notified



## Prerequisites

- Node.js 18+
- Telegram Bot Token (from [@BotFather](https://t.me/BotFather))
- Discord Bot Token (from [Discord Developer Portal](https://discord.com/developers/applications))
- LisSkins API Key (for auto-buyer and pattern scanner)

## Installation

```bash
git clone https://github.com/ShnkeWeber/cs2-skins.git
cd cs2-skins
npm install
cp .env.example .env
```

Edit `.env` with your credentials:

```env
# Telegram Bot
TELEGRAM_BOT_TOKEN=your_telegram_bot_token

# Discord Bot
DISCORD_BOT_TOKEN=your_discord_bot_token
DISCORD_CLIENT_ID=your_discord_client_id
# DISCORD_GUILD_ID=your_discord_guild_id # in case you want the bot to automatically leave other servers

# LisSkins API
LIS_SKINS_API_KEY=your_lis_skins_api_key

# Steam Trade URL (for auto-buyer)
STEAM_PARTNER=your_steam_partner_id
STEAM_TOKEN=your_steam_trade_token
```

## Usage

### Discord Bot - Trade Lock Notifications

```bash
npm run discord
```

Track Skinport listings and get notified when the trade lock expires.

**Setup:**
1. Invite the bot to your server (https://discord.com/oauth2/authorize?client_id=<client_id>&permissions=345744934928&integration_type=0&scope=bot+applications.commands)
2. The bot creates a `#cs2-skins-bot` channel
3. Click "Start Private Thread" to begin

**Commands:**
- `/track sale_id:12345` - Track a listing by its Skinport sale ID
- `/track sale_id:12345 name:AWP Dragon Lore` - Track with a custom name
- `/untrack sale_id:12345` - Stop tracking a listing
- `/list` - View all your tracked items

**Finding the Sale ID:**
Go to any Skinport item page. The URL looks like:
```
https://skinport.com/item/awp-dragon-lore-fn/12345678
                                              ^^^^^^^^
                                              This is the sale ID
```

### Telegram Bot - Price Alerts

```bash
npm run telegram
```

**Commands:**
- `/start` - Initialize the bot
- **Create price alert** - Enter skin name and max price
- **View alerts** - See all your active alerts
- **Delete alerts** - Remove all alerts

**Format:** `Skin Name,MaxPrice`
Example: `AWP | Dragon Lore (Field-Tested),500`

### LisSkins Auto-Buyer

```bash
npm run lis-skins
```

Automatically purchases skins when they appear below your configured thresholds.

**Configuration:** Edit `lis-skins/auto-buyer.js` to modify the watch list:

```javascript
const WATCH_LIST = {
  'FAMAS | Bad Trip (Battle-Scarred)': 41.0,
  'AWP | Printstream (Battle-Scarred)': 41.0,
  'CS:GO Weapon Case': 66.02,
  // Add more skins...
};
```

### Pattern Scanner

```bash
npm run pattern-scan
```

One-time scan of LisSkins marketplace for rare patterns (max fade, fire & ice, etc.).

**Configuration:** Edit `lis-skins/pattern-scanner.js` to modify patterns:

```javascript
const SPECIAL_PATTERNS = {
  '★ Karambit | Fade (Factory New)': [412, 16, 146, ...],
  // Add more patterns...
};
```

### Skinport Browser Monitor

```bash
npm run skinport
```

Opens your browser automatically when specific sale IDs are listed.

**Configuration:** Edit `skinport-monitor.js`:

```javascript
const WATCH_SALE_IDS = [74353285, 12345678];
```

### Skinport Quick Checkout (Bookmarklet)

A bookmarklet that automates the Skinport checkout flow. Click it on any item page to instantly proceed through all purchase steps to the final confirmation.

**Usage:**
1. Run `npm run skinport` to monitor for specific listings
2. When a listing appears, the browser opens automatically
3. Click the bookmarklet to rush through checkout

**Installation:** Create a bookmark with the JavaScript code as the URL (see `skinport/quick-checkout.js`)

## Project Structure

```
cs2-skins/
├── discord/
│   ├── index.js              # Entry point, client setup, event handlers
│   ├── commands.js           # Slash command definitions and handlers
│   ├── skinport.js           # Skinport WebSocket integration for Discord
│   └── storage.js            # Thread and listing JSON persistence
├── skinport/
│   ├── skinport-client.js    # Shared WebSocket client
│   ├── skinport-monitor.js   # Browser opener for watched listings
│   └── quick-checkout.js     # Bookmarklet for instant checkout
├── telegram/
│   └── telegram-bot.js       # Price alert bot
├── lis-skins/
│   ├── api-client.js         # Shared API client
│   ├── auto-buyer.js         # Automatic skin purchasing
│   └── pattern-scanner.js    # Rare pattern finder
├── package.json
├── .env.example
└── .gitignore
```

## Data Storage

- `telegram/user_data.json` - Telegram user price alerts
- `discord/threads.json` - Discord threads and tracked listings

## API Integrations

| Platform | API Type | Purpose |
|----------|----------|---------|
| Skinport | WebSocket | Real-time listing events |
| Skinport | REST | Price data for Telegram bot |
| LisSkins | WebSocket | Real-time new listings |
| LisSkins | REST | Pattern searching, purchasing |

## License

ISC
