import { useEffect, useRef, useCallback } from "react";
import * as THREE from "three";
import { BODIES, PLANETS, SUN } from "../data/planets";

interface Props {
  playing: boolean;
  speed: number;
  showOrbits: boolean;
  showLabels: boolean;
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  onTick: (days: number) => void;
  resetToken: number;
}

const BASE_DAYS_PER_SEC = 10;
const TAU = Math.PI * 2;

// 轨道参数计算（与 2D 版本一致）
function orbitT(au: number) {
  const lo = Math.pow(0.39, 0.45);
  const hi = Math.pow(30.07, 0.45);
  const t = (Math.pow(au, 0.45) - lo) / (hi - lo);
  return 0.19 + 0.81 * t;
}

function displayRadius(diameterKm: number) {
  const lo = Math.log(4879);
  const hi = Math.log(142984);
  const t = (Math.log(diameterKm) - lo) / (hi - lo);
  return 4 + 13 * t;
}

export default function SolarCanvas3D({
  playing,
  speed,
  showOrbits,
  showLabels,
  selectedId,
  onSelect,
  onTick,
  resetToken,
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  
  const propsRef = useRef({ playing, speed, showOrbits, showLabels, selectedId, onSelect, onTick });
  propsRef.current = { playing, speed, showOrbits, showLabels, selectedId, onSelect, onTick };

  const simRef = useRef({
    days: 0,
    scene: null as THREE.Scene | null,
    camera: null as THREE.PerspectiveCamera | null,
    renderer: null as THREE.WebGLRenderer | null,
    sunMesh: null as THREE.Mesh | null,
    planetMeshes: new Map<string, THREE.Mesh>(),
    orbitLines: new Map<string, THREE.Line>(),
    labels: new Map<string, HTMLDivElement>(),
    raycaster: new THREE.Raycaster(),
    mouse: new THREE.Vector2(),
    isDragging: false,
    lastMouseX: 0,
    lastMouseY: 0,
    cameraAngleH: 0, // 水平角度
    cameraAngleV: 0.4, // 垂直角度
    cameraDistance: 350,
  });

  // 重置模拟时间
  useEffect(() => {
    simRef.current.days = 0;
    propsRef.current.onTick(0);
  }, [resetToken]);

  // 初始化 3D 场景
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // 创建场景
    const scene = new THREE.Scene();
    simRef.current.scene = scene;

    // 创建相机
    const camera = new THREE.PerspectiveCamera(
      60,
      container.clientWidth / container.clientHeight,
      0.1,
      10000
    );
    updateCameraPosition(camera, simRef.current.cameraAngleH, simRef.current.cameraAngleV, simRef.current.cameraDistance);
    simRef.current.camera = camera;

    // 创建渲染器
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    container.appendChild(renderer.domElement);
    simRef.current.renderer = renderer;

    // 创建星空背景
    createStarfield(scene);

    // 创建太阳
    const sunGeometry = new THREE.SphereGeometry(20, 32, 32);
    const sunMaterial = new THREE.MeshBasicMaterial({ 
      color: 0xffaa00,
    });
    const sunMesh = new THREE.Mesh(sunGeometry, sunMaterial);
    
    // 添加太阳光晕效果
    const glowMaterial = new THREE.ShaderMaterial({
      uniforms: {
        c: { value: 0.5 },
        p: { value: 3.5 },
        glowColor: { value: new THREE.Color(0xffaa00) },
        viewVector: { value: camera.position },
      },
      vertexShader: `
        uniform vec3 viewVector;
        varying float intensity;
        void main() {
          vec3 vNormal = normalize(normalMatrix * normal);
          vec3 vNormel = normalize(normalMatrix * viewVector);
          intensity = pow(0.7 - dot(vNormal, vNormel), 2.0);
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform vec3 glowColor;
        varying float intensity;
        void main() {
          vec3 glow = glowColor * intensity;
          gl_FragColor = vec4(glow, 1.0);
        }
      `,
      side: THREE.BackSide,
      blending: THREE.AdditiveBlending,
      transparent: true,
    });
    
    const glowMesh = new THREE.Mesh(
      new THREE.SphereGeometry(28, 32, 32),
      glowMaterial
    );
    sunMesh.add(glowMesh);
    
    scene.add(sunMesh);
    simRef.current.sunMesh = sunMesh;

    // 添加点光源（太阳发光）
    const sunLight = new THREE.PointLight(0xffffff, 2, 500);
    sunLight.position.set(0, 0, 0);
    scene.add(sunLight);

    // 添加环境光
    const ambientLight = new THREE.AmbientLight(0x333333);
    scene.add(ambientLight);

    // 创建行星
    PLANETS.forEach((pl, index) => {
      const radius = displayRadius(pl.diameterKm) * 0.5;
      const geometry = new THREE.SphereGeometry(radius, 32, 32);
      
      // 创建材质
      const material = new THREE.MeshStandardMaterial({
        color: pl.color,
        roughness: 0.7,
        metalness: 0.1,
      });
      
      const mesh = new THREE.Mesh(geometry, material);
      mesh.userData.radius = radius;
      scene.add(mesh);
      simRef.current.planetMeshes.set(pl.id, mesh);

      // 为土星添加环
      if (pl.id === "saturn") {
        const ringGeometry = new THREE.RingGeometry(radius * 1.4, radius * 2.2, 64);
        const ringMaterial = new THREE.MeshBasicMaterial({
          color: 0xe6c98a,
          side: THREE.DoubleSide,
          transparent: true,
          opacity: 0.7,
        });
        const ring = new THREE.Mesh(ringGeometry, ringMaterial);
        ring.rotation.x = Math.PI / 2.5;
        mesh.add(ring);
      }

      // 为地球添加月球
      if (pl.id === "earth") {
        const moonGeometry = new THREE.SphereGeometry(radius * 0.27, 16, 16);
        const moonMaterial = new THREE.MeshStandardMaterial({ color: 0xc9ccd4 });
        const moon = new THREE.Mesh(moonGeometry, moonMaterial);
        moon.userData.isMoon = true;
        mesh.add(moon);
      }

      // 创建轨道线
      if (showOrbits) {
        const orbitRadius = orbitT(pl.au) * 100;
        const points = [];
        for (let i = 0; i <= 64; i++) {
          const angle = (i / 64) * TAU;
          points.push(new THREE.Vector3(
            Math.cos(angle) * orbitRadius,
            0,
            Math.sin(angle) * orbitRadius
          ));
        }
        const orbitGeometry = new THREE.BufferGeometry().setFromPoints(points);
        const orbitMaterial = new THREE.LineBasicMaterial({
          color: 0x94aac8,
          transparent: true,
          opacity: 0.3,
        });
        const orbit = new THREE.Line(orbitGeometry, orbitMaterial);
        orbit.rotation.x = Math.PI / 2;
        scene.add(orbit);
        simRef.current.orbitLines.set(pl.id, orbit);
      }
    });

    // 创建标签容器
    const labelContainer = document.createElement("div");
    labelContainer.style.cssText = `
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      pointer-events: none;
      overflow: hidden;
    `;
    container.appendChild(labelContainer);

    // 事件处理：鼠标拖动旋转视角
    const onMouseDown = (e: MouseEvent) => {
      simRef.current.isDragging = true;
      simRef.current.lastMouseX = e.clientX;
      simRef.current.lastMouseY = e.clientY;
    };

    const onMouseMove = (e: MouseEvent) => {
      if (!simRef.current.isDragging) return;
      
      const deltaX = e.clientX - simRef.current.lastMouseX;
      const deltaY = e.clientY - simRef.current.lastMouseY;
      
      simRef.current.cameraAngleH -= deltaX * 0.005;
      simRef.current.cameraAngleV -= deltaY * 0.005;
      
      // 限制垂直角度
      simRef.current.cameraAngleV = Math.max(-Math.PI / 2 + 0.1, Math.min(Math.PI / 2 - 0.1, simRef.current.cameraAngleV));
      
      simRef.current.lastMouseX = e.clientX;
      simRef.current.lastMouseY = e.clientY;
      
      if (simRef.current.camera) {
        updateCameraPosition(
          simRef.current.camera,
          simRef.current.cameraAngleH,
          simRef.current.cameraAngleV,
          simRef.current.cameraDistance
        );
      }
    };

    const onMouseUp = () => {
      simRef.current.isDragging = false;
    };

    const onWheel = (e: WheelEvent) => {
      simRef.current.cameraDistance += e.deltaY * 0.1;
      simRef.current.cameraDistance = Math.max(50, Math.min(800, simRef.current.cameraDistance));
      
      if (simRef.current.camera) {
        updateCameraPosition(
          simRef.current.camera,
          simRef.current.cameraAngleH,
          simRef.current.cameraAngleV,
          simRef.current.cameraDistance
        );
      }
    };

    // 点击选择行星
    const onClick = (e: MouseEvent) => {
      if (simRef.current.isDragging) return;
      
      const rect = renderer.domElement.getBoundingClientRect();
      simRef.current.mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      simRef.current.mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
      
      simRef.current.raycaster.setFromCamera(simRef.current.mouse, camera);
      
      const meshes: THREE.Mesh[] = [sunMesh!, ...Array.from(simRef.current.planetMeshes.values())];
      const intersects = simRef.current.raycaster.intersectObjects(meshes, true);
      
      if (intersects.length > 0) {
        let obj = intersects[0].object;
        // 如果是月球或环，找到父级行星
        while (
          obj.parent &&
          !Array.from(simRef.current.planetMeshes.values()).some((mesh) => mesh === obj) &&
          obj !== sunMesh
        ) {
          obj = obj.parent;
        }
        
        if (obj === sunMesh) {
          onSelect("sun");
        } else {
          for (const [id, mesh] of simRef.current.planetMeshes.entries()) {
            if (mesh === obj) {
              onSelect(id);
              break;
            }
          }
        }
      }
    };

    container.addEventListener("mousedown", onMouseDown);
    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);
    container.addEventListener("wheel", onWheel, { passive: true });
    container.addEventListener("click", onClick);

    // 处理窗口大小变化
    const handleResize = () => {
      if (!container || !camera || !renderer) return;
      camera.aspect = container.clientWidth / container.clientHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(container.clientWidth, container.clientHeight);
    };

    const resizeObserver = new ResizeObserver(handleResize);
    resizeObserver.observe(container);

    // 动画循环
    let raf = 0;
    let lastTime = performance.now();

    const animate = (now: number) => {
      const dt = (now - lastTime) / 1000;
      lastTime = now;

      const p = propsRef.current;
      const sim = simRef.current;
      
      if (p.playing) {
        sim.days += dt * BASE_DAYS_PER_SEC * p.speed;
      }

      // 更新行星位置
      PLANETS.forEach((pl, index) => {
        const mesh = sim.planetMeshes.get(pl.id);
        if (!mesh) return;

        const orbitRadius = orbitT(pl.au) * 100;
        const baseTheta = index * 2.399 + 0.7;
        const theta = baseTheta + (TAU * sim.days) / pl.periodDays;

        mesh.position.x = Math.cos(theta) * orbitRadius;
        mesh.position.z = Math.sin(theta) * orbitRadius;

        // 更新月球位置
        const moon = mesh.children.find((c) => c.userData.isMoon);
        if (moon) {
          const moonOrbit = (mesh.userData.radius as number) + 15;
          const moonTheta = (TAU * sim.days) / 27.3;
          moon.position.x = Math.cos(moonTheta) * moonOrbit;
          moon.position.z = Math.sin(moonTheta) * moonOrbit * 0.9;
        }

        // 更新轨道线
        if (p.showOrbits) {
          const orbit = sim.orbitLines.get(pl.id);
          if (orbit) {
            orbit.visible = true;
          }
        } else {
          const orbit = sim.orbitLines.get(pl.id);
          if (orbit) {
            orbit.visible = false;
          }
        }
      });

      // 更新太阳光晕
      if (sim.sunMesh) {
        const pulse = 1 + 0.035 * Math.sin(now / 1000 * 2.1);
        sim.sunMesh.scale.set(pulse, pulse, pulse);
      }

      // 更新标签位置
      updateLabels(camera, renderer.domElement);

      renderer.render(scene, camera);
      raf = requestAnimationFrame(animate);
    };

    raf = requestAnimationFrame(animate);

    // 清理函数
    return () => {
      cancelAnimationFrame(raf);
      resizeObserver.disconnect();
      container.removeEventListener("mousedown", onMouseDown);
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
      container.removeEventListener("wheel", onWheel);
      container.removeEventListener("click", onClick);
      
      if (labelContainer.parentNode) {
        labelContainer.parentNode.removeChild(labelContainer);
      }
      
      // 清理 Three.js 资源
      scene.traverse((object) => {
        if ((object as THREE.Mesh).isMesh) {
          const mesh = object as THREE.Mesh;
          if (mesh.geometry) mesh.geometry.dispose();
          if (mesh.material) {
            if (Array.isArray(mesh.material)) {
              mesh.material.forEach((m) => m.dispose());
            } else {
              mesh.material.dispose();
            }
          }
        }
      });
      
      renderer.dispose();
      
      if (renderer.domElement.parentNode) {
        renderer.domElement.parentNode.removeChild(renderer.domElement);
      }
    };
  }, []);

  // 更新轨道显示
  useEffect(() => {
    const sim = simRef.current;
    sim.orbitLines.forEach((orbit, id) => {
      orbit.visible = simRef.current.scene ? true : false;
    });
  }, [showOrbits]);

  // 更新标签
  const updateLabels = useCallback((camera: THREE.Camera, canvas: HTMLCanvasElement) => {
    const sim = simRef.current;
    const p = propsRef.current;
    
    // 清除旧标签
    sim.labels.forEach((label) => label.remove());
    sim.labels.clear();
    
    if (!p.showLabels && !p.selectedId) return;
    
    const tempDiv = document.createElement("div");
    
    // 太阳标签
    if (p.showLabels || p.selectedId === "sun") {
      const label = createLabel(SUN.name, new THREE.Vector3(0, -25, 0), camera, canvas, p.selectedId === "sun");
      sim.labels.set("sun", label);
    }
    
    // 行星标签
    PLANETS.forEach((pl) => {
      if (p.showLabels || p.selectedId === pl.id) {
        const mesh = sim.planetMeshes.get(pl.id);
        if (mesh) {
          const label = createLabel(
            pl.name,
            new THREE.Vector3(
              mesh.position.x,
              mesh.position.y - (mesh.userData.radius as number) - 5,
              mesh.position.z,
            ),
            camera,
            canvas,
            p.selectedId === pl.id
          );
          sim.labels.set(pl.id, label);
        }
      }
    });
  }, []);

  return (
    <div
      ref={containerRef}
      style={{
        width: "100%",
        height: "100%",
        position: "relative",
        cursor: simRef.current.isDragging ? "grabbing" : "grab",
      }}
    />
  );
}

