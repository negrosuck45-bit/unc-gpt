"use client";
import { useEffect, useRef } from "react";

export default function useTypingAnimation(
  elementId,
  textOrArray,
  options = {}
) {
  const { typingSpeed = 100, deletingSpeed = 50, pauseAfterComplete = 2000 } =
    options;
  const cursorRef = useRef(true);

  useEffect(() => {
    const el = document.getElementById(elementId);
    if (!el) return;

    const texts = Array.isArray(textOrArray) ? textOrArray : [textOrArray];
    let textIndex = 0;
    let charIndex = 0;
    let isDeleting = false;
    let currentText = "";

    const interval = setInterval(() => {
      cursorRef.current = !cursorRef.current;
      const cursor = cursorRef.current ? "|" : " ";
      el.textContent = currentText + cursor;
    }, 500);

    const timeout = () => {
      const fullText = texts[textIndex];
      if (!isDeleting && charIndex < fullText.length) {
        currentText = fullText.slice(0, charIndex + 1);
        charIndex++;
      } else if (isDeleting && charIndex > 0) {
        currentText = fullText.slice(0, charIndex - 1);
        charIndex--;
      } else if (charIndex === fullText.length) {
        isDeleting = true;
        setTimeout(timeout, pauseAfterComplete);
        return;
      } else if (charIndex === 0 && isDeleting) {
        isDeleting = false;
        textIndex = (textIndex + 1) % texts.length;
      }
      setTimeout(
        timeout,
        isDeleting ? deletingSpeed : typingSpeed
      );
    };

    timeout();

    return () => clearInterval(interval);
  }, [elementId, textOrArray, typingSpeed, deletingSpeed, pauseAfterComplete]);
}