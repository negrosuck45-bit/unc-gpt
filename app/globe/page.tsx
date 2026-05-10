"use client";

import React, { useState, useEffect, useRef, useMemo } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { OrbitControls, Sphere, Stars, Html, Float, Text } from "@react-three/drei";
import * as THREE from "three";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Globe as GlobeIcon, 
  TrendingUp, 
  Activity, 
  Zap, 
  Search, 
  X, 
  ExternalLink,
  CloudSun,
  UserCheck,
  History,
  MapPin,
  Flame,
  Waves,
  DollarSign,
  Users,
  BarChart4,
  AlertTriangle
} from "lucide-react";
import { cn } from "@/lib/utils";

// --- Types ---
interface NewsItem {
  id: string;
  title: string;
  country: string;
  continent: string;
  lat: number;
  lng: number;
  category: "Tech" | "Finance" | "Science" | "Arts" | "Crypto" | "War" | "Disaster";
  content: string;
  source: string;
  weather: string;
  temp: string;
  president: string;
  exPresident: string;
  city: string;
  population: string;
  gdp: string;
  currency: string;
  tradingVolume: string;
}

// --- Mock Data with Wars and Disasters ---
const MOCK_NEWS: NewsItem[] = [
  { 
    id: "1", title: "Conflict Escalation in Eastern Europe", country: "Ukraine", continent: "Europe", lat: 48.3794, lng: 31.1656, category: "War", 
    content: "Intense frontline activity reported as strategic positions are contested.", source: "Global Intel",
    weather: "Cold", temp: "2°C", president: "Volodymyr Zelenskyy", exPresident: "Petro Poroshenko", city: "Kyiv",
    population: "38M", gdp: "$160B", currency: "UAH", tradingVolume: "$2.1B"
  },
  { 
    id: "2", title: "7.2 Magnitude Earthquake Hits Coast", country: "Japan", continent: "Asia", lat: 35.6762, lng: 139.6503, category: "Disaster", 
    content: "Tsunami warnings issued for coastal regions following a major seismic event.", source: "Seismic Watch",
    weather: "Clear", temp: "18°C", president: "Shigeru Ishiba", exPresident: "Fumio Kishida", city: "Tokyo",
    population: "125M", gdp: "$4.2T", currency: "JPY", tradingVolume: "$450B"
  },
  { 
    id: "3", title: "Tech Boom in Silicon Valley", country: "USA", continent: "Americas", lat: 37.7749, lng: -122.4194, category: "Tech", 
    content: "New AI breakthroughs are driving massive investments in the Bay Area.", source: "Inshorts",
    weather: "Sunny", temp: "22°C", president: "Joe Biden", exPresident: "Donald Trump", city: "San Francisco",
    population: "333M", gdp: "$25T", currency: "USD", tradingVolume: "$1.2T"
  },
  { 
    id: "4", title: "Economic Shift in London", country: "UK", continent: "Europe", lat: 51.5074, lng: -0.1278, category: "Finance", 
    content: "The city's financial district sees a surge in digital asset trading.", source: "World Trading Data",
    weather: "Cloudy", temp: "15°C", president: "Keir Starmer", exPresident: "Rishi Sunak", city: "London",
    population: "67M", gdp: "$3.1T", currency: "GBP", tradingVolume: "$600B"
  },
  { 
    id: "5", title: "Wildfires Spread in Outback", country: "Australia", continent: "Oceania", lat: -25.2744, lng: 133.7751, category: "Disaster", 
    content: "Emergency services battle record-breaking wildfires across Western Australia.", source: "Climate Watch",
    weather: "Extreme Heat", temp: "42°C", president: "Anthony Albanese", exPresident: "Scott Morrison", city: "Canberra",
    population: "26M", gdp: "$1.5T", currency: "AUD", tradingVolume: "$80B"
  },
  { 
    id: "6", title: "Civil Unrest in Sudan", country: "Sudan", continent: "Africa", lat: 12.8628, lng: 30.2176, category: "War", 
    content: "Humanitarian crisis deepens as internal conflicts continue in the region.", source: "UN News",
    weather: "Hot", temp: "38°C", president: "Abdel Fattah al-Burhan", exPresident: "Omar al-Bashir", city: "Khartoum",
    population: "45M", gdp: "$34B", currency: "SDG", tradingVolume: "$500M"
  }
];

// --- 3D Components ---

