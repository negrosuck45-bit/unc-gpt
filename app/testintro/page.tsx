"use client";

import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import * as THREE from "three";

export default function TestIntroPage() {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [showText, setShowText] = useState(false);
  const [textProgress, setTextProgress] = useState(0);

  useEffect(() => {
    if (!canvasRef.current) return;

    // Scene setup
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x000000);

    const camera = new THREE.PerspectiveCamera(
      75,
      window.innerWidth / window.innerHeight,
      0.1,
      1000
    );
    camera.position.z = 3;

    const renderer = new THREE.WebGLRenderer({
      canvas: canvasRef.current,
      antialias: true,
      alpha: true,
    });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(window.devicePixelRatio);

    // Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(5, 5, 5);
    scene.add(directionalLight);

    // Create cube
    const cubeGeometry = new THREE.BoxGeometry(1, 1, 1);
    const cubeMaterial = new THREE.MeshPhongMaterial({
      color: 0x4f46e5,
      emissive: 0x2e1065,
    });
    const cube = new THREE.Mesh(cubeGeometry, cubeMaterial);
    scene.add(cube);

    // Create sphere (ball)
    const sphereGeometry = new THREE.SphereGeometry(0.5, 32, 32);
    const sphereMaterial = new THREE.MeshPhongMaterial({
      color: 0x000000,
      emissive: 0x1a1a1a,
      shininess: 100,
      reflectivity: 1,
    });
    const sphere = new THREE.Mesh(sphereGeometry, sphereMaterial);
    sphere.position.y = 2;
    scene.add(sphere);

    // Create ground plane
    const groundGeometry = new THREE.PlaneGeometry(10, 0.1);
    const groundMaterial = new THREE.MeshPhongMaterial({
      color: 0x1a1a1a,
      emissive: 0x0a0a0a,
    });
    const ground = new THREE.Mesh(groundGeometry, groundMaterial);
    ground.position.y = -1;
    ground.rotation.x = 0;
    scene.add(ground);

    // Animation state
    let animationPhase = 0; // 0: cube rotation, 1: ball falling, 2: spread effect
    let ballVelocity = 0;
    let spreadProgress = 0;
    const gravity = 0.01;
    const groundY = -0.95;

    const animate = () => {
      requestAnimationFrame(animate);

      // Phase 1: Cube rotation (0-2 seconds)
      if (animationPhase === 0) {
        cube.rotation.x += 0.01;
        cube.rotation.y += 0.015;
        cube.rotation.z += 0.008;

        if (cube.rotation.y > Math.PI * 4) {
          animationPhase = 1;
          cube.visible = false;
        }
      }

      // Phase 2: Ball falling (2-4 seconds)
      if (animationPhase === 1) {
        ballVelocity += gravity;
        sphere.position.y -= ballVelocity;

        if (sphere.position.y <= groundY) {
          sphere.position.y = groundY;
          animationPhase = 2;
          setShowText(true);
        }
      }

      // Phase 3: Spread effect (4+ seconds)
      if (animationPhase === 2) {
        spreadProgress += 0.01;
        if (spreadProgress <= 1) {
          sphere.scale.x = 1 + spreadProgress * 2;
          sphere.scale.z = 1 + spreadProgress * 2;
          sphere.scale.y = Math.max(0.1, 1 - spreadProgress * 0.8);

          // Fade out sphere
          (sphereMaterial as any).opacity = 1 - spreadProgress;
          sphereMaterial.transparent = true;
        } else {
          sphere.visible = false;
        }
      }

      renderer.render(scene, camera);
    };

    animate();

    // Handle window resize
    const handleResize = () => {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
    };

    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
      renderer.dispose();
    };
  }, []);

  // Typing animation for "uncgpt"
  const textVariants = {
    hidden: { opacity: 0 },
    visible: (i: number) => ({
      opacity: 1,
      transition: {
        delay: i * 0.1,
        duration: 0.3,
      },
    }),
  };

  const text = "uncgpt";

  return (
    <div ref={containerRef} className="w-full h-screen bg-black overflow-hidden">
      <canvas
        ref={canvasRef}
        className="w-full h-full block"
      />

      {/* Text overlay */}
      {showText && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <motion.div
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5, delay: 0.5 }}
            className="text-center"
          >
            <div className="text-6xl md:text-8xl font-light tracking-wider text-white"
              style={{
                fontFamily: "'Brush Script MT', cursive",
                letterSpacing: "0.15em",
                textShadow: "0 0 20px rgba(255,255,255,0.3)",
              }}
            >
              {text.split("").map((char, i) => (
                <motion.span
                  key={i}
                  custom={i}
                  variants={textVariants}
                  initial="hidden"
                  animate="visible"
                  style={{
                    display: "inline-block",
                    fontStyle: "italic",
                  }}
                >
                  {char}
                </motion.span>
              ))}
            </div>

            {/* Subtitle */}
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 1.2, duration: 0.5 }}
              className="text-gray-400 text-sm md:text-base mt-6 tracking-widest"
            >
              NEXT GENERATION AI CHAT
            </motion.p>

            {/* CTA Button */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 1.5, duration: 0.5 }}
              className="mt-12"
            >
              <a
                href="/"
                className="inline-block px-8 py-3 border border-white text-white hover:bg-white hover:text-black transition-all duration-300 rounded-full text-sm tracking-widest font-light"
              >
                ENTER
              </a>
            </motion.div>
          </motion.div>
        </div>
      )}
    </div>
  );
}
