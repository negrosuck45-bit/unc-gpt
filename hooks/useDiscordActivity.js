"use client";
import { useEffect } from "react";

export default function useDiscordActivity(userId) {
  useEffect(() => {
    const el = document.getElementById("discord-activity");
    if (!el) return;

    const fetchActivity = async () => {
      try {
        const res = await fetch(`https://api.lanyard.rest/v1/users/${userId}`);
        const data = await res.json();
        if (!data.success) {
          el.textContent = "Join Lanyard server to show status";
          return;
        }
        const { activities, discord_status } = data.data;
        const active = activities?.find((a) => a.type === 0);
        let text = "Online";
        if (discord_status === "offline") text = "Offline";
        else if (activities?.some((a) => a.type === 4)) {
          const cs = activities.find((a) => a.type === 4);
          text = cs.state || "Online";
        } else if (active) {
          text = `Playing ${active.name}${active.state ? ` (${active.state})` : ""}`;
        }
        el.textContent = text;
      } catch {
        el.textContent = "Status error";
      }
    };

    fetchActivity();
    const interval = setInterval(fetchActivity, 15000);
    return () => clearInterval(interval);
  }, [userId]);
}