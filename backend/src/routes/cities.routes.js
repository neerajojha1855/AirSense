/**
 * cities.routes.js
 * GET /api/cities/compare?cities=delhi,mumbai
 * Returns multi-city historical AQI comparison data.
 * Delhi: live pipeline. Mumbai/Kolkata: historical CPCB data only.
 */

const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');

// Load cities mock data
const MOCK_DATA_PATH = path.join(__dirname, '../../../ml-service/data/mock_outputs.json');
let citiesData = null;
try {
  const raw = JSON.parse(fs.readFileSync(MOCK_DATA_PATH, 'utf-8'));
  citiesData = raw.cities;
} catch (e) {
  console.warn('[CITIES] Could not load cities mock data:', e.message);
}

const AVAILABLE_CITIES = ['delhi', 'mumbai', 'kolkata'];

/**
 * GET /api/cities/compare?cities=delhi,mumbai,kolkata
 */
router.get('/compare', (req, res) => {
  const citiesParam = req.query.cities || 'delhi,mumbai';
  const requestedCities = citiesParam.split(',').map((c) => c.trim().toLowerCase());

  // Validate
  const invalid = requestedCities.filter((c) => !AVAILABLE_CITIES.includes(c));
  if (invalid.length > 0) {
    return res.status(400).json({
      error: 'Invalid city names',
      message: `Unknown cities: ${invalid.join(', ')}. Available: ${AVAILABLE_CITIES.join(', ')}`,
    });
  }

  if (!citiesData) {
    return res.status(503).json({ error: 'Cities data unavailable' });
  }

  const result = requestedCities.map((cityName) => citiesData[cityName]).filter(Boolean);
  return res.json({ cities: result, dataNote: 'Delhi uses live pipeline; other cities use historical CPCB data only.' });
});

/**
 * GET /api/cities  — list all available cities
 */
router.get('/', (_req, res) => {
  res.json({ availableCities: AVAILABLE_CITIES });
});

module.exports = router;
