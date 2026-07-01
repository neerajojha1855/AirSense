import React, { useState, useEffect, useCallback } from 'react';
import MapView from '../components/MapView.jsx';
import ForecastChart from '../components/ForecastChart.jsx';
import AttributionPanel from '../components/AttributionPanel.jsx';
import EnforcementList from '../components/EnforcementList.jsx';
import { fetchZones, fetchForecast, fetchAttribution, fetchEnforcementPriorities } from '../services/api';
import { FALLBACK_ZONES, getAQIColor, getAQICategory } from '../constants/zones';

const DEFAULT_ZONE = 'anand-vihar';

export default function Dashboard() {
  // ── Zone data ────────────────────────────────────────────────
  const [zones, setZones] = useState(FALLBACK_ZONES);
  const [selectedZone, setSelectedZone] = useState(DEFAULT_ZONE);

  // ── Per-zone detail ──────────────────────────────────────────
  const [forecast, setForecast] = useState(null);
  const [attribution, setAttribution] = useState(null);
  const [enforcement, setEnforcement] = useState(null);

  const [fLoading, setFLoading] = useState(false);
  const [aLoading, setALoading] = useState(false);
  const [eLoading, setELoading] = useState(false);
  const [fError, setFError] = useState(null);
  const [aError, setAError] = useState(null);
  const [eError, setEError] = useState(null);

  // ── Active side panel tab ────────────────────────────────────
  const [sideTab, setSideTab] = useState('forecast'); // 'forecast' | 'attribution'

  // Load zones (with fallback)
  useEffect(() => {
    fetchZones()
      .then(data => { if (Array.isArray(data) && data.length) setZones(data); })
      .catch(() => { /* silently use fallback */ });
  }, []);

  // Load enforcement on mount
  useEffect(() => {
    setELoading(true);
    setEError(null);
    fetchEnforcementPriorities(50)
      .then(data => setEnforcement(data))
      .catch(err => setEError(err.message))
      .finally(() => setELoading(false));
  }, []);

  // Load forecast + attribution whenever zone changes
  const loadZoneData = useCallback((zoneId) => {
    setFLoading(true); setFError(null);
    setForecast(null);
    fetchForecast(zoneId)
      .then(d => setForecast(d))
      .catch(e => setFError(e.message))
      .finally(() => setFLoading(false));

    setALoading(true); setAError(null);
    setAttribution(null);
    fetchAttribution(zoneId)
      .then(d => setAttribution(d))
      .catch(e => setAError(e.message))
      .finally(() => setALoading(false));
  }, []);

  useEffect(() => { loadZoneData(selectedZone); }, [selectedZone, loadZoneData]);

  // Enrich zones with attribution dominant source for map coloring
  const enrichedZones = zones.map(z => {
    // Pull from enforcement priorities for mock AQI values
    const ep = enforcement?.priorities?.find(p => p.zoneId === z.zoneId);
    return {
      ...z,
      currentAQI: ep?.evidence?.aqi || z.currentAQI,
      dominantSource: ep?.evidence?.dominantSource || z.dominantSource,
      attributionConfidence: ep?.evidence?.attributionConfidence,
    };
  });

  const selectedZoneMeta = enrichedZones.find(z => z.zoneId === selectedZone);
  const currentAQI = forecast?.forecast?.[0]?.predictedAQI || selectedZoneMeta?.currentAQI;
  const aqiColor = getAQIColor(currentAQI);

  return (
    <div>
      {/* Page header */}
      <div style={{ marginBottom: '1rem' }}>
        <h1 style={{ fontSize: '1.3rem', fontWeight: 800, letterSpacing: '-0.01em' }}>
          Delhi Air Quality Dashboard
        </h1>
        <p style={{ fontSize: '0.8rem', color: '#7b91b0', marginTop: '0.2rem' }}>
          Real-time AQI monitoring · Pollution source attribution · Enforcement priorities
        </p>
      </div>

      {/* Stats row */}
      <div className="stat-row" style={{ marginBottom: '1rem' }}>
        <div className="stat-tile">
          <div className="stat-label">Selected Zone</div>
          <div className="stat-value" style={{ fontSize: '1rem', fontWeight: 700 }}>
            {selectedZoneMeta?.name || selectedZone}
          </div>
          <div className="stat-sub">{selectedZoneMeta?.landUseType || '—'}</div>
        </div>
        <div className="stat-tile">
          <div className="stat-label">Current AQI</div>
          <div className="stat-value" style={{ color: aqiColor }}>
            {currentAQI || '—'}
          </div>
          <div className="stat-sub" style={{ color: aqiColor }}>
            {currentAQI ? getAQICategory(currentAQI) : 'Loading…'}
          </div>
        </div>
        <div className="stat-tile">
          <div className="stat-label">Dominant Source</div>
          <div className="stat-value" style={{ fontSize: '0.95rem', textTransform: 'capitalize' }}>
            {selectedZoneMeta?.dominantSource || '—'}
          </div>
          <div className="stat-sub">
            {selectedZoneMeta?.attributionConfidence
              ? `${Math.round(selectedZoneMeta.attributionConfidence * 100)}% confidence`
              : 'Loading…'}
          </div>
        </div>
        <div className="stat-tile">
          <div className="stat-label">Zones Monitored</div>
          <div className="stat-value">{zones.length}</div>
          <div className="stat-sub">Delhi CAAQMS stations</div>
        </div>
      </div>

      {/* Main grid */}
      <div className="dashboard-grid">
        {/* LEFT: Map + Enforcement */}
        <div className="dashboard-left">
          {/* Map */}
          <div className="card" style={{ padding: '1rem' }}>
            <div className="card-title">
              <span className="card-title-icon">🗺️</span>
              Delhi AQI Map — Click a zone to analyze
            </div>
            <MapView
              zones={enrichedZones}
              onZoneClick={setSelectedZone}
              selectedZone={selectedZone}
            />
          </div>

          {/* Enforcement list */}
          <div className="card">
            <div className="section-header">
              <div>
                <div className="card-title">
                  <span className="card-title-icon">🚨</span>
                  Enforcement Priority List
                </div>
                <div className="section-sub">
                  Sorted by composite score: AQI × Population × Attribution confidence
                </div>
              </div>
              <span className="tag tag-muted" style={{ fontSize: '0.65rem' }}>
                Click card → zoom map
              </span>
            </div>
            <EnforcementList
              priorities={(enforcement?.priorities || []).slice(0, 10)}
              selectedZone={selectedZone}
              onZoneClick={setSelectedZone}
              loading={eLoading}
              error={eError}
            />
          </div>
        </div>

        {/* RIGHT: Forecast + Attribution */}
        <div className="dashboard-right">
          {/* Tab switcher */}
          <div style={{ display: 'flex', gap: '0.4rem', marginBottom: '0.5rem' }}>
            {[
              { id: 'forecast', label: '📈 Forecast' },
              { id: 'attribution', label: '🏭 Attribution' },
            ].map(t => (
              <button
                key={t.id}
                className={`btn btn-ghost${sideTab === t.id ? ' active' : ''}`}
                onClick={() => setSideTab(t.id)}
                style={{ fontSize: '0.82rem', padding: '0.4rem 0.9rem' }}
              >
                {t.label}
              </button>
            ))}
            <button
              className="btn btn-ghost"
              onClick={() => loadZoneData(selectedZone)}
              style={{ marginLeft: 'auto', fontSize: '0.78rem', padding: '0.4rem 0.75rem' }}
              title="Refresh zone data"
            >
              ↻ Refresh
            </button>
          </div>

          {/* Forecast panel */}
          {sideTab === 'forecast' && (
            <div className="card">
              <ForecastChart
                wardId={selectedZone}
                forecast={forecast?.forecast || []}
                baselineComparison={forecast?.baselineComparison}
                loading={fLoading}
                error={fError}
              />
            </div>
          )}

          {/* Attribution panel */}
          {sideTab === 'attribution' && (
            <div className="card">
              <AttributionPanel
                zoneId={selectedZone}
                sources={attribution?.sources || []}
                dominantSource={attribution?.dominantSource}
                windDirection={attribution?.windDirection}
                windSpeed={attribution?.windSpeed}
                loading={aLoading}
                error={aError}
              />
            </div>
          )}

          {/* Zone selector shortcut */}
          <div className="card">
            <div className="card-title">
              <span className="card-title-icon">📍</span>
              Quick Zone Select
            </div>
            <div className="zone-selector">
              {enrichedZones.map(z => (
                <button
                  key={z.zoneId}
                  className={`zone-btn${selectedZone === z.zoneId ? ' active' : ''}`}
                  onClick={() => setSelectedZone(z.zoneId)}
                >
                  {z.name}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
