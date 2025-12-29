---
inclusion: always
---

# Technology Stack

## Frontend
- **Framework**: Next.js 13.5.1 with App Router
- **Language**: TypeScript 5.2.2
- **Styling**: Tailwind CSS 3.3.3 with CSS variables and animations
- **UI Components**: Radix UI primitives with shadcn/ui component library
- **Maps**: Leaflet for interactive mapping
- **Charts**: Recharts for data visualization
- **Forms**: React Hook Form with Zod validation
- **Icons**: Lucide React
- **Deployment**: Netlify (configured with @netlify/plugin-nextjs)

## Backend
- **Framework**: FastAPI (Python)
- **ML Models**: scikit-learn models (joblib serialized)
  - `flood_risk_classifier.pkl` - Binary flood risk classification
  - `flood_severity_regressor.pkl` - Flood severity prediction
  - `risk_encoder.pkl` - Risk level encoding
- **External APIs**: OpenWeather API for live weather data
- **CORS**: Configured for localhost:3000 development

## Database & Auth
- **Database**: Supabase
- **Authentication**: Supabase Auth

## Development Tools
- **Linting**: ESLint with Next.js config (builds ignore linting errors)
- **Type Checking**: TypeScript strict mode
- **Package Manager**: npm

## Common Commands

### Frontend Development
```bash
npm run dev          # Start development server
npm run build        # Build for production
npm run start        # Start production server
npm run lint         # Run ESLint
npm run typecheck    # Run TypeScript compiler check
```

### Backend Development
```bash
cd backend
python -m venv venv
venv\Scripts\activate  # Windows
pip install fastapi uvicorn joblib requests python-dotenv
uvicorn main:app --reload  # Start FastAPI server
```

## Configuration Notes
- Images are unoptimized in Next.js config for static deployment
- TypeScript uses path aliases (`@/*` maps to root)
- Tailwind uses CSS variables for theming
- ESLint errors are ignored during builds
- CORS allows all methods/headers for development