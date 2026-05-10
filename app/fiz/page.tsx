"use client";

import { useRef, useEffect, useState, RefObject, useCallback } from "react";
import { gsap } from "gsap";
import styles from "./page.module.css";

// -------------------- Tilt Hook --------------------
function useTilt(ref: RefObject<HTMLDivElement | null>, enabled: boolean) {
  useEffect(() => {
    document.body.style.perspective = "1000px";
    const el = ref.current;
    if (!el || !enabled) return;

    const handleMove = (e: MouseEvent | TouchEvent) => {
      const rect = el.getBoundingClientRect();
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;
      let clientX: number, clientY: number;
      if ("touches" in e) {
        clientX = e.touches[0].clientX;
        clientY = e.touches[0].clientY;
      } else {
        clientX = (e as MouseEvent).clientX;
        clientY = (e as MouseEvent).clientY;
      }
      const mouseX = clientX - centerX;
      const mouseY = clientY - centerY;
      const maxTilt = 15;
      const tiltX = (mouseY / rect.height) * maxTilt;
      const tiltY = -(mouseX / rect.width) * maxTilt;
      gsap.to(el, {
        rotationX: tiltX,
        rotationY: tiltY,
        duration: 0.3,
        ease: "power2.out",
        transformPerspective: 1000,
        overwrite: "auto",
      });
    };

    const handleLeave = () => {
      gsap.to(el, {
        rotationX: 0,
        rotationY: 0,
        duration: 0.5,
        ease: "power2.out",
        overwrite: "auto",
      });
    };

    el.addEventListener("mousemove", handleMove);
    el.addEventListener("mouseleave", handleLeave);
    el.addEventListener("touchmove", handleMove, { passive: false });
    el.addEventListener("touchend", handleLeave);

    return () => {
      el.removeEventListener("mousemove", handleMove);
      el.removeEventListener("mouseleave", handleLeave);
      el.removeEventListener("touchmove", handleMove);
      el.removeEventListener("touchend", handleLeave);
      gsap.to(el, { rotationX: 0, rotationY: 0, duration: 0.5 });
    };
  }, [enabled, ref]);
}

