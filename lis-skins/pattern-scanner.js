const { search } = require('./api-client');

// Special patterns to look for (pattern index / paint seed)
const SPECIAL_PATTERNS = {
  '★ Karambit | Marble Fade (Factory New)': [412, 16, 146, 241, 359, 393, 541, 602, 649, 688, 701, 152, 281, 292, 344, 628, 673, 743, 777, 792, 994],
  '★ Karambit | Fade (Factory New)': [16, 129, 146, 152, 241, 281, 292, 332, 344, 359, 393, 412, 541, 602, 628, 649, 673, 688, 701, 743, 777, 792, 918, 994],
  '★ Talon Knife | Fade (Factory New)': [16, 129, 146, 152, 241, 281, 292, 332, 344, 359, 393, 412, 541, 602, 628, 649, 673, 688, 701, 743, 777, 792, 918, 994],
  '★ Butterfly Knife | Fade (Factory New)': [41, 87, 93, 205, 326, 341, 348, 403, 468, 520, 527, 575, 583, 601, 636, 651, 742, 763, 807, 892, 897, 910, 911, 961],
  '★ M9 Bayonet | Fade (Factory New)': [41, 87, 93, 205, 326, 341, 348, 403, 422, 468, 520, 521, 527, 575, 583, 601, 636, 651, 668, 714, 742, 763, 807, 892, 897, 910, 911, 961],
  '★ Bayonet | Fade (Factory New)': [34, 41, 87, 93, 205, 256, 326, 341, 348, 403, 468, 520, 521, 527, 575, 583, 601, 636, 651, 668, 714, 742, 763, 807, 848, 892, 897, 910, 911, 944, 961],
  '★ Flip Knife | Marble Fade (Factory New)': [412],
  '★ Bayonet | Marble Fade (Factory New)': [412],
  'Glock-18 | Fade (Factory New)': [34, 41, 87, 93, 205, 256, 326, 341, 348, 403, 468, 520, 521, 527, 575, 583, 601, 636, 651, 668, 714, 742, 763, 807, 848, 892, 897, 910, 911, 944, 961],
};

const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

async function scanPatterns() {
  console.log('Starting pattern scan...\n');
  let found = 0;

  for (const [skinName, patterns] of Object.entries(SPECIAL_PATTERNS)) {
    try {
      const items = await search(skinName);

      for (const item of items) {
        if (patterns.includes(item.item_paint_seed)) {
          found++;
          console.log(`FOUND: ${skinName}`);
          console.log(`  Pattern: ${item.item_paint_seed}`);
          console.log(`  Price: $${item.price}`);
          console.log(`  Float: ${item.item_float}`);
          console.log('');
        }
      }

      await sleep(100); // Rate limiting
    } catch (error) {
      console.error(`Error scanning ${skinName}:`, error.message);
    }
  }

  console.log(`\nScan complete. Found ${found} special pattern(s).`);
}

scanPatterns();
