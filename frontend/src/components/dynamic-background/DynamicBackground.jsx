import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';

export default function DynamicBackground() {
  const mountRef = useRef(null);

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    let renderer;
    try {
      renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'low-power' });
    } catch (e) {
      console.warn('WebGL not supported for dynamic background', e);
      return;
    }

    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
    container.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.z = 80;

    // Atmospheric lights matching Color Hunt palette (#9EC8B9, #092635, #1B4242, #5C8374)
    const ambientLight = new THREE.AmbientLight(0x9EC8B9, 0.8);
    scene.add(ambientLight);

    const dirLight1 = new THREE.DirectionalLight(0x1B4242, 1.0);
    dirLight1.position.set(30, 40, 50);
    scene.add(dirLight1);

    const dirLight2 = new THREE.DirectionalLight(0x5C8374, 0.7);
    dirLight2.position.set(-30, -20, 30);
    scene.add(dirLight2);

    // Subtle drifting particles
    const particleCount = window.innerWidth < 768 ? 40 : 85;
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(particleCount * 3);
    const velocities = [];

    for (let i = 0; i < particleCount; i++) {
      positions[i * 3] = (Math.random() - 0.5) * 140;
      positions[i * 3 + 1] = (Math.random() - 0.5) * 90;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 60;

      velocities.push({
        x: (Math.random() - 0.5) * 0.03,
        y: (Math.random() - 0.5) * 0.03,
        z: (Math.random() - 0.5) * 0.015,
      });
    }

    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));

    const particleMaterial = new THREE.PointsMaterial({
      color: 0x1B4242,
      size: 2.0,
      transparent: true,
      opacity: 0.45,
    });

    const particles = new THREE.Points(geometry, particleMaterial);
    scene.add(particles);

    // Connecting lines
    const maxLineSegments = particleCount * 2;
    const linePositions = new Float32Array(maxLineSegments * 6);
    const lineGeometry = new THREE.BufferGeometry();
    lineGeometry.setAttribute('position', new THREE.BufferAttribute(linePositions, 3));

    const lineMaterial = new THREE.LineBasicMaterial({
      color: 0x5C8374,
      transparent: true,
      opacity: 0.25,
    });

    const lines = new THREE.LineSegments(lineGeometry, lineMaterial);
    scene.add(lines);

    // Pointer parallax
    let mouseX = 0;
    let mouseY = 0;
    const handleMouseMove = (e) => {
      mouseX = (e.clientX / window.innerWidth - 0.5) * 5;
      mouseY = (e.clientY / window.innerHeight - 0.5) * 5;
    };
    window.addEventListener('mousemove', handleMouseMove);

    // Resize handling
    const handleResize = () => {
      if (!renderer || !container) return;
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
    };
    window.addEventListener('resize', handleResize);

    // Animation Loop
    let animationFrameId;
    const animate = () => {
      animationFrameId = requestAnimationFrame(animate);

      camera.position.x += (mouseX - camera.position.x) * 0.03;
      camera.position.y += (-mouseY - camera.position.y) * 0.03;
      camera.lookAt(scene.position);

      const pos = particles.geometry.attributes.position.array;
      let lineVertexIdx = 0;
      const connectDistSq = 24 * 24;

      for (let i = 0; i < particleCount; i++) {
        pos[i * 3] += velocities[i].x;
        pos[i * 3 + 1] += velocities[i].y;
        pos[i * 3 + 2] += velocities[i].z;

        if (Math.abs(pos[i * 3]) > 75) velocities[i].x *= -1;
        if (Math.abs(pos[i * 3 + 1]) > 50) velocities[i].y *= -1;
        if (Math.abs(pos[i * 3 + 2]) > 35) velocities[i].z *= -1;

        for (let j = i + 1; j < particleCount; j++) {
          const dx = pos[i * 3] - pos[j * 3];
          const dy = pos[i * 3 + 1] - pos[j * 3 + 1];
          const dz = pos[i * 3 + 2] - pos[j * 3 + 2];
          const distSq = dx * dx + dy * dy + dz * dz;

          if (distSq < connectDistSq && lineVertexIdx < maxLineSegments * 6 - 6) {
            linePositions[lineVertexIdx++] = pos[i * 3];
            linePositions[lineVertexIdx++] = pos[i * 3 + 1];
            linePositions[lineVertexIdx++] = pos[i * 3 + 2];

            linePositions[lineVertexIdx++] = pos[j * 3];
            linePositions[lineVertexIdx++] = pos[j * 3 + 1];
            linePositions[lineVertexIdx++] = pos[j * 3 + 2];
          }
        }
      }

      particles.geometry.attributes.position.needsUpdate = true;
      lines.geometry.attributes.position.needsUpdate = true;
      lineGeometry.setDrawRange(0, lineVertexIdx / 3);

      renderer.render(scene, camera);
    };

    animate();

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('resize', handleResize);
      if (renderer.domElement && container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
      geometry.dispose();
      lineGeometry.dispose();
      particleMaterial.dispose();
      lineMaterial.dispose();
      renderer.dispose();
    };
  }, []);

  return (
    <div
      ref={mountRef}
      className="fixed inset-0 pointer-events-none -z-10 overflow-hidden bg-[#9EC8B9]"
      style={{ opacity: 0.95 }}
      aria-hidden="true"
    />
  );
}
