"use client";
import { useState, useEffect } from "react";

export default function useVisitorCounter() {
  const [count, setCount] = useState(50);

  useEffect(() => {
    const stored = parseInt(localStorage.getItem("totalVisitorCount"), 10);
    let total = !Number.isNaN(stored) && stored >= 50 && stored <= 1000 ? stored : 50;
    total += 1;
    localStorage.setItem("totalVisitorCount", total);
    setCount(total);
  }, []);

  return count;
}