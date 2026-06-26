import React from 'react';
import AdvisoryChat from '../components/AdvisoryChat.jsx';

export default function AdvisoryPage() {
  return (
    <div>
      {/* Page header */}
      <div style={{ marginBottom: '1.25rem' }}>
        <h1 style={{ fontSize: '1.3rem', fontWeight: 800, letterSpacing: '-0.01em' }}>
          Citizen Health Advisory
        </h1>
        <p style={{ fontSize: '0.8rem', color: '#7b91b0', marginTop: '0.2rem' }}>
          Ask AirSense about air quality, health precautions, and safe outdoor activity — in Hindi or English.
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '1rem' }}>
        {/* Chat */}
        <div className="card">
          <div className="card-title">
            <span className="card-title-icon">💬</span>
            Health Advisory Chat
            <span className="tag tag-blue" style={{ marginLeft: 'auto', fontSize: '0.65rem' }}>
              Powered by Gemini 2.5 Flash
            </span>
          </div>
          <AdvisoryChat />
        </div>

        {/* Info sidebar */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {/* AQI guide */}
          <div className="card">
            <div className="card-title">📊 AQI Reference Guide</div>
            {[
              { range: '0–50',   label: 'Good',         color: '#22c55e', tip: 'Ideal for all activities.' },
              { range: '51–100', label: 'Satisfactory',  color: '#a3e635', tip: 'Minor concern for sensitive groups.' },
              { range: '101–200',label: 'Moderate',      color: '#facc15', tip: 'Limit prolonged outdoor exertion.' },
              { range: '201–300',label: 'Poor',          color: '#f97316', tip: 'Avoid outdoor activity if possible.' },
              { range: '301–400',label: 'Very Poor',     color: '#ef4444', tip: 'Stay indoors. Use air purifier.' },
              { range: '400+',   label: 'Severe',        color: '#7c3aed', tip: 'Health emergency. N95 mandatory.' },
            ].map(({ range, label, color, tip }) => (
              <div key={range} style={{ display: 'flex', alignItems: 'flex-start', gap: '0.6rem', marginBottom: '0.65rem' }}>
                <span style={{ width: 10, height: 10, borderRadius: '50%', background: color, marginTop: '0.25rem', flexShrink: 0 }} />
                <div>
                  <div style={{ fontSize: '0.8rem', fontWeight: 600, color }}>
                    {range} — {label}
                  </div>
                  <div style={{ fontSize: '0.72rem', color: '#7b91b0' }}>{tip}</div>
                </div>
              </div>
            ))}
          </div>

          {/* Tips */}
          <div className="card">
            <div className="card-title">🛡️ General Health Tips</div>
            {[
              '👶 Keep children indoors when AQI > 150',
              '🏃 Avoid running near busy roads at peak hours (7–10 AM)',
              '😷 N95/N99 masks reduce PM2.5 exposure by ~95%',
              '🌿 Indoor plants can marginally improve air quality',
              '💧 Stay hydrated — helps respiratory mucosa',
              '🏥 Asthma/COPD patients: carry inhaler outdoors',
            ].map(tip => (
              <div key={tip} style={{ fontSize: '0.78rem', color: '#7b91b0', marginBottom: '0.5rem', lineHeight: 1.5 }}>
                {tip}
              </div>
            ))}
          </div>

          {/* Languages */}
          <div className="card">
            <div className="card-title">🌐 Language Support</div>
            <div style={{ fontSize: '0.78rem', color: '#7b91b0', lineHeight: 1.7 }}>
              <div>✅ English — Full support</div>
              <div>✅ Hindi (हिंदी) — Full support</div>
              <div style={{ marginTop: '0.5rem', color: '#4a5d78', fontSize: '0.7rem' }}>
                More regional languages are a future roadmap item.
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