export default function FizPage() {
  const [started, setStarted] = useState(false);
  const [skillsVisible, setSkillsVisible] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [volume, setVolume] = useState(0.3);
  const [transparency, setTransparency] = useState(0.7);
  const [visitorCount, setVisitorCount] = useState(50);

  const backgroundVideoRef = useRef<HTMLVideoElement>(null);
  const backgroundMusicRef = useRef<HTMLAudioElement>(null);
  const hackerMusicRef = useRef<HTMLAudioElement>(null);
  const rainMusicRef = useRef<HTMLAudioElement>(null);
  const animeMusicRef = useRef<HTMLAudioElement>(null);
  const carMusicRef = useRef<HTMLAudioElement>(null);
  const profileBlockRef = useRef<HTMLDivElement>(null);
  const skillsBlockRef = useRef<HTMLDivElement>(null);
  const profileContainerRef = useRef<HTMLDivElement>(null);
  const glitchOverlayRef = useRef<HTMLDivElement>(null);
  const currentAudioRef = useRef<RefObject<HTMLAudioElement | null>>(backgroundMusicRef);

  // Keep a ref of latest isMuted/volume so callbacks always see current values
  const isMutedRef = useRef(isMuted);
  const volumeRef = useRef(volume);
  useEffect(() => { isMutedRef.current = isMuted; }, [isMuted]);
  useEffect(() => { volumeRef.current = volume; }, [volume]);

  // Cursor
  useEffect(() => {
    const cursor = document.querySelector<HTMLElement>(`.${styles.customCursor}`);
    if (!cursor) return;
    const isTouch = window.matchMedia("(pointer: coarse)").matches;
    const move = (e: MouseEvent | TouchEvent) => {
      let cx: number, cy: number;
      if ("touches" in e) { cx = e.touches[0].clientX; cy = e.touches[0].clientY; }
      else { cx = (e as MouseEvent).clientX; cy = (e as MouseEvent).clientY; }
      cursor.style.left = `${cx}px`; cursor.style.top = `${cy}px`; cursor.style.display = "block";
    };
    const shrink = () => cursor.style.transform = "scale(0.8) translate(-50%, -50%)";
    const grow = () => cursor.style.transform = "scale(1) translate(-50%, -50%)";
    if (isTouch) {
      document.addEventListener("touchstart", move); document.addEventListener("touchmove", move);
      document.addEventListener("touchend", () => cursor.style.display = "none");
    } else {
      document.addEventListener("mousemove", move); document.addEventListener("mousedown", shrink);
      document.addEventListener("mouseup", grow);
    }
    return () => {
      if (isTouch) { document.removeEventListener("touchstart", move); document.removeEventListener("touchmove", move); }
      else { document.removeEventListener("mousemove", move); document.removeEventListener("mousedown", shrink); document.removeEventListener("mouseup", grow); }
    };
  }, []);

  // Visitor counter
  useEffect(() => {
    const stored = parseInt(localStorage.getItem("totalVisitorCount") ?? "", 10);
    let total = !Number.isNaN(stored) && stored >= 50 && stored <= 1000 ? stored : 50;
    total += 1; localStorage.setItem("totalVisitorCount", total.toString()); setVisitorCount(total);
  }, []);

  // Typing: start text
  useEffect(() => {
    const el = document.getElementById("start-text"); if (!el) return;
    const msg = "Click to enter...."; let i = 0, txt = "", show = true;
    const iv = setInterval(() => { show = !show; el.textContent = txt + (show ? "|" : " "); }, 500);
    const type = () => { if (i < msg.length) { txt = msg.slice(0, i + 1); i++; setTimeout(type, 100); } };
    type(); return () => clearInterval(iv);
  }, []);

  // Typing: profile name
  useEffect(() => {
    const el = document.getElementById("profile-name"); if (!el) return;
    const name = "fiz"; let i = 0, txt = "", del = false, show = true;
    const iv = setInterval(() => { show = !show; el.textContent = txt + (show ? "|" : " "); }, 500);
    const tick = () => {
      if (!del && i < name.length) { txt = name.slice(0, i + 1); i++; }
      else if (del && i > 0) { txt = name.slice(0, i - 1); i--; }
      else if (i === name.length) { del = true; setTimeout(tick, 10000); return; }
      else if (i === 0) del = false;
      setTimeout(tick, del ? 150 : 300);
    };
    tick(); return () => clearInterval(iv);
  }, []);

  // Typing: profile bio
  useEffect(() => {
    const el = document.getElementById("profile-bio"); if (!el) return;
    const msgs = [' go beyond ', '"Hello this is fiz"'];
    let mi = 0, ci = 0, txt = "", del = false, show = true;
    const iv = setInterval(() => { show = !show; el.textContent = txt + (show ? "|" : " "); }, 500);
    const tick = () => {
      const full = msgs[mi];
      if (!del && ci < full.length) { txt = full.slice(0, ci + 1); ci++; }
      else if (del && ci > 0) { txt = full.slice(0, ci - 1); ci--; }
      else if (ci === full.length) { del = true; setTimeout(tick, 2000); return; }
      else if (ci === 0 && del) { del = false; mi = (mi + 1) % msgs.length; }
      setTimeout(tick, del ? 75 : 150);
    };
    tick(); return () => clearInterval(iv);
  }, []);

  // Discord activity
  useEffect(() => {
    const el = document.getElementById("discord-activity"); if (!el) return;
    const fetchAct = async () => {
      try {
        const res = await fetch("https://api.lanyard.rest/v1/users/1362023234718924994");
        const data = await res.json();
        if (!data.success) { el.textContent = "Join Lanyard server to show status"; return; }
        const { activities, discord_status } = data.data;
        const active = activities?.find((a: any) => a.type === 0);
        let txt = "Online";
        if (discord_status === "offline") txt = "Offline";
        else if (activities?.some((a: any) => a.type === 4)) {
          const cs = activities.find((a: any) => a.type === 4); txt = cs.state || "Online";
        } else if (active) {
          txt = `Playing ${active.name}` + (active.state ? ` (${active.state})` : "");
        }
        el.textContent = txt;
      } catch { el.textContent = "Status error"; }
    };
    fetchAct(); const iv = setInterval(fetchAct, 15000); return () => clearInterval(iv);
  }, []);

  useTilt(profileBlockRef, started && !skillsVisible);
  useTilt(skillsBlockRef, started && skillsVisible);

  // Apply volume/mute to ALL audio refs whenever they change
  useEffect(() => {
    const allRefs = [backgroundMusicRef, hackerMusicRef, rainMusicRef, animeMusicRef, carMusicRef];
    allRefs.forEach(ref => {
      if (ref.current) {
        ref.current.volume = volume;
        ref.current.muted = isMuted;
      }
    });
  }, [volume, isMuted]);

  // Transparency
  useEffect(() => {
    document.documentElement.style.setProperty("--profile-opacity", String(transparency));
  }, [transparency]);

  const switchTheme = useCallback(async (
    videoSrc: string, audioRef: RefObject<HTMLAudioElement | null>, themeClass: string,
    showOverlay = false, overlayOverProfile = false
  ) => {
    const video = backgroundVideoRef.current; if (!video) return;
    await gsap.to(video, { opacity: 0, duration: 0.5, ease: "power2.in" });
    video.src = videoSrc;

    // Stop current audio
    currentAudioRef.current?.current?.pause();
    if (currentAudioRef.current?.current) currentAudioRef.current.current.currentTime = 0;
    currentAudioRef.current = audioRef;

    // Play new audio using live ref values
    if (audioRef.current) {
      audioRef.current.volume = volumeRef.current;
      audioRef.current.muted = isMutedRef.current;
      audioRef.current.play().catch(() => {});
    }

    document.body.className = themeClass;
    document.getElementById("hacker-overlay")?.classList.add("hidden");
    document.getElementById("snow-overlay")?.classList.add("hidden");
    if (showOverlay) {
      if (themeClass === "hacker-theme") document.getElementById("hacker-overlay")?.classList.remove("hidden");
      else if (themeClass === "rain-theme") document.getElementById("snow-overlay")?.classList.remove("hidden");
    }
    const btn = document.getElementById("results-button-container");
    btn?.classList.toggle("hidden", themeClass !== "hacker-theme");
    gsap.to(video, { opacity: 1, duration: 0.5, ease: "power2.out" });
  }, []);

  const handleStart = useCallback(async () => {
    setStarted(true);

    // Unlock audio on user gesture — this is the key fix
    const audio = backgroundMusicRef.current;
    if (audio) {
      audio.volume = volumeRef.current;
      audio.muted = false; // unmute on click
      audio.play().catch(() => {});
    }
    setIsMuted(false);

    backgroundVideoRef.current?.play().catch(() => {});

    const profile = profileBlockRef.current;
    if (profile) {
      profile.classList.remove("hidden");
      gsap.fromTo(profile, { opacity: 0, y: -50 }, {
        opacity: 1, y: 0, duration: 1, ease: "power2.out",
        onComplete: () => {
          profileContainerRef.current?.classList.add(styles.orbit);
        }
      });
    }
  }, []);

  const toggleSkills = useCallback(() => {
    const profile = profileBlockRef.current; const skills = skillsBlockRef.current;
    if (!skillsVisible) {
      gsap.to(profile, { x: -100, opacity: 0, duration: 0.5, ease: "power2.in", onComplete: () => {
        profile?.classList.add("hidden"); skills?.classList.remove("hidden");
        gsap.fromTo(skills, { x: 100, opacity: 0 }, { x: 0, opacity: 1, duration: 0.5, ease: "power2.out" });
        gsap.to("#python-bar", { width: "67%", duration: 2, ease: "power2.out" });
        gsap.to("#html-bar", { width: "45%", duration: 2, ease: "power2.out" });
        gsap.to("#golang-bar", { width: "30%", duration: 2, ease: "power2.out" });
      }});
      setSkillsVisible(true);
    } else {
      gsap.to(skills, { x: 100, opacity: 0, duration: 0.5, ease: "power2.in", onComplete: () => {
        skills?.classList.add("hidden"); profile?.classList.remove("hidden");
        gsap.fromTo(profile, { x: -100, opacity: 0 }, { x: 0, opacity: 1, duration: 0.5, ease: "power2.out" });
      }});
      setSkillsVisible(false);
    }
  }, [skillsVisible]);

  const handleProfilePic = useCallback(() => {
    const c = profileContainerRef.current; if (!c) return;
    c.classList.remove(styles.orbit, styles.fastOrbit); void c.offsetWidth;
    c.classList.add(styles.fastOrbit);
    setTimeout(() => { c.classList.remove(styles.fastOrbit); c.classList.add(styles.orbit); }, 500);
  }, []);

  return (
    <div className={styles.container}>
      <div className={styles.customCursor}></div>

      {/* Speaker toggle – top right */}
      <div className={styles.speakerButton} onClick={() => setIsMuted(!isMuted)}>
        {isMuted ? (
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon>
            <line x1="23" y1="9" x2="17" y2="15"></line>
            <line x1="17" y1="9" x2="23" y2="15"></line>
          </svg>
        ) : (
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon>
            <path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07"></path>
          </svg>
        )}
      </div>

      {!started && (
        <div className={styles.startScreen} onClick={handleStart}>
          <div id="start-text" className={styles.startText}></div>
        </div>
      )}

      <video ref={backgroundVideoRef} id="background" className={styles.backgroundVideo}
        src="/background 1.mp4" loop muted autoPlay playsInline />

      <div className={styles.glitchOverlay} ref={glitchOverlayRef}></div>
      <div id="hacker-overlay" className={`${styles.overlay} hidden`}></div>
      <div id="snow-overlay" className={`${styles.overlay} hidden`}></div>

      {/* Profile block */}
      <div ref={profileBlockRef} className={`${styles.profileBlock} hidden`}>
        <div className={styles.profileHeader}>
          <div ref={profileContainerRef} className={styles.profileContainer}>
            <img src="/profile.gif" alt="Profile" className={styles.profilePicture} onClick={handleProfilePic} />
          </div>
          <div className={styles.profileInfo}>
            <div className={styles.nameAndBadges}>
              <div id="profile-name" className={styles.profileName}></div>
              <div className={styles.badgeGroup}>
                <div className={styles.badgeContainer}>
                  <img src="/uncgpt.png" alt="uncgpt" className={styles.badge} />
                  <span className={styles.tooltip}>owner of uncgpt</span>
                </div>
                <div className={styles.badgeContainer}>
                  <img src="/owner.png" alt="Owner" className={styles.badge} />
                  <span className={styles.tooltip}>Owner of the server</span>
                </div>
              </div>
            </div>
            <div className={styles.profileStatus}>currently doing nothing</div>
            <div id="discord-activity" className={styles.discordActivity}>Loading...</div>
            <div id="profile-bio" className={styles.profileBio}></div>
          </div>
        </div>

        <div className={styles.socialLinks}>
          <a href="https://github.com/yourusername" target="_blank" className={styles.socialLink}>
            <svg className={styles.socialIcon} viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 0C5.37 0 0 5.37 0 12c0 5.3 3.438 9.8 8.207 11.387.6.113.793-.263.793-.583 0-.288-.01-1.05-.015-2.06-3.338.726-4.042-1.61-4.042-1.61-.546-1.39-1.333-1.76-1.333-1.76-1.09-.745.083-.73.083-.73 1.205.084 1.84 1.236 1.84 1.236 1.07 1.833 2.807 1.304 3.492.997.108-.775.418-1.305.76-1.605-2.665-.304-5.467-1.332-5.467-5.93 0-1.31.468-2.38 1.235-3.22-.124-.303-.535-1.523.117-3.176 0 0 1.008-.323 3.3 1.23a11.5 11.5 0 013.003-.403c1.018.005 2.043.138 3.003.403 2.29-1.553 3.296-1.23 3.296-1.23.653 1.653.243 2.873.12 3.176.77.84 1.233 1.91 1.233 3.22 0 4.61-2.807 5.624-5.48 5.92.43.37.815 1.096.815 2.21 0 1.596-.015 2.884-.015 3.276 0 .322.192.7.8.58C20.565 21.795 24 17.297 24 12c0-6.63-5.37-12-12-12z" />
            </svg>
          </a>

          <a href="https://discord.gg/yourserver" target="_blank" className={styles.socialLink}>
            <svg className={styles.socialIcon} viewBox="0 0 24 24" fill="currentColor">
              <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z" />
            </svg>
          </a>

          <a href="https://tiktok.com/@fiz0975" target="_blank" className={styles.socialLink}>
            <svg className={styles.socialIcon} viewBox="0 0 24 24" fill="currentColor">
              <path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.15 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z" />
            </svg>
          </a>
        </div>

        <div className={styles.profileFooter}>
          <div className={styles.visitorCounter}>
            <svg className={styles.visitorIcon} viewBox="0 0 24 24" fill="none" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/></svg>
            <span id="visitor-count">{visitorCount}</span>
            <span className={styles.tooltip}>Views</span>
          </div>
        </div>
      </div>

      {/* Skills block */}
      <div ref={skillsBlockRef} className={`${styles.skillsBlock} hidden`}>
        <h2 className={styles.skillsTitle}>Programming Skills</h2>
        <div className={styles.skill}>
          <div className={styles.skillName}><img src="/python.png" alt="Python" className={styles.skillIcon}/><span>Python</span><span>67%</span></div>
          <div className={styles.skillBarContainer}><div id="python-bar" className={styles.skillBar}></div></div>
        </div>
        <div className={styles.skill}>
          <div className={styles.skillName}><img src="/html.png" alt="HTML" className={styles.skillIcon}/><span>HTML</span><span>45%</span></div>
          <div className={styles.skillBarContainer}><div id="html-bar" className={styles.skillBar}></div></div>
        </div>
        <div className={styles.skill}>
          <div className={styles.skillName}><img src="/golang.png" alt="Go" className={styles.skillIcon}/><span>Go</span><span>30%</span></div>
          <div className={styles.skillBarContainer}><div id="golang-bar" className={styles.skillBar}></div></div>
        </div>
      </div>

      <div id="results-button-container" className={`${styles.resultsButtonContainer} hidden`}>
        <button id="results-theme" className={styles.resultsTheme} onClick={toggleSkills}>View Results</button>
        <div id="results-hint" className={`${styles.resultsHint} hidden`}>Click again to return to profile</div>
      </div>

      <div className={styles.controls}>
        <div className={styles.themeButton} onClick={() => switchTheme("/background 1.mp4", backgroundMusicRef, "home-theme")}>1</div>
        <div className={styles.themeButton} onClick={() => switchTheme("/real.mp4", hackerMusicRef, "hacker-theme", true)}>2</div>
        <div className={styles.themeButton} onClick={() => switchTheme("/rain_background.mp4", rainMusicRef, "rain-theme", false, true)}>3</div>
        <div className={styles.themeButton} onClick={() => switchTheme("/anime_background.mp4", animeMusicRef, "anime-theme")}>4</div>
        <div className={styles.themeButton} onClick={() => switchTheme("/hacker_background.mp4", carMusicRef, "car-theme")}>5</div>
      </div>

      <div className={styles.topControls}>
        <div className={styles.volumeControl}>
          <svg className={styles.volumeIcon} viewBox="0 0 24 24" fill="none" stroke="currentColor" onClick={() => setIsMuted(!isMuted)}>
            {isMuted ? (
              <><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z"/><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2"/></>
            ) : (
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z"/>
            )}
          </svg>
          <input type="range" min="0" max="1" step="0.01" value={volume} className={styles.slider}
            onChange={e => { setVolume(parseFloat(e.target.value)); setIsMuted(false); }} />
        </div>
        <div className={styles.transparencyControl}>
          <svg className={styles.transparencyIcon} viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/>
          </svg>
          <input type="range" min="0" max="1" step="0.01" value={transparency} className={styles.slider}
            onChange={e => setTransparency(parseFloat(e.target.value))} />
        </div>
      </div>

      {/* Audio elements — NOT muted by default so they can play on user gesture */}
      <audio ref={backgroundMusicRef} src="/make-u-whole.mp3" loop />
      <audio ref={hackerMusicRef} src="/real.mp3" loop />
      <audio ref={rainMusicRef} src="/rain_music.mp3" loop />
      <audio ref={animeMusicRef} src="/anime_music.mp3" loop />
      <audio ref={carMusicRef} src="/hacker_music.mp3" loop />
    </div>
  );
}
