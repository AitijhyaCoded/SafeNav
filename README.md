# SafeNav 🌊🚗

**SafeNav** is an intelligent, ML-powered waterlogging precaution and monitoring system designed to help users navigate safely during monsoon seasons and flood-prone conditions. It provides real-time risk assessment, smart route planning, and live weather updates to ensure safe travel.

## 🚀 Features

- **🗺️ Smart Route Planning**: Find alternative routes that avoid flood-prone areas and waterlogged streets in real-time using advanced pathfinding algorithms.
- **📊 Area Risk Insights**: Get detailed flood risk assessments for specific locations before you travel.
- **🌦️ Live Weather Integration**: Real-time weather updates and monsoon safety warnings powered by OpenWeather API.
- **🤖 ML-Powered Risk Assessment**: Utilizes machine learning models (Scikit-learn) to classify flood risk and predict severity based on environmental factors.
- **🧠 AI Assistant**: Integrated Google Gemini AI for intelligent insights and assistance.
- **📢 Community Reporting**: Report waterlogging issues to help the community stay safe.

## 🛠️ Tech Stack

### Frontend
- **Framework**: [Next.js 13](https://nextjs.org/) (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS, Shadcn/ui
- **Maps**: Leaflet / React-Leaflet
- **State Management**: React Hooks
- **Auth**: Supabase Auth / Clerk

### Backend
- **Framework**: [FastAPI](https://fastapi.tiangolo.com/) (Python)
- **Machine Learning**: Scikit-learn (Joblib for model serialization)
- **AI Integration**: Google Gemini API
- **Data Processing**: Pandas, NumPy

### Infrastructure
- **Database**: Supabase
- **Deployment**: Netlify (Frontend)
- **IDE**: Kiro Specs and Vibe for Dijkstra's Algorithm

## 📋 Prerequisites

Before you begin, ensure you have the following installed:
- **Node.js** (v18 or higher)
- **Python** (v3.9 or higher)
- **npm** or **yarn**

## ⚙️ Installation & Setup

### 1. Clone the Repository
```bash
git clone https://github.com/yourusername/SafeNav.git
cd SafeNav
```

### 2. Frontend Setup
Navigate to the root directory to set up the Next.js frontend.

```bash
# Install dependencies
npm install

# Start the development server
npm run dev
```
The frontend will be available at `http://localhost:3000`.

### 3. Backend Setup
Navigate to the backend directory to set up the FastAPI server.

```bash
cd backend

# Create a virtual environment
python -m venv venv

# Activate the virtual environment
# On Windows:
venv\Scripts\activate
# On macOS/Linux:
source venv/bin/activate

# Install Python dependencies
pip install fastapi uvicorn joblib requests python-dotenv google-generativeai aiofiles

# Start the backend server
uvicorn main:app --reload
```
The backend API will be available at `http://localhost:8000`.

## 🔐 Environment Variables

Create a `.env.local` file in the root directory with the following variables:

```env
# Backend
OPENWEATHER_API_KEY=your_openweather_api_key
GEMINI_API_KEY=your_gemini_api_key

# Frontend (Supabase/Clerk)
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
# Add other necessary keys based on your auth provider
```

## 📂 Project Structure

```
SafeNav/
├── app/                    # Next.js App Router pages
│   ├── auth/               # Authentication pages
│   ├── home/               # Main dashboard
│   └── page.tsx            # Landing page
├── backend/                # FastAPI Backend
│   ├── main.py             # API Entry point
│   ├── models/             # ML Models (.pkl files)
│   └── uploads/            # User uploaded content
├── components/             # React Components
│   ├── ui/                 # Shadcn UI components
│   ├── RiskMap.tsx         # Map visualization
│   └── RouteMap.tsx        # Navigation component
├── lib/                    # Utility functions
├──public/                  # Static assets
├── .kiro/                  # Kiro AI assistant configurations
└── .bolt/                  # Bolt.new configurations
```

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the project
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
