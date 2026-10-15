import React, { useState, useEffect, useRef } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { Search, Box, Grid, RotateCcw, ZoomIn, ZoomOut, Layers, ExternalLink, Loader2 } from 'lucide-react';
import EvidencePanel from './EvidencePanel';

export default function DependencyGraph3D({
  dependencies,
  repoName,
  repoUrl,
  isLoading,
  onSelectDependency,
  selectedDependency
}) {
  const mountRef = useRef(null);
  const controlsRef = useRef(null);
  const cameraRef = useRef(null);

  const [searchTerm, setSearchTerm] = useState('');
  const [riskFilter, setRiskFilter] = useState('ALL');
  const [viewMode, setViewMode] = useState('3d'); // '3d' or 'table'
  const [hoveredNode, setHoveredNode] = useState(null);
  const [activeNode, setActiveNode] = useState(selectedDependency || null);
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 });
  const [isGithubHovered, setIsGithubHovered] = useState(false);

  // Sync active node if prop changes
  useEffect(() => {
    if (selectedDependency) {
      setActiveNode(selectedDependency);
    }
  }, [selectedDependency]);

  // Filtered dependencies
  const rawList = dependencies || [];
  const filteredDeps = rawList.filter((d) => {
    const matchesSearch = d.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesRisk =
      riskFilter === 'ALL' ||
      (riskFilter === 'HIGH' && d.risk_level === 'high') ||
      (riskFilter === 'MODERATE' && d.risk_level === 'moderate') ||
      (riskFilter === 'PASSED' && d.risk_level === 'passed') ||
      (riskFilter === 'INFO' && d.risk_level === 'informational');
    return matchesSearch && matchesRisk;
  });

  // Calculate layer distributions
  const directRuntimeDeps = rawList.filter((d) => d.dependency_type !== 'dev');
  const devTransitiveDeps = rawList.filter((d) => d.dependency_type === 'dev');
  const highRiskCount = rawList.filter((d) => d.risk_level === 'high').length;
  const modRiskCount = rawList.filter((d) => d.risk_level === 'moderate').length;

  // Camera Controls
  const handleResetCamera = () => {
    if (cameraRef.current && controlsRef.current) {
      cameraRef.current.position.set(0, 32, 75);
      controlsRef.current.target.set(0, 0, 0);
      controlsRef.current.update();
    }
  };

  const handleZoomIn = () => {
    if (cameraRef.current && controlsRef.current) {
      cameraRef.current.position.multiplyScalar(0.85);
      controlsRef.current.update();
    }
  };

  const handleZoomOut = () => {
    if (cameraRef.current && controlsRef.current) {
      cameraRef.current.position.multiplyScalar(1.15);
      controlsRef.current.update();
    }
  };

  // Helper to create a GitHub logo CanvasTexture
  const createGithubLogoTexture = () => {
    const canvas = document.createElement('canvas');
    canvas.width = 128;
    canvas.height = 128;
    const ctx = canvas.getContext('2d');

    // Background circle in dark teal #1B4242
    ctx.fillStyle = '#1B4242';
    ctx.beginPath();
    ctx.arc(64, 64, 62, 0, Math.PI * 2);
    ctx.fill();

    // Border in accent teal #5C8374
    ctx.strokeStyle = '#5C8374';
    ctx.lineWidth = 4;
    ctx.stroke();

    // GitHub Octocat silhouette in mint #9EC8B9
    ctx.fillStyle = '#9EC8B9';
    // Simplified, iconic GitHub Octocat silhouette path
    ctx.beginPath();
    ctx.arc(64, 64, 38, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#1B4242';
    // Inner cutout for ears and body
    ctx.beginPath();
    ctx.arc(52, 54, 8, 0, Math.PI * 2);
    ctx.arc(76, 54, 8, 0, Math.PI * 2);
    ctx.fill();

    // Ears
    ctx.fillStyle = '#9EC8B9';
    ctx.beginPath();
    ctx.moveTo(38, 38);
    ctx.lineTo(48, 22);
    ctx.lineTo(56, 34);
    ctx.closePath();
    ctx.fill();

    ctx.beginPath();
    ctx.moveTo(90, 38);
    ctx.lineTo(80, 22);
    ctx.lineTo(72, 34);
    ctx.closePath();
    ctx.fill();

    const texture = new THREE.CanvasTexture(canvas);
    return texture;
  };

  // Helper to create small label sprite
  const createLabelSprite = (text, isRoot = false) => {
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 64;
    const ctx = canvas.getContext('2d');

    ctx.fillStyle = isRoot ? 'rgba(27, 66, 66, 0.92)' : 'rgba(9, 38, 53, 0.85)';
    ctx.roundRect(8, 8, 240, 48, 12);
    ctx.fill();

    ctx.strokeStyle = isRoot ? '#9EC8B9' : '#5C8374';
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.fillStyle = isRoot ? '#9EC8B9' : '#FFFFFF';
    ctx.font = isRoot ? 'bold 22px Roboto, sans-serif' : 'normal 19px Roboto, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text.length > 18 ? text.slice(0, 16) + '..' : text, 128, 32);

    const texture = new THREE.CanvasTexture(canvas);
    const spriteMat = new THREE.SpriteMaterial({ map: texture, transparent: true });
    const sprite = new THREE.Sprite(spriteMat);
    sprite.scale.set(6, 1.5, 1);
    return sprite;
  };

  // Three.js Scene Setup & Render Loop
  useEffect(() => {
    if (viewMode !== '3d' || !mountRef.current) return;
    const container = mountRef.current;

    const width = container.clientWidth || 700;
    const height = container.clientHeight || 580;

    let renderer;
    try {
      renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    } catch (e) {
      console.warn('WebGL failed to initialize', e);
      return;
    }

    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    container.innerHTML = '';
    container.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0xF0F7F4);

    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000);
    camera.position.set(0, 32, 75);
    cameraRef.current = camera;

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.maxDistance = 160;
    controls.minDistance = 15;
    controlsRef.current = controls;

    // Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.85);
    scene.add(ambientLight);

    const dirLight1 = new THREE.DirectionalLight(0x1B4242, 1.2);
    dirLight1.position.set(25, 45, 35);
    scene.add(dirLight1);

    const dirLight2 = new THREE.DirectionalLight(0x5C8374, 0.7);
    dirLight2.position.set(-25, -25, -25);
    scene.add(dirLight2);

    // 1. Concentric Guide Circles for Hierarchical Layers
    const createOrbitRing = (radius) => {
      const ringGeo = new THREE.BufferGeometry();
      const segments = 64;
      const pts = [];
      for (let i = 0; i <= segments; i++) {
        const theta = (i / segments) * Math.PI * 2;
        pts.push(new THREE.Vector3(Math.cos(theta) * radius, 0, Math.sin(theta) * radius));
      }
      ringGeo.setFromPoints(pts);
      const ringMat = new THREE.LineDashedMaterial({
        color: 0x5C8374,
        dashSize: 1.5,
        gapSize: 1.0,
        transparent: true,
        opacity: 0.35,
      });
      const ringLine = new THREE.Line(ringGeo, ringMat);
      ringLine.computeLineDistances();
      return ringLine;
    };

    const innerRadius = 22;
    const outerRadius = 38;
    scene.add(createOrbitRing(innerRadius));
    scene.add(createOrbitRing(outerRadius));

    // 2. Central Root Node (Repository)
    const centerGeo = new THREE.SphereGeometry(3.6, 32, 32);
    const centerMat = new THREE.MeshStandardMaterial({
      color: 0x1B4242,
      roughness: 0.25,
      metalness: 0.2,
      emissive: 0x092635,
      emissiveIntensity: 0.4,
    });
    const centerNode = new THREE.Mesh(centerGeo, centerMat);
    centerNode.userData = { isCenter: true, name: repoName || 'Repository' };
    scene.add(centerNode);

    // Root halo ring
    const haloGeo = new THREE.RingGeometry(4.2, 4.8, 32);
    const haloMat = new THREE.MeshBasicMaterial({
      color: 0x5C8374,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.65,
    });
    const haloMesh = new THREE.Mesh(haloGeo, haloMat);
    haloMesh.rotation.x = Math.PI / 2;
    scene.add(haloMesh);

    // Root label sprite
    const rootLabel = createLabelSprite(repoName ? repoName.split('/').pop() : 'Root Project', true);
    rootLabel.position.set(0, 5.5, 0);
    scene.add(rootLabel);

    // 3. Floating Animated GitHub Icons (Requirement 2)
    const githubTexture = createGithubLogoTexture();
    const githubGeo = new THREE.CylinderGeometry(1.6, 1.6, 0.3, 24);
    const githubMat = new THREE.MeshStandardMaterial({
      map: githubTexture,
      roughness: 0.3,
      metalness: 0.1,
    });

    const floatingGithubMeshes = [];
    const githubPositions = [
      { x: -32, y: 14, z: -18, offset: 0 },
      { x: 35, y: -10, z: 16, offset: 1.5 },
      { x: -26, y: -16, z: 28, offset: 3.0 },
      { x: 30, y: 20, z: -25, offset: 4.5 },
      { x: 0, y: -24, z: -32, offset: 2.2 },
    ];

    githubPositions.forEach((pos) => {
      const gMesh = new THREE.Mesh(githubGeo, githubMat);
      gMesh.position.set(pos.x, pos.y, pos.z);
      gMesh.rotation.x = Math.PI / 2;
      gMesh.userData = { isGithubIcon: true, initialY: pos.y, offset: pos.offset };
      scene.add(gMesh);
      floatingGithubMeshes.push(gMesh);
    });

    // 4. Hierarchical Dependency Node Placement
    const nodeMeshes = [];
    const directList = filteredDeps.filter((d) => d.dependency_type !== 'dev');
    const devList = filteredDeps.filter((d) => d.dependency_type === 'dev');

    const getRiskColor = (riskLevel) => {
      if (riskLevel === 'high') return 0xD9534F; // coral red
      if (riskLevel === 'moderate') return 0xE09F3E; // amber
      if (riskLevel === 'informational') return 0x5C8374; // accent teal
      return 0x1B4242; // passed deep teal
    };

    const edgeMat = new THREE.LineBasicMaterial({
      color: 0x5C8374,
      transparent: true,
      opacity: 0.35,
    });

    // Place Layer 1: Direct Runtime Dependencies on Inner Ring
    const directTotal = directList.length;
    directList.forEach((dep, idx) => {
      const angle = (idx / Math.max(directTotal, 1)) * Math.PI * 2;
      const x = Math.cos(angle) * innerRadius;
      const z = Math.sin(angle) * innerRadius;
      const y = Math.sin(angle * 2) * 2.5;

      const radius = 1.3 + Math.min(dep.usage_count * 0.3, 1.8);
      const geo = new THREE.SphereGeometry(radius, 24, 24);
      const colorHex = getRiskColor(dep.risk_level);
      const mat = new THREE.MeshStandardMaterial({
        color: colorHex,
        roughness: 0.3,
        metalness: 0.15,
      });

      const mesh = new THREE.Mesh(geo, mat);
      mesh.position.set(x, y, z);
      mesh.userData = { dep, isDirect: true, originalColor: colorHex };
      scene.add(mesh);
      nodeMeshes.push(mesh);

      // Clean line from center to direct node
      const lineGeo = new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(0, 0, 0),
        new THREE.Vector3(x, y, z),
      ]);
      const line = new THREE.Line(lineGeo, edgeMat);
      scene.add(line);

      // Node label
      const label = createLabelSprite(dep.name, false);
      label.position.set(x, y + radius + 1.2, z);
      scene.add(label);
    });

    // Place Layer 2: Dev / Transitive Dependencies on Outer Ring
    const devTotal = devList.length;
    devList.forEach((dep, idx) => {
      const angle = (idx / Math.max(devTotal, 1)) * Math.PI * 2 + 0.25;
      const x = Math.cos(angle) * outerRadius;
      const z = Math.sin(angle) * outerRadius;
      const y = (idx % 2 === 0 ? 3.5 : -3.5);

      const radius = 1.1 + Math.min(dep.usage_count * 0.2, 1.5);
      const geo = new THREE.SphereGeometry(radius, 20, 20);
      const colorHex = getRiskColor(dep.risk_level);
      const mat = new THREE.MeshStandardMaterial({
        color: colorHex,
        roughness: 0.35,
        metalness: 0.1,
      });

      const mesh = new THREE.Mesh(geo, mat);
      mesh.position.set(x, y, z);
      mesh.userData = { dep, isDirect: false, originalColor: colorHex };
      scene.add(mesh);
      nodeMeshes.push(mesh);

      // Line from center to dev node
      const lineGeo = new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(0, 0, 0),
        new THREE.Vector3(x, y, z),
      ]);
      const line = new THREE.Line(lineGeo, edgeMat);
      scene.add(line);

      // Node label
      const label = createLabelSprite(dep.name, false);
      label.position.set(x, y + radius + 1.2, z);
      scene.add(label);
    });

    // Raycasting for interactive hover and click
    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();
    const interactableObjects = [...nodeMeshes, ...floatingGithubMeshes];

    const handlePointerMove = (e) => {
      const rect = renderer.domElement.getBoundingClientRect();
      mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

      raycaster.setFromCamera(mouse, camera);
      const intersects = raycaster.intersectObjects(interactableObjects);

      if (intersects.length > 0) {
        const hit = intersects[0].object;
        if (hit.userData.isGithubIcon) {
          setIsGithubHovered(true);
          setHoveredNode(null);
          setTooltipPos({ x: e.clientX - rect.left, y: e.clientY - rect.top });
          container.style.cursor = 'pointer';
        } else if (hit.userData.dep) {
          setIsGithubHovered(false);
          setHoveredNode(hit.userData.dep);
          setTooltipPos({ x: e.clientX - rect.left, y: e.clientY - rect.top });
          container.style.cursor = 'pointer';
        }
      } else {
        setHoveredNode(null);
        setIsGithubHovered(false);
        container.style.cursor = 'default';
      }
    };

    const handlePointerClick = (e) => {
      const rect = renderer.domElement.getBoundingClientRect();
      mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

      raycaster.setFromCamera(mouse, camera);
      const intersects = raycaster.intersectObjects(interactableObjects);

      if (intersects.length > 0) {
        const hit = intersects[0].object;
        if (hit.userData.isGithubIcon) {
          if (repoUrl && repoUrl.startsWith('http')) {
            window.open(repoUrl, '_blank', 'noopener,noreferrer');
          }
        } else if (hit.userData.dep) {
          setActiveNode(hit.userData.dep);
          onSelectDependency(hit.userData.dep);
        }
      }
    };

    renderer.domElement.addEventListener('mousemove', handlePointerMove);
    renderer.domElement.addEventListener('click', handlePointerClick);

    // Resize handler
    const handleResize = () => {
      if (!container || !renderer) return;
      const w = container.clientWidth;
      const h = container.clientHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    window.addEventListener('resize', handleResize);

    // Animation Loop
    let animId;
    let clock = new THREE.Clock();

    const animate = () => {
      animId = requestAnimationFrame(animate);
      const elapsedTime = clock.getElapsedTime();
      controls.update();

      // Subtle rotation on root node and halo
      centerNode.rotation.y += 0.005;
      haloMesh.rotation.z += 0.003;

      // Animate floating GitHub icons with gentle bobbing and slow rotation (Requirement 2)
      floatingGithubMeshes.forEach((mesh) => {
        mesh.position.y = mesh.userData.initialY + Math.sin(elapsedTime * 1.5 + mesh.userData.offset) * 1.8;
        mesh.rotation.y += 0.008;
      });

      renderer.render(scene, camera);
    };
    animate();

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('resize', handleResize);
      if (renderer.domElement) {
        renderer.domElement.removeEventListener('mousemove', handlePointerMove);
        renderer.domElement.removeEventListener('click', handlePointerClick);
        if (container.contains(renderer.domElement)) {
          container.removeChild(renderer.domElement);
        }
      }
      controls.dispose();
      renderer.dispose();
    };
  }, [viewMode, filteredDeps.length, repoName, repoUrl]);

  return (
    <div className="bg-white rounded-2xl border border-[#5C8374]/30 shadow-sm overflow-hidden mb-8">
      {/* Top Filter and Controls Bar */}
      <div className="p-4 sm:p-5 border-b border-[#5C8374]/20 flex flex-col md:flex-row md:items-center md:justify-between gap-4 bg-[#F0F7F4]">
        <div className="flex items-center space-x-3">
          <div className="w-9 h-9 rounded-lg bg-[#1B4242] text-white flex items-center justify-center shadow-xs">
            <Box className="w-5 h-5 text-[#9EC8B9]" />
          </div>
          <div>
            <h2 className="heading-font text-lg font-bold text-[#092635]">
              Interactive 3D Dependency Graph
            </h2>
            <p className="text-xs text-[#1B4242] body-font">
              Hierarchical 3D visualization: Center root &rarr; Inner runtime layer &rarr; Outer dev orbit with floating GitHub nodes
            </p>
          </div>
        </div>

        {/* Search, Filter Pills & View Controls */}
        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          {/* Search Input */}
          <div className="relative">
            <Search className="w-4 h-4 text-[#5C8374] absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search package..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 pr-3 py-1.5 text-xs rounded-lg bg-white border border-[#5C8374]/30 text-[#092635] focus:outline-none focus:ring-1 focus:ring-[#1B4242] w-36 sm:w-44"
            />
          </div>

          {/* Risk Filter Buttons */}
          <div className="flex items-center space-x-1 bg-white p-1 rounded-lg border border-[#5C8374]/30 text-xs">
            {['ALL', 'HIGH', 'MODERATE', 'PASSED'].map((tier) => (
              <button
                key={tier}
                onClick={() => setRiskFilter(tier)}
                className={`px-2.5 py-1 rounded-md font-medium transition-colors cursor-pointer ${
                  riskFilter === tier
                    ? 'bg-[#1B4242] text-white'
                    : 'text-[#1B4242] hover:bg-[#9EC8B9]/40'
                }`}
              >
                {tier}
              </button>
            ))}
          </div>

          {/* 3D vs Table Mode Toggle */}
          <div className="flex items-center bg-white p-1 rounded-lg border border-[#5C8374]/30 text-xs">
            <button
              onClick={() => setViewMode('3d')}
              className={`flex items-center space-x-1 px-2.5 py-1 rounded-md font-medium transition-colors cursor-pointer ${
                viewMode === '3d' ? 'bg-[#5C8374] text-white' : 'text-[#1B4242]'
              }`}
            >
              <Box className="w-3.5 h-3.5" />
              <span>3D Graph</span>
            </button>
            <button
              onClick={() => setViewMode('table')}
              className={`flex items-center space-x-1 px-2.5 py-1 rounded-md font-medium transition-colors cursor-pointer ${
                viewMode === 'table' ? 'bg-[#5C8374] text-white' : 'text-[#1B4242]'
              }`}
            >
              <Grid className="w-3.5 h-3.5" />
              <span>Table</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Content Area: 3D Canvas + Dedicated Evidence Panel */}
      {viewMode === '3d' ? (
        <div className="flex flex-col lg:flex-row w-full min-h-[580px]">
          {/* Main 3D Canvas Area (68% width on desktop) */}
          <div className="relative flex-1 h-[580px] bg-[#F0F7F4] overflow-hidden">
            {/* Loading Overlay */}
            {isLoading && (
              <div className="absolute inset-0 z-20 bg-white/80 backdrop-blur-xs flex flex-col items-center justify-center space-y-3">
                <Loader2 className="w-8 h-8 animate-spin text-[#1B4242]" />
                <p className="font-bold text-sm text-[#092635]">Scanning repository and assembling 3D dependency graph...</p>
              </div>
            )}

            {/* Empty State Overlay if no repository scanned */}
            {!isLoading && rawList.length === 0 && (
              <div className="absolute inset-0 z-10 flex flex-col items-center justify-center p-6 text-center bg-[#F0F7F4]/90 backdrop-blur-2xs">
                <div className="w-12 h-12 rounded-2xl bg-[#1B4242] text-white flex items-center justify-center mb-3 shadow-md">
                  <Box className="w-6 h-6 text-[#9EC8B9]" />
                </div>
                <h3 className="heading-font text-base font-bold text-[#092635] mb-1">
                  Ready to Visualize Dependencies in 3D
                </h3>
                <p className="text-xs text-[#1B4242] max-w-sm leading-relaxed mb-4">
                  Enter a public GitHub repository URL in the Scanner tab and click Analyze Repository to generate the interactive 3D dependency graph.
                </p>
              </div>
            )}

            <div ref={mountRef} className="w-full h-full" />

            {/* Navigation Controls in top-right */}
            <div className="absolute top-4 right-4 flex items-center space-x-1.5 bg-white/90 backdrop-blur-xs p-1.5 rounded-lg border border-[#5C8374]/30 shadow-xs z-10">
              <button
                onClick={handleZoomIn}
                className="p-1.5 rounded hover:bg-[#9EC8B9]/40 text-[#1B4242] cursor-pointer"
                title="Zoom In"
              >
                <ZoomIn className="w-4 h-4" />
              </button>
              <button
                onClick={handleZoomOut}
                className="p-1.5 rounded hover:bg-[#9EC8B9]/40 text-[#1B4242] cursor-pointer"
                title="Zoom Out"
              >
                <ZoomOut className="w-4 h-4" />
              </button>
              <button
                onClick={handleResetCamera}
                className="p-1.5 rounded hover:bg-[#9EC8B9]/40 text-[#1B4242] cursor-pointer"
                title="Reset View"
              >
                <RotateCcw className="w-4 h-4" />
              </button>
            </div>

            {/* Canvas Hints */}
            <div className="absolute bottom-4 left-4 bg-white/85 backdrop-blur-xs px-3 py-1.5 rounded-lg border border-[#5C8374]/30 text-[11px] text-[#1B4242] space-y-0.5 z-10">
              <div>&bull; Drag to rotate &bull; Scroll to zoom &bull; Click any 3D node to inspect evidence</div>
              <div>&bull; Click floating GitHub icons to open repository in new tab</div>
            </div>

            {/* Floating Tooltips */}
            {isGithubHovered && (
              <div
                className="absolute pointer-events-none z-30 bg-[#092635] text-white text-xs rounded-lg p-2.5 shadow-lg border border-[#5C8374] max-w-xs transition-opacity duration-150"
                style={{
                  left: `${Math.min(tooltipPos.x + 15, 480)}px`,
                  top: `${Math.max(tooltipPos.y - 45, 10)}px`,
                }}
              >
                <div className="font-bold text-[#9EC8B9] flex items-center space-x-1">
                  <span>GitHub Repository Node</span>
                  <ExternalLink className="w-3 h-3 text-[#9EC8B9]" />
                </div>
                <div className="text-gray-300 text-[11px] mt-0.5">
                  Click to open <span className="text-white font-mono">{repoUrl || 'repository on GitHub'}</span>
                </div>
              </div>
            )}

            {hoveredNode && !isGithubHovered && (
              <div
                className="absolute pointer-events-none z-30 bg-[#092635] text-white text-xs rounded-lg p-2.5 shadow-lg border border-[#5C8374] max-w-xs transition-opacity duration-150"
                style={{
                  left: `${Math.min(tooltipPos.x + 15, 480)}px`,
                  top: `${Math.max(tooltipPos.y - 45, 10)}px`,
                }}
              >
                <div className="font-bold text-[#9EC8B9] flex items-center space-x-1.5">
                  <span>{hoveredNode.name}</span>
                  <span className="text-[10px] px-1.5 py-0.2 rounded bg-white/20 text-white font-mono">
                    {hoveredNode.declared_version}
                  </span>
                </div>
                <div className="text-gray-300 text-[11px] mt-1">
                  Layer: <span className="font-semibold capitalize">{hoveredNode.dependency_type === 'dev' ? 'Dev / Outer Ring' : 'Runtime / Inner Ring'}</span> &bull; {hoveredNode.usage_count} import sites
                </div>
                <div className="text-[10px] text-[#A7D0C2] mt-0.5">
                  Severity: <span className="font-semibold uppercase">{hoveredNode.risk_level}</span>
                </div>
              </div>
            )}
          </div>

          {/* Dedicated Evidence & Statistics Side Panel (32% width on desktop) */}
          <div className="w-full lg:w-96 border-t lg:border-t-0 lg:border-l border-[#5C8374]/20 bg-white p-5 flex flex-col justify-between space-y-5">
            {/* 1. Quick Metric Badges */}
            <div>
              <div className="flex items-center space-x-2 text-[#092635] font-bold text-sm mb-2.5">
                <Layers className="w-4 h-4 text-[#5C8374]" />
                <span>3D Repository Graph Telemetry</span>
              </div>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="p-2 rounded-lg bg-[#F0F7F4] border border-[#5C8374]/20">
                  <div className="text-[#5C8374] font-medium text-[11px]">Total Nodes</div>
                  <div className="text-base font-bold text-[#092635]">{rawList.length}</div>
                </div>
                <div className="p-2 rounded-lg bg-[#F0F7F4] border border-[#5C8374]/20">
                  <div className="text-[#5C8374] font-medium text-[11px]">Direct Runtime</div>
                  <div className="text-base font-bold text-[#1B4242]">{directRuntimeDeps.length}</div>
                </div>
                <div className="p-2 rounded-lg bg-[#F0F7F4] border border-[#5C8374]/20">
                  <div className="text-[#5C8374] font-medium text-[11px]">Dev / Build Layer</div>
                  <div className="text-base font-bold text-[#092635]">{devTransitiveDeps.length}</div>
                </div>
                <div className="p-2 rounded-lg bg-red-50 border border-red-200">
                  <div className="text-red-700 font-medium text-[11px]">High Risks</div>
                  <div className="text-base font-bold text-red-700">{highRiskCount}</div>
                </div>
              </div>
            </div>

            {/* 2. Clear Evidence Panel for Selected Dependency */}
            <div className="flex-1 min-h-[300px] border-t border-b border-[#5C8374]/20 py-3.5">
              <EvidencePanel
                selectedDependency={activeNode}
                onInspectFull={(dep) => onSelectDependency(dep)}
              />
            </div>

            {/* 3. Structural Legend */}
            <div className="space-y-1.5 text-xs pt-1">
              <div className="font-bold text-[#092635]">Graph Legend</div>
              <div className="grid grid-cols-2 gap-1.5 text-[11px] text-[#1B4242]">
                <div className="flex items-center space-x-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#1B4242]" />
                  <span>Root Repository</span>
                </div>
                <div className="flex items-center space-x-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#D9534F]" />
                  <span>High Risk</span>
                </div>
                <div className="flex items-center space-x-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#E09F3E]" />
                  <span>Moderate Risk</span>
                </div>
                <div className="flex items-center space-x-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#5C8374]" />
                  <span>Passed Checks</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* Alternative Searchable Table View */
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-[#F0F7F4] text-[#092635] border-b border-[#5C8374]/30">
                <th className="py-3 px-4 font-bold">Package Name</th>
                <th className="py-3 px-4 font-bold">Declared Spec</th>
                <th className="py-3 px-4 font-bold">Layer</th>
                <th className="py-3 px-4 font-bold">Manifest</th>
                <th className="py-3 px-4 font-bold">Import Sites</th>
                <th className="py-3 px-4 font-bold">Risk Level</th>
                <th className="py-3 px-4 font-bold">Proposed Modernization</th>
                <th className="py-3 px-4 font-bold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#5C8374]/20">
              {filteredDeps.map((dep) => (
                <tr key={dep.id} className="hover:bg-[#F0F7F4]/60 transition-colors">
                  <td className="py-3 px-4 font-bold text-[#1B4242]">
                    {dep.name}
                  </td>
                  <td className="py-3 px-4 font-mono text-[#092635]">
                    {dep.declared_version}
                  </td>
                  <td className="py-3 px-4 text-[#1B4242]">
                    <span className="px-2 py-0.5 rounded text-[11px] bg-[#9EC8B9]/30 text-[#1B4242] font-medium capitalize">
                      {dep.dependency_type === 'dev' ? 'Outer (Dev)' : 'Inner (Direct)'}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-[#1B4242]">
                    {dep.manifest_path}
                  </td>
                  <td className="py-3 px-4 font-bold text-[#092635]">
                    {dep.usage_count}
                  </td>
                  <td className="py-3 px-4">
                    <span
                      className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-bold uppercase ${
                        dep.risk_level === 'high'
                          ? 'bg-red-100 text-red-800'
                          : dep.risk_level === 'moderate'
                          ? 'bg-amber-100 text-amber-800'
                          : 'bg-emerald-100 text-emerald-800'
                      }`}
                    >
                      {dep.risk_level}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-[#1B4242]">
                    {dep.replacement_suggestion ? (
                      <span className="font-semibold text-[#1B4242]">
                        {dep.replacement_suggestion.proposed_package} ({dep.replacement_suggestion.proposed_version})
                      </span>
                    ) : (
                      <span className="text-gray-400">None required</span>
                    )}
                  </td>
                  <td className="py-3 px-4 text-right">
                    <button
                      type="button"
                      onClick={() => onSelectDependency(dep)}
                      className="px-2.5 py-1 rounded bg-[#1B4242] hover:bg-[#5C8374] text-white text-xs font-medium transition-colors cursor-pointer"
                    >
                      Inspect
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
