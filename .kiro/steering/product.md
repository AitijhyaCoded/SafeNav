---
inclusion: always
---

# SafeNav Product Guidelines

SafeNav is an ML-based waterlogging precaution and monitoring system for safe navigation during monsoon seasons and flood conditions.

## Core Product Features

- **Smart Route Planning**: Alternative routes avoiding flood-prone areas using real-time data
- **Area Risk Insights**: ML-powered flood risk assessment for any location
- **Live Weather Integration**: OpenWeather API integration for real-time alerts
- **ML Risk Assessment**: Three models for classification, severity prediction, and risk encoding

## Development Conventions

### User Experience Principles
- Prioritize safety over convenience in all routing decisions
- Display risk levels clearly with color-coded indicators (green/yellow/red)
- Provide alternative routes when primary routes have flood risks
- Show confidence levels for ML predictions to build user trust

### Data Handling Standards
- All location data should include coordinates and risk assessment
- Weather data must be refreshed every 15 minutes during active sessions
- ML model predictions should include confidence scores
- Route calculations must consider both current and predicted conditions

### API Integration Patterns
- Backend endpoints should follow `/api/v1/` prefix convention
- All responses include status, data, and timestamp fields
- Error responses must provide actionable user guidance
- Weather API calls should be cached to respect rate limits

### ML Model Usage
- Use `flood_risk_classifier.pkl` for binary risk assessment
- Use `flood_severity_regressor.pkl` for severity scoring (0-10 scale)
- Use `risk_encoder.pkl` for categorical risk level encoding
- Always validate model inputs and handle prediction failures gracefully

### Safety-First Design
- Never suggest routes through high-risk areas without explicit warnings
- Provide emergency contact information in high-risk situations
- Include disclaimers about real-time conditions changing rapidly
- Offer "safe mode" routing that prioritizes main roads and elevated routes

## Component Responsibilities

### RouteMap Component
- Display interactive maps with risk overlays
- Handle route selection and alternative suggestions
- Show real-time weather conditions on map

### AreaRiskInsights Component
- Present ML model predictions with confidence indicators
- Display historical flood data for context
- Provide actionable recommendations based on risk levels

### ReportIssue Component
- Allow users to report current flooding conditions
- Validate reports against ML predictions for accuracy
- Contribute to real-time risk assessment updates