"use client";
import { useRef } from "react";
import { gsap } from "gsap";

export default function useMediaSync({
  backgroundVideo,
  backgroundMusic,
  hackerMusic,
  rainMusic,
  animeMusic,
  carMusic,
}) {
  const currentAudioRef = useRef(backgroundMusic);

  const switchTheme = async (videoSrc, audioRef, themeClass, showOverlay = false, overlayOverProfile = false) => {
    const video = backgroundVideo.current;
    if (!video) return;

    // Fade out old video
    await gsap.to(video, { opacity: 0, duration: 0.5, ease: "power2.in" });
    video.src = videoSrc;

    // Switch audio
    if (currentAudioRef.current) {
      currentAudioRef.current.pause();
      currentAudioRef.current.currentTime = 0;
    }
    currentAudioRef.current = audioRef.current;
    if (audioRef.current) {
      audioRef.current.volume = backgroundMusic.current?.volume || 0.3;
      audioRef.current.muted = backgroundMusic.current?.muted || true;
      audioRef.current.play().catch(console.error);
    }

    // Update theme class
    document.body.className = themeClass;

    // Show/hide overlays
    document.getElementById("hacker-overlay")?.classList.add("hidden");
    document.getElementById("snow-overlay")?.classList.add("hidden");
    if (showOverlay) {
      if (themeClass === "hacker-theme") {
        document.getElementById("hacker-overlay")?.classList.remove("hidden");
      } else if (themeClass === "rain-theme") {
        document.getElementById("snow-overlay")?.classList.remove("hidden");
      }
    }

    // Show/hide results button
    const resultsBtn = document.getElementById("results-button-container");
    if (themeClass === "hacker-theme") {
      resultsBtn?.classList.remove("hidden");
    } else {
      resultsBtn?.classList.add("hidden");
    }

    // Fade in new video
    gsap.to(video, { opacity: 1, duration: 0.5, ease: "power2.out" });
  };

  return { switchTheme };
}