// 更新相机位置
function updateCameraPosition(
  camera: THREE.Camera,
  angleH: number,
  angleV: number,
  distance: number
) {
  const x = distance * Math.cos(angleV) * Math.sin(angleH);
  const y = distance * Math.sin(angleV);
  const z = distance * Math.cos(angleV) * Math.cos(angleH);
  camera.position.set(x, y, z);
  camera.lookAt(0, 0, 0);
}

// 创建星空背景
function createStarfield(scene: THREE.Scene) {
  const starGeometry = new THREE.BufferGeometry();
  const starCount = 2000;
  const positions = new Float32Array(starCount * 3);
  const colors = new Float32Array(starCount * 3);
  
  for (let i = 0; i < starCount * 3; i += 3) {
    const radius = 800 + Math.random() * 400;
    const theta = Math.random() * TAU;
    const phi = Math.acos(2 * Math.random() - 1);
    
    positions[i] = radius * Math.sin(phi) * Math.cos(theta);
    positions[i + 1] = radius * Math.sin(phi) * Math.sin(theta);
    positions[i + 2] = radius * Math.cos(phi);
    
    // 星星颜色变化
    const colorChoice = Math.random();
    if (colorChoice < 0.7) {
      // 白色
      colors[i] = 1;
      colors[i + 1] = 1;
      colors[i + 2] = 1;
    } else if (colorChoice < 0.85) {
      // 蓝色
      colors[i] = 0.7;
      colors[i + 1] = 0.8;
      colors[i + 2] = 1;
    } else {
      // 黄色
      colors[i] = 1;
      colors[i + 1] = 0.9;
      colors[i + 2] = 0.7;
    }
  }
  
  starGeometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  starGeometry.setAttribute("color", new THREE.BufferAttribute(colors, 3));
  
  const starMaterial = new THREE.PointsMaterial({
    size: 1.5,
    vertexColors: true,
    transparent: true,
    opacity: 0.8,
  });
  
  const stars = new THREE.Points(starGeometry, starMaterial);
  scene.add(stars);
}

