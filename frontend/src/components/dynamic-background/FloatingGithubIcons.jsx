import React, { useRef, useMemo, useEffect } from 'react';
import * as THREE from 'three';

/**
 * FloatingGithubIcons — Renders small floating GitHub Octocat-inspired icons
 * as Three.js plane meshes with a texture loaded from an external CDN URL.
 * Designed to be added directly into the existing DynamicBackground Three.js scene.
 *
 * Props:
 *  - scene: THREE.Scene instance to add the icons to
 *  - camera: THREE.Camera (unused directly, but available if needed)
 *  - count: number of icons (default 12)
 */
export function createFloatingGithubIcons(scene, { count = 12 } = {}) {
  // Reduce count on mobile for performance
  const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;
  const actualCount = isMobile ? Math.min(count, 6) : count;

  // Check for reduced-motion preference
  const prefersReducedMotion =
    typeof window !== 'undefined' &&
    window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches;

  // Load GitHub icon texture from the CDN
  const textureLoader = new THREE.TextureLoader();
  let texture = null;
  let textureLoaded = false;

  const iconGroup = new THREE.Group();
  iconGroup.name = 'floating-github-icons';

  // Icon data: position, velocity, rotation speed
  const iconData = [];

  // Spread icons across a wide area with good spacing
  // Use a golden-ratio spiral approach for even distribution
  const goldenAngle = Math.PI * (3 - Math.sqrt(5));
  const spreadRadius = 65; // Wide spread to avoid congestion
  const verticalSpread = 40;

  for (let i = 0; i < actualCount; i++) {
    const theta = i * goldenAngle;
    const r = spreadRadius * (0.4 + 0.6 * (i / actualCount));
    const x = Math.cos(theta) * r + (Math.random() - 0.5) * 15;
    const y = (Math.random() - 0.5) * verticalSpread;
    const z = Math.sin(theta) * r * 0.5 + (Math.random() - 0.5) * 20 - 10;

    iconData.push({
      position: new THREE.Vector3(x, y, z),
      basePosition: new THREE.Vector3(x, y, z),
      rotationSpeed: (Math.random() - 0.5) * (prefersReducedMotion ? 0.001 : 0.008),
      floatSpeed: 0.3 + Math.random() * 0.5,
      floatAmplitude: prefersReducedMotion ? 0.3 : (1.0 + Math.random() * 1.5),
      phase: Math.random() * Math.PI * 2,
      scale: 3.0 + Math.random() * 2.0, // Visible icons: 3-5 units
    });
  }

  // Create a simple GitHub-shaped fallback using canvas
  function createFallbackTexture() {
    const canvas = document.createElement('canvas');
    canvas.width = 128;
    canvas.height = 128;
    const ctx = canvas.getContext('2d');

    // Transparent background
    ctx.clearRect(0, 0, 128, 128);

    // Draw a simplified GitHub octocat circle icon
    ctx.beginPath();
    ctx.arc(64, 64, 52, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(9, 38, 53, 0.6)'; // #092635 with transparency
    ctx.fill();

    // Inner "cat" silhouette simplified as a mark
    ctx.beginPath();
    ctx.arc(64, 58, 28, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(158, 200, 185, 0.9)'; // #9EC8B9
    ctx.fill();

    // "Ears" - two small triangles
    ctx.beginPath();
    ctx.moveTo(40, 38);
    ctx.lineTo(48, 50);
    ctx.lineTo(36, 50);
    ctx.closePath();
    ctx.fillStyle = 'rgba(158, 200, 185, 0.9)';
    ctx.fill();

    ctx.beginPath();
    ctx.moveTo(88, 38);
    ctx.lineTo(80, 50);
    ctx.lineTo(92, 50);
    ctx.closePath();
    ctx.fill();

    // Eyes
    ctx.beginPath();
    ctx.arc(52, 56, 5, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(9, 38, 53, 0.8)';
    ctx.fill();

    ctx.beginPath();
    ctx.arc(76, 56, 5, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(9, 38, 53, 0.8)';
    ctx.fill();

    // Mouth/nose
    ctx.beginPath();
    ctx.arc(64, 66, 6, 0, Math.PI);
    ctx.strokeStyle = 'rgba(9, 38, 53, 0.6)';
    ctx.lineWidth = 2;
    ctx.stroke();

    // "Body" / tail
    ctx.beginPath();
    ctx.moveTo(48, 86);
    ctx.quadraticCurveTo(64, 98, 80, 86);
    ctx.strokeStyle = 'rgba(158, 200, 185, 0.7)';
    ctx.lineWidth = 3;
    ctx.stroke();

    const fallbackTex = new THREE.CanvasTexture(canvas);
    fallbackTex.needsUpdate = true;
    return fallbackTex;
  }

  // Shared geometry (reused for all icons)
  const planeGeometry = new THREE.PlaneGeometry(1, 1);

  // Create meshes with a temporary material; swap texture once loaded
  const meshes = [];
  const fallbackTex = createFallbackTexture();

  for (let i = 0; i < actualCount; i++) {
    const data = iconData[i];

    const material = new THREE.MeshBasicMaterial({
      map: fallbackTex,
      transparent: true,
      opacity: 0.55,
      side: THREE.DoubleSide,
      depthWrite: false,
    });

    const mesh = new THREE.Mesh(planeGeometry, material);
    mesh.position.copy(data.position);
    mesh.scale.set(data.scale, data.scale, 1);

    // Random initial rotation for variety
    mesh.rotation.z = Math.random() * Math.PI * 2;

    iconGroup.add(mesh);
    meshes.push({ mesh, material, data });
  }

  scene.add(iconGroup);

  // Try loading the real GitHub icon texture
  textureLoader.load(
    'https://cdn-icons-png.flaticon.com/512/25/25231.png',
    (loadedTexture) => {
      texture = loadedTexture;
      textureLoaded = true;
      // Update all materials to use the loaded texture
      meshes.forEach(({ material }) => {
        material.map = texture;
        material.needsUpdate = true;
      });
    },
    undefined,
    (err) => {
      console.warn('GitHub icon texture failed to load, using fallback canvas texture', err);
      // Fallback already applied
    }
  );

  // Animation update function — called from the parent's animation loop
  let elapsedTime = 0;
  function update(deltaTime = 0.016) {
    if (prefersReducedMotion) {
      // Minimal animation: very slow float only
      elapsedTime += deltaTime * 0.2;
    } else {
      elapsedTime += deltaTime;
    }

    for (let i = 0; i < meshes.length; i++) {
      const { mesh, data } = meshes[i];

      // Gentle floating motion (sinusoidal)
      mesh.position.y =
        data.basePosition.y +
        Math.sin(elapsedTime * data.floatSpeed + data.phase) * data.floatAmplitude;

      // Subtle horizontal drift
      mesh.position.x =
        data.basePosition.x +
        Math.sin(elapsedTime * data.floatSpeed * 0.7 + data.phase + 1.5) * (data.floatAmplitude * 0.3);

      // Gentle rotation
      mesh.rotation.z += data.rotationSpeed;

      // Billboard: make icons always face camera direction roughly
      // (not exact billboard since we don't have camera ref here, but z-rotation gives life)
    }
  }

  // Cleanup function
  function dispose() {
    scene.remove(iconGroup);
    planeGeometry.dispose();
    fallbackTex.dispose();
    if (texture) texture.dispose();
    meshes.forEach(({ material }) => material.dispose());
  }

  return { update, dispose, group: iconGroup };
}
