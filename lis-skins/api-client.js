const axios = require('axios');
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });

const API_KEY = process.env.LIS_SKINS_API_KEY;
const BASE_URL = 'https://api.lis-skins.com/v1';

if (!API_KEY) {
  console.error('LIS_SKINS_API_KEY is required');
  process.exit(1);
}

const client = axios.create({
  baseURL: BASE_URL,
  headers: {
    Accept: 'application/json',
    Authorization: `Bearer ${API_KEY}`,
    'Content-Type': 'application/json',
  }
});

async function getWsToken() {
  const res = await client.get('/user/get-ws-token');
  return res.data.data.token;
}

async function search(names) {
  const params = { game: 'csgo' };
  if (Array.isArray(names)) {
    params['names[]'] = names;
  } else {
    params['names[]'] = names;
  }
  const res = await client.get('/market/search', { params });
  return res.data.data || [];
}

async function buy(ids, options = {}) {
  const { partner, token, maxPrice, customId, skipUnavailable = true } = options;
  const res = await client.post('/market/buy', {
    ids: Array.isArray(ids) ? ids : [ids],
    partner,
    token,
    max_price: maxPrice,
    custom_id: customId,
    skip_unavailable: skipUnavailable,
  });
  return res.data;
}

module.exports = {
  client,
  getWsToken,
  search,
  buy,
  API_KEY,
};