// 创建标签
function createLabel(
  text: string,
  position: THREE.Vector3,
  camera: THREE.Camera,
  canvas: HTMLCanvasElement,
  isSelected: boolean
): HTMLDivElement {
  const div = document.createElement("div");
  div.textContent = text;
  div.style.cssText = `
    position: absolute;
    font-family: "Noto Sans SC", sans-serif;
    font-size: 11px;
    font-weight: 500;
    color: ${isSelected ? "rgba(255,255,255,0.95)" : "rgba(196,214,238,0.72)"};
    text-align: center;
    pointer-events: none;
    transform: translate(-50%, -100%);
    white-space: nowrap;
  `;
  
  canvas.parentElement?.appendChild(div);
  updateLabelPosition(div, position, camera, canvas);
  
  return div;
}

// 更新标签位置
function updateLabelPosition(
  label: HTMLDivElement,
  position: THREE.Vector3,
  camera: THREE.Camera,
  canvas: HTMLCanvasElement
) {
  const tempV = position.clone();
  tempV.project(camera);
  
  const x = (tempV.x * 0.5 + 0.5) * canvas.clientWidth;
  const y = (-tempV.y * 0.5 + 0.5) * canvas.clientHeight;
  
  // 检查是否在相机视野内
  if (tempV.z > 1) {
    label.style.display = "none";
  } else {
    label.style.display = "block";
    label.style.left = `${x}px`;
    label.style.top = `${y}px`;
  }
}
