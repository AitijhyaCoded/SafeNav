---
inclusion: always
---

# Project Structure

## Root Directory Organization

```
├── app/                    # Next.js App Router pages
├── backend/               # FastAPI Python backend
├── components/            # React components
├── hooks/                 # Custom React hooks
├── lib/                   # Utility functions
├── .kiro/                 # Kiro AI assistant configuration
├── .bolt/                 # Bolt.new configuration
└── node_modules/          # Frontend dependencies
```

## Frontend Structure (`app/`)
- **App Router**: Uses Next.js 13+ app directory structure
- **Pages**: 
  - `/` - Landing page
  - `/auth` - Authentication page
  - `/home` - Main application dashboard
- **Layout**: Root layout with Inter font and Leaflet CSS imports
- **Globals**: Global CSS with Tailwind directives

## Components (`components/`)
- **Custom Components**:
  - `AreaRiskInsights.tsx` - Risk assessment display
  - `RouteMap.tsx` - Interactive map component
- **UI Components** (`components/ui/`): Complete shadcn/ui component library
  - Form controls, navigation, feedback, layout components
  - All components use Radix UI primitives with Tailwind styling

## Backend Structure (`backend/`)
- **`main.py`**: FastAPI application with ML model integration
- **ML Models**: Pre-trained pickle files
  - `flood_risk_classifier.pkl`
  - `flood_severity_regressor.pkl` 
  - `risk_encoder.pkl`
- **`ml_prep.ipynb`**: Jupyter notebook for model training
- **`venv/`**: Python virtual environment
- **`__pycache__/`**: Python bytecode cache

## Configuration Files
- **`components.json`**: shadcn/ui configuration with path aliases
- **`tailwind.config.ts`**: Tailwind CSS configuration with custom theme
- **`tsconfig.json`**: TypeScript configuration with path mapping
- **`next.config.js`**: Next.js configuration for static deployment
- **`.env.local`**: Environment variables (not tracked)

## Key Conventions
- Use `@/` path alias for imports from project root
- Components follow PascalCase naming
- Pages use lowercase with hyphens for routes
- All UI components are in `components/ui/` directory
- Custom hooks go in `hooks/` directory
- Utility functions go in `lib/` directory
- Backend API endpoints follow REST conventions