function Globe({ onPointClick }: { onPointClick: (item: NewsItem) => void }) {
  const globeRef = useRef<THREE.Group>(null);
  const textureLoader = new THREE.TextureLoader();
  
  // High-res textures (using placeholders that look like the reference)
  const dayTexture = textureLoader.load("https://raw.githubusercontent.com/mrdoob/three.js/master/examples/textures/planets/earth_atmos_2048.jpg");
  
  useFrame(() => {
    if (globeRef.current) {
      globeRef.current.rotation.y += 0.0015;
    }
  });

  const points = useMemo(() => {
    return MOCK_NEWS.map((item) => {
      const phi = (90 - item.lat) * (Math.PI / 180);
      const theta = (item.lng + 180) * (Math.PI / 180);
      const radius = 2.05;
      const x = -(radius * Math.sin(phi) * Math.cos(theta));
      const z = radius * Math.sin(phi) * Math.sin(theta);
      const y = radius * Math.cos(phi);
      return { ...item, position: [x, y, z] as [number, number, number] };
    });
  }, []);

  return (
    <group ref={globeRef}>
      {/* Main Globe with Texture */}
      <Sphere args={[2, 64, 64]}>
        <meshPhongMaterial
          map={dayTexture}
          emissive="#112240"
          emissiveIntensity={0.2}
          specular="#233554"
          shininess={5}
        />
      </Sphere>

      {/* Glowing Atmosphere/Outline */}
      <Sphere args={[2.1, 64, 64]}>
        <meshBasicMaterial color="#64ffda" wireframe transparent opacity={0.05} />
      </Sphere>

      {/* News/Crisis Points */}
      {points.map((point) => (
        <group key={point.id} position={point.position}>
          <mesh onClick={() => onPointClick(point)}>
            <sphereGeometry args={[0.05, 16, 16]} />
            <meshBasicMaterial 
              color={point.category === "War" ? "#ff4d4d" : point.category === "Disaster" ? "#ffa500" : "#64ffda"} 
            />
          </mesh>
          <pointLight 
            color={point.category === "War" ? "#ff4d4d" : point.category === "Disaster" ? "#ffa500" : "#64ffda"} 
            intensity={1} 
            distance={2} 
          />
          <Html distanceFactor={10}>
            <div className="pointer-events-none select-none">
              <div className={cn(
                "px-2 py-1 bg-black/90 border rounded text-[8px] font-bold whitespace-nowrap backdrop-blur-sm flex items-center gap-1",
                point.category === "War" ? "border-red-500 text-red-500" : 
                point.category === "Disaster" ? "border-orange-500 text-orange-500" : 
                "border-[#64ffda] text-[#64ffda]"
              )}>
                {point.category === "War" && <Flame className="w-2 h-2" />}
                {point.category === "Disaster" && <AlertTriangle className="w-2 h-2" />}
                {point.country}
              </div>
            </div>
          </Html>
        </group>
      ))}
    </group>
  );
}

