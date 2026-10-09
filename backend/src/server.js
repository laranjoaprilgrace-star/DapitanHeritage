import express from "express";
import cors from "cors";

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

const sites = [
  {
    id: "rizal-shrine",
    name: "Rizal Shrine",
    shortName: "Rizal Shrine",
    position: [8.66722, 123.41667],
    address: "Talisay, Dapitan City, Zamboanga del Norte",
    status: "High",
    currentVisitors: 32,
    capacity: 50,
    description: "The historic estate where Jose Rizal lived during much of his four-year exile in Dapitan.",
    history: "Rizal purchased land in Talisay after receiving his share of a lottery prize in 1892 and moved there in March 1893. During his exile from 1892 to 1896, he worked as a physician, farmer, teacher, merchant, inventor, artist and community worker. The former estate was converted into a memorial park in 1913 and was later declared a national shrine in 1973.",
    highlights: ["Casa Residencia", "Rizal's aqueduct", "Mi Retiro Rock", "Casa Redonda", "Historic Talisay estate"],
    recommendation: "Consider visiting the Relief Map or Landing Site first if you prefer a less crowded stop."
  },
  {
    id: "relief-map",
    name: "Relief Map of Mindanao",
    shortName: "Relief Map",
    position: [8.65487, 123.42471],
    address: "Dapitan City Plaza, near St. James Church, Dapitan City",
    status: "Moderate",
    currentVisitors: 18,
    capacity: 40,
    description: "A historic three-dimensional map of Mindanao associated with Rizal's work to beautify Dapitan's town plaza.",
    history: "The Relief Map of Mindanao was constructed during Rizal's exile in Dapitan in 1892. The National Historical Commission of the Philippines records that Rizal and his former teacher Francisco de Paula Sanchez, S.J., worked on the map with help from church personnel and parish-school students. It was connected with Rizal's plan for improving the town plaza and was later restored during the time of Jose Aseniero.",
    highlights: ["Dapitan City Plaza", "St. James Church", "Rizal's civic work", "National cultural heritage"],
    recommendation: "The Landing Site is nearby and is a good next stop for visitors following Rizal's arrival story."
  },
  {
    id: "landing-site",
    name: "Punto del Desembarco de Rizal",
    shortName: "Rizal Landing Site",
    position: [8.65638, 123.41907],
    address: "Sunset Boulevard, Sta. Cruz, Dapitan City",
    status: "Low",
    currentVisitors: 7,
    capacity: 30,
    description: "The historic beach where Jose Rizal landed in Dapitan to begin his life in exile.",
    history: "According to the NHCP historical marker, Jose Rizal landed at the beach of Sta. Cruz at about 7:00 PM on July 17, 1892. He arrived with Captain Delgras and three artillerymen, then proceeded through Sta. Cruz Street to the Casa Real, where he was presented to Don Ricardo Carnicero, the Spanish politico-military governor of the district.",
    highlights: ["Sta. Cruz beach", "July 17, 1892 landing", "Rizal's arrival in Dapitan", "Sunset Boulevard"],
    recommendation: "This is currently the least crowded of the three featured heritage sites in this prototype."
  }
];

let sensorOverrides = {};

function getSites() {
  return sites.map(site => {
    const currentVisitors = sensorOverrides[site.id]?.currentVisitors ?? site.currentVisitors;
    const percentage = Math.min(100, Math.round((currentVisitors / site.capacity) * 100));
    const status = percentage >= 70 ? "High" : percentage >= 40 ? "Moderate" : "Low";
    return {...site, currentVisitors, status, occupancyPercent: percentage, source: sensorOverrides[site.id] ? "ESP32 sensor data" : "prototype demo data"};
  });
}

app.get("/api/health", (_req, res) => res.json({ ok: true, service: "Dapitan Heritage Tourism API" }));
app.get("/api/sites", (_req, res) => res.json(getSites()));
app.get("/api/sites/:id", (req, res) => {
  const site = getSites().find(s => s.id === req.params.id);
  if (!site) return res.status(404).json({error:"Site not found"});
  res.json(site);
});

// ESP32-ready endpoint: POST { "currentVisitors": 25 }
app.post("/api/sites/:id/occupancy", (req, res) => {
  const site = sites.find(s => s.id === req.params.id);
  const count = Number(req.body.currentVisitors);
  if (!site || !Number.isFinite(count) || count < 0) {
    return res.status(400).json({error:"Invalid site or currentVisitors"});
  }
  sensorOverrides[site.id] = { currentVisitors: Math.round(count), updatedAt: new Date().toISOString() };
  res.json(getSites().find(s => s.id === site.id));
});

app.listen(PORT, () => console.log(`Dapitan Heritage API running at http://localhost:${PORT}`));
