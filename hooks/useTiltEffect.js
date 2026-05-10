"use client";
import { useEffect } from "react";
import { gsap } from "gsap";

export default function useTiltEffect(ref) {
  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const handleMove = (e) => {
      const rect = el.getBoundingClientRect();
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;
      let clientX, clientY;
      if (e.touches) {
        clientX = e.touches[0].clientX;
        clientY = e.touches[0].clientY;
      } else {
        clientX = e.clientX;
        clientY = e.clientY;
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
      });
    };

    const handleLeave = () => {
      gsap.to(el, { rotationX: 0, rotationY: 0, duration: 0.5, ease: "power2.out" });
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
    };
  }, [ref]);
}