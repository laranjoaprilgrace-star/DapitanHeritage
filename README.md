# Dapitan Heritage Tourism — Full Stack Thesis Prototype

A reusable React + Express project for the Dapitan City Rizal Heritage Tourism thesis.

## Folder structure

```text
Dapitan_Heritage_Tourism/
├── frontend/
│   ├── src/
│   ├── package.json
│   └── vite.config.js
├── backend/
│   ├── src/
│   └── package.json
├── package.json
└── README.md
```

## Included heritage sites

1. Rizal Shrine
2. Relief Map of Mindanao
3. Punto del Desembarco de Rizal / Rizal Landing Site

The app includes real coordinates, descriptions, historical background, crowd status, capacity, recommendations, OpenStreetMap, search, site list, history panel, and Google Maps directions using the visitor's current GPS location.

## Run

Open this folder in VS Code, then:

```powershell
npm install
npm run install:all
npm run dev
```

Frontend: http://localhost:5173
Backend: http://localhost:5000

## ESP32 integration

The backend is ready for a later ESP32 integration.

Send:

```http
POST /api/sites/rizal-shrine/occupancy
Content-Type: application/json

{"currentVisitors":25}
```

Available IDs:

- rizal-shrine
- relief-map
- landing-site

The current prototype uses in-memory data. For the thesis deployment, this can later be connected to a database and the actual ESP32 sensor counts.

## Historical sources

Historical text was based on the Dapitan City Official Website and the National Historical Commission of the Philippines registry.

- Dapitan City Official Website — Rizal Shrine
- Dapitan City Official Website — Tourism
- Dapitan City Official Website — Dapitan City History
- National Historical Commission of the Philippines — Dito Lumusad si Rizal
- National Historical Commission of the Philippines — Liwasan ng Dapitan

Prototype visitor numbers are demo values until connected to the actual ESP32 system.
