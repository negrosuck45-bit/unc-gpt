"use client";

import { useState, useEffect, useRef } from "react";
import { Search, Play, Pause, SkipBack, SkipForward, Volume2, Music, Heart, List, Home, Library, PlusSquare, Disc, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";

const CLIENT_ID = "f83d895a0f8f4ecca67de9565f379f80";
const CLIENT_SECRET = "6b57b4c6fa8b488c84b3fbe0c6ee0dca";

export default function SpotifyPage() {
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [tracks, setTracks] = useState<any[]>([]);
  const [currentTrack, setCurrentTrack] = useState<any>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [youtubeId, setYoutubeId] = useState<string | null>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    const fetchToken = async () => {
      try {
        const res = await fetch("https://accounts.spotify.com/api/token", {
          method: "POST",
          headers: {
            "Content-Type": "application/x-www-form-urlencoded",
            Authorization: "Basic " + btoa(CLIENT_ID + ":" + CLIENT_SECRET),
          },
          body: "grant_type=client_credentials",
        });
        const data = await res.json();
        setAccessToken(data.access_token);
      } catch (err) {
      }
    };
    fetchToken();
  }, []);

  const searchTracks = async (query: string) => {
    if (!accessToken || !query.trim()) return;
    setIsLoading(true);
    try {
      const res = await fetch(`https://api.spotify.com/v1/search?q=${encodeURIComponent(query)}&type=track&limit=30`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      const data = await res.json();
      setTracks(data.tracks?.items || []);
    } catch (err) {
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchQuery) searchTracks(searchQuery);
      else if (accessToken) searchTracks("top hits 2026"); // Default content
    }, 500);
    return () => clearTimeout(timer);
  }, [searchQuery, accessToken]);

  const playTrack = async (track: any) => {
    setCurrentTrack(track);
    setIsPlaying(true);
    const query = `${track.name} ${track.artists[0].name} official audio`;
    try {
      const searchRes = await fetch(`https://pipedapi.kavin.rocks/search?q=${encodeURIComponent(query)}&filter=videos`);
      const searchData = await searchRes.json();
      if (searchData.items && searchData.items.length > 0) {
        const videoId = searchData.items[0].url.split("v=")[1];
        setYoutubeId(videoId);
      }
    } catch (err) {
    }
  };

  const togglePlay = () => {
    if (!youtubeId) return;
    const message = isPlaying ? '{"event":"command","func":"pauseVideo","args":""}' : '{"event":"command","func":"playVideo","args":""}';
    iframeRef.current?.contentWindow?.postMessage(message, '*');
    setIsPlaying(!isPlaying);
  };

  return (
    <div className="flex h-screen bg-black text-white font-sans overflow-hidden">
      <div className="w-64 bg-black p-6 flex flex-col gap-6 border-r border-white/10 hidden md:flex">
        <div className="flex items-center gap-2 text-2xl font-bold mb-4">
          <Disc className="w-8 h-8 text-green-500 animate-spin-slow" />
          <span>Sportfy</span>
        </div>
        <nav className="flex flex-col gap-4">
          <div className="flex items-center gap-4 text-gray-400 hover:text-white cursor-pointer transition-colors">
            <Home className="w-6 h-6" />
            <span className="font-semibold">Home</span>
          </div>
          <div className="flex items-center gap-4 text-gray-400 hover:text-white cursor-pointer transition-colors">
            <Search className="w-6 h-6" />
            <span className="font-semibold">Search</span>
          </div>
          <div className="flex items-center gap-4 text-gray-400 hover:text-white cursor-pointer transition-colors">
            <Library className="w-6 h-6" />
            <span className="font-semibold">Your Library</span>
          </div>
        </nav>
      </div>

      <div className="flex-1 flex flex-col bg-gradient-to-b from-zinc-900 to-black overflow-hidden">
        <header className="p-4 flex items-center justify-between sticky top-0 bg-zinc-900/50 backdrop-blur-md z-10">
          <div className="relative w-full max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search for any song, artist..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-zinc-800 border-none rounded-full py-2 pl-10 pr-4 text-sm focus:ring-2 focus:ring-white/20 outline-none"
            />
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-6 custom-scrollbar">
          <div className="mb-8 relative h-32 bg-zinc-800/30 rounded-xl overflow-hidden flex items-center justify-center">
             <div className="z-10 text-center">
                <h2 className="text-2xl font-bold mb-2">Sportfy Music</h2>
                <div className="flex items-end gap-1 h-8">
                  {[...Array(20)].map((_, i) => (
                    <motion.div
                      key={i}
                      animate={{ height: isPlaying ? [10, 32, 15, 28, 12] : 10 }}
                      transition={{ duration: 0.5, repeat: Infinity, delay: i * 0.05 }}
                      className="w-1 bg-green-500 rounded-full"
                    />
                  ))}
                </div>
             </div>
          </div>

          {isLoading ? (
            <div className="flex items-center justify-center h-64">
              <Loader2 className="w-8 h-8 animate-spin text-green-500" />
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-6">
              {tracks.map((track) => (
                <motion.div
                  key={track.id}
                  whileHover={{ scale: 1.05 }}
                  onClick={() => playTrack(track)}
                  className={cn(
                    "bg-zinc-900/40 p-4 rounded-lg cursor-pointer hover:bg-zinc-800/60 transition-all group relative",
                    currentTrack?.id === track.id && "bg-zinc-800"
                  )}
                >
                  <div className="relative aspect-square mb-4 shadow-2xl">
                    <img
                      src={track.album.images[0]?.url || "https://via.placeholder.com/300"}
                      alt={track.name}
                      className="w-full h-full object-cover rounded-md"
                    />
                    <div className="absolute bottom-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity translate-y-2 group-hover:translate-y-0">
                      <button className="w-12 h-12 bg-green-500 rounded-full flex items-center justify-center shadow-xl hover:scale-110 transition-transform">
                        <Play className="w-6 h-6 text-black fill-current" />
                      </button>
                    </div>
                  </div>
                  <h3 className="font-bold truncate mb-1">{track.name}</h3>
                  <p className="text-sm text-gray-400 truncate">{track.artists.map((a: any) => a.name).join(", ")}</p>
                </motion.div>
              ))}
            </div>
          )}
        </main>

        <AnimatePresence>
          {currentTrack && (
            <motion.footer
              initial={{ y: 100 }}
              animate={{ y: 0 }}
              className="h-24 bg-black border-t border-white/10 px-4 flex items-center justify-between z-20"
            >
              <div className="flex items-center gap-4 w-1/3">
                <img src={currentTrack.album.images[0]?.url} alt={currentTrack.name} className="w-14 h-14 rounded shadow-lg" />
                <div className="overflow-hidden">
                  <h4 className="font-bold text-sm truncate">{currentTrack.name}</h4>
                  <p className="text-xs text-gray-400 truncate">{currentTrack.artists.map((a: any) => a.name).join(", ")}</p>
                </div>
              </div>

              <div className="flex flex-col items-center gap-2 w-1/3">
                <div className="flex items-center gap-6">
                  <SkipBack className="w-5 h-5 text-gray-400 hover:text-white cursor-pointer" />
                  <button onClick={togglePlay} className="w-8 h-8 bg-white rounded-full flex items-center justify-center hover:scale-105 transition-transform">
                    {isPlaying ? <Pause className="w-5 h-5 text-black fill-current" /> : <Play className="w-5 h-5 text-black fill-current ml-0.5" />}
                  </button>
                  <SkipForward className="w-5 h-5 text-gray-400 hover:text-white cursor-pointer" />
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 w-1/3">
                <Volume2 className="w-5 h-5 text-gray-400 hover:text-white cursor-pointer" />
                <div className="w-24 h-1 bg-zinc-800 rounded-full overflow-hidden group cursor-pointer">
                  <div className="h-full bg-white group-hover:bg-green-500 w-2/3 transition-colors" />
                </div>
              </div>
            </motion.footer>
          )}
        </AnimatePresence>

        {youtubeId && (
          <div className="hidden">
            <iframe ref={iframeRef} width="1" height="1" src={`https://www.youtube.com/embed/${youtubeId}?enablejsapi=1&autoplay=1`} allow="autoplay" />
          </div>
        )}
      </div>

      <style jsx global>{`
        .animate-spin-slow { animation: spin 8s linear infinite; }
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        .custom-scrollbar::-webkit-scrollbar { width: 12px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(255, 255, 255, 0.1); border-radius: 10px; border: 3px solid transparent; background-clip: content-box; }
      `}</style>
    </div>
  );
}
