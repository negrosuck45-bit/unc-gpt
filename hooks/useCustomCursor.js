"use client";
import { useEffect } from "react";

export default function useCustomCursor(imagePath) {
  useEffect(() => {
    const cursor = document.querySelector(".custom-cursor");
    if (!cursor) return;

    const isTouchDevice = window.matchMedia("(pointer: coarse)").matches;

    const move = (e) => {
      cursor.style.left = e.clientX + "px";
      cursor.style.top = e.clientY + "px";
      cursor.style.display = "block";
    };

    if (isTouchDevice) {
      document.addEventListener("touchstart", (e) => move(e.touches[0]));
      document.addEventListener("touchmove", (e) => move(e.touches[0]));
      document.addEventListener("touchend", () => (cursor.style.display = "none"));
    } else {
      document.addEventListener("mousemove", move);
      document.addEventListener("mousedown", () => (cursor.style.transform = "scale(0.8) translate(-50%, -50%)"));
      document.addEventListener("mouseup", () => (cursor.style.transform = "scale(1) translate(-50%, -50%)"));
    }

    return () => {
      // cleanup if needed
    };
  }, [imagePath]);
}