export default function GlobePage() {
  const [selectedNews, setSelectedNews] = useState<NewsItem | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  const filteredNews = MOCK_NEWS.filter(item => 
    item.country.toLowerCase().includes(searchQuery.toLowerCase()) ||
    item.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="flex h-screen bg-[#020c1b] text-[#ccd6f6] font-mono overflow-hidden selection:bg-[#64ffda]/30">
      {/* Sidebar */}
      <div className="w-80 bg-[#0a192f]/90 backdrop-blur-xl border-r border-[#233554] flex flex-col z-20">
        <div className="p-6 border-b border-[#233554]">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-lg bg-[#64ffda]/10 flex items-center justify-center border border-[#64ffda]/20">
              <GlobeIcon className="w-6 h-6 text-[#64ffda]" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-white tracking-tight">GLOBAL INTEL</h1>
              <p className="text-[10px] text-[#64ffda] font-bold uppercase tracking-widest">Command Center v3.0</p>
            </div>
          </div>

          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#8892b0]" />
            <input
              type="text"
              placeholder="Search global events..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-[#112240] border border-[#233554] rounded-md py-2 pl-10 pr-4 text-xs focus:ring-1 focus:ring-[#64ffda] outline-none transition-all"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 custom-scrollbar space-y-3">
          <div className="text-[10px] font-bold text-[#8892b0] uppercase tracking-widest mb-2 px-2">Active Alerts</div>
          {filteredNews.map((item) => (
            <div
              key={item.id}
              onClick={() => setSelectedNews(item)}
              className={cn(
                "p-3 rounded-lg bg-[#112240]/50 border cursor-pointer transition-all group",
                item.category === "War" ? "border-red-500/30 hover:border-red-500" : 
                item.category === "Disaster" ? "border-orange-500/30 hover:border-orange-500" : 
                "border-[#233554] hover:border-[#64ffda]/50"
              )}
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-1.5">
                  {item.category === "War" ? <Flame className="w-3 h-3 text-red-500" /> : 
                   item.category === "Disaster" ? <AlertTriangle className="w-3 h-3 text-orange-500" /> : 
                   <Activity className="w-3 h-3 text-[#64ffda]" />}
                  <span className={cn(
                    "text-[9px] font-bold uppercase",
                    item.category === "War" ? "text-red-500" : 
                    item.category === "Disaster" ? "text-orange-500" : 
                    "text-[#64ffda]"
                  )}>{item.category}</span>
                </div>
                <span className="text-[9px] text-[#8892b0]">{item.country}</span>
              </div>
              <h3 className="text-xs font-bold text-white group-hover:text-[#64ffda] transition-colors line-clamp-2">{item.title}</h3>
            </div>
          ))}
        </div>
      </div>

      {/* Main Content (Globe) */}
      <div className="flex-1 relative">
        <div className="absolute inset-0 z-0">
          <Canvas camera={{ position: [0, 0, 6], fov: 45 }}>
            <ambientLight intensity={0.5} />
            <pointLight position={[10, 10, 10]} intensity={1} />
            <Stars radius={100} depth={50} count={5000} factor={4} saturation={0} fade speed={1} />
            <Globe onPointClick={setSelectedNews} />
            <OrbitControls enablePan={false} minDistance={3} maxDistance={10} autoRotate={!selectedNews} autoRotateSpeed={0.5} />
          </Canvas>
        </div>

        {/* News Detail Modal */}
        <AnimatePresence>
          {selectedNews && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="absolute bottom-10 left-1/2 -translate-x-1/2 w-full max-w-4xl z-30 px-6"
            >
              <div className={cn(
                "bg-[#0a192f]/95 backdrop-blur-2xl border rounded-2xl shadow-2xl overflow-hidden",
                selectedNews.category === "War" ? "border-red-500/50" : 
                selectedNews.category === "Disaster" ? "border-orange-500/50" : 
                "border-[#64ffda]/30"
              )}>
                <div className="p-6">
                  <div className="flex items-start justify-between mb-6">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className={cn(
                          "px-2 py-0.5 text-[9px] font-bold rounded border uppercase",
                          selectedNews.category === "War" ? "bg-red-500/10 text-red-500 border-red-500/20" : 
                          selectedNews.category === "Disaster" ? "bg-orange-500/10 text-orange-500 border-orange-500/20" : 
                          "bg-[#64ffda]/10 text-[#64ffda] border-[#64ffda]/20"
                        )}>
                          {selectedNews.category}
                        </span>
                        <span className="text-[10px] text-[#8892b0] font-bold uppercase tracking-widest">
                          {selectedNews.continent} • {selectedNews.source}
                        </span>
                      </div>
                      <h2 className="text-2xl font-bold text-white leading-tight">{selectedNews.title}</h2>
                    </div>
                    <button onClick={() => setSelectedNews(null)} className="p-2 hover:bg-[#112240] rounded-full transition-colors">
                      <X className="w-5 h-5 text-[#8892b0]" />
                    </button>
                  </div>

                  {/* Intelligence Grid */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                    <div className="p-3 bg-[#112240]/50 border border-[#233554] rounded-lg">
                      <div className="flex items-center gap-2 mb-1">
                        <Users className="w-3 h-3 text-[#64ffda]" />
                        <span className="text-[8px] text-[#8892b0] uppercase font-bold">Population</span>
                      </div>
                      <p className="text-xs text-white font-bold">{selectedNews.population}</p>
                    </div>
                    <div className="p-3 bg-[#112240]/50 border border-[#233554] rounded-lg">
                      <div className="flex items-center gap-2 mb-1">
                        <BarChart4 className="w-3 h-3 text-blue-400" />
                        <span className="text-[8px] text-[#8892b0] uppercase font-bold">GDP</span>
                      </div>
                      <p className="text-xs text-white font-bold">{selectedNews.gdp}</p>
                    </div>
                    <div className="p-3 bg-[#112240]/50 border border-[#233554] rounded-lg">
                      <div className="flex items-center gap-2 mb-1">
                        <DollarSign className="w-3 h-3 text-green-400" />
                        <span className="text-[8px] text-[#8892b0] uppercase font-bold">Currency</span>
                      </div>
                      <p className="text-xs text-white font-bold">{selectedNews.currency}</p>
                    </div>
                    <div className="p-3 bg-[#112240]/50 border border-[#233554] rounded-lg">
                      <div className="flex items-center gap-2 mb-1">
                        <TrendingUp className="w-3 h-3 text-purple-400" />
                        <span className="text-[8px] text-[#8892b0] uppercase font-bold">Trading Vol</span>
                      </div>
                      <p className="text-xs text-white font-bold">{selectedNews.tradingVolume}</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className="space-y-4">
                      <h3 className="text-[10px] font-bold text-[#64ffda] uppercase tracking-widest">Situation Report</h3>
                      <p className="text-sm text-[#8892b0] leading-relaxed">{selectedNews.content}</p>
                    </div>
                    <div className="space-y-4">
                      <h3 className="text-[10px] font-bold text-[#64ffda] uppercase tracking-widest">Regional Intel</h3>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1">
                          <span className="text-[8px] text-[#8892b0] uppercase">President</span>
                          <p className="text-xs text-white">{selectedNews.president}</p>
                        </div>
                        <div className="space-y-1">
                          <span className="text-[8px] text-[#8892b0] uppercase">Weather</span>
                          <p className="text-xs text-white">{selectedNews.weather} ({selectedNews.temp})</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
