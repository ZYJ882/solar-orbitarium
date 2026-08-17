import { useEffect, useRef, useCallback } from "react";
import {
  ACESFilmicToneMapping,
  AdditiveBlending,
  AmbientLight,
  BackSide,
  BufferAttribute,
  BufferGeometry,
  Camera,
  Color,
  DirectionalLight,
  DoubleSide,
  Group,
  Line,
  LineBasicMaterial,
  Mesh,
  MeshBasicMaterial,
  MeshStandardMaterial,
  PerspectiveCamera,
  PointLight,
  Points,
  PointsMaterial,
  Raycaster,
  RingGeometry,
  Scene,
  SRGBColorSpace,
  ShaderMaterial,
  SphereGeometry,
  Vector2,
  Vector3,
  WebGLRenderer,
} from "three";
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
// 保持镜头在黄道面上方，避免纵向拖动越过地平线后出现上下颠倒的观察体验。
const MIN_CAMERA_PITCH = 0.16;
const MAX_CAMERA_PITCH = 1.23;

// 教学模型采用圆轨道与非线性缩放；保留各行星相对黄道面的真实轨道倾角和升交点方向。
const ORBIT_TILTS_DEG: Record<string, number> = {
  mercury: 7.0,
  venus: 3.39,
  earth: 0,
  mars: 1.85,
  jupiter: 1.3,
  saturn: 2.49,
  uranus: 0.77,
  neptune: 1.77,
};
const ASCENDING_NODES_DEG: Record<string, number> = {
  mercury: 48.3,
  venus: 76.7,
  earth: 0,
  mars: 49.6,
  jupiter: 100.6,
  saturn: 113.7,
  uranus: 74.0,
  neptune: 131.8,
};

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
  // 采用适合手机屏幕的非线性显示比例，避免太阳压住内行星。
  return 2.6 + 8.8 * t;
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
    scene: null as Scene | null,
    camera: null as PerspectiveCamera | null,
    renderer: null as WebGLRenderer | null,
    sunMesh: null as Mesh | null,
    planetMeshes: new Map<string, Mesh>(),
    orbitLines: new Map<string, Line>(),
    labels: new Map<string, HTMLDivElement>(),
    raycaster: new Raycaster(),
    mouse: new Vector2(),
    isDragging: false,
    lastMouseX: 0,
    lastMouseY: 0,
    lastTouchDistance: 0,
    dragDistance: 0,
    didDrag: false,
    cameraAngleH: 0, // 水平角度
    cameraAngleV: 0.4, // 垂直角度
    cameraDistance: 390,
    isLowPowerDevice: false,
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

    // 创建场景与响应式镜头：手机端留出完整轨道层级，避免太阳和土星环占满画面。
    const isCompactViewport = container.clientWidth < 560;
    const scene = new Scene();
    simRef.current.scene = scene;

    // 创建相机
    const camera = new PerspectiveCamera(
      isCompactViewport ? 48 : 55,
      container.clientWidth / container.clientHeight,
      0.1,
      10000
    );
    simRef.current.cameraDistance = isCompactViewport ? 470 : 390;
    simRef.current.cameraAngleV = isCompactViewport ? 0.62 : 0.46;
    updateCameraPosition(camera, simRef.current.cameraAngleH, simRef.current.cameraAngleV, simRef.current.cameraDistance);
    simRef.current.camera = camera;

    // 创建渲染器：保留高清抗锯齿，同时记录设备性能等级供几何体和标签降载使用。
    const isLowPowerDevice =
      window.matchMedia("(pointer: coarse)").matches ||
      (navigator.hardwareConcurrency ?? 8) <= 4;
    simRef.current.isLowPowerDevice = isLowPowerDevice;
    const renderer = new WebGLRenderer({ antialias: true, alpha: true });
    renderer.outputColorSpace = SRGBColorSpace;
    renderer.toneMapping = ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.2;
    renderer.setSize(container.clientWidth, container.clientHeight);
    // 使用更高的像素比率以获得更清晰的渲染效果
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    container.appendChild(renderer.domElement);
    simRef.current.renderer = renderer;

    // 创建星空背景
    createStarfield(scene);

    // 创建太阳 - 增加分段数使球体更圆滑
    const sunSegments = 48;
    const planetSegments = 32;
    const sunGeometry = new SphereGeometry(8.5, sunSegments, sunSegments);
    const sunMaterial = new MeshBasicMaterial({
      color: 0xffaa00,
    });
    const sunMesh = new Mesh(sunGeometry, sunMaterial);

    // 添加太阳光晕效果
    const glowMaterial = new ShaderMaterial({
      uniforms: {
        c: { value: 0.5 },
        p: { value: 3.5 },
        glowColor: { value: new Color(0xffaa00) },
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
      side: BackSide,
      blending: AdditiveBlending,
      transparent: true,
    });

    const glowMesh = new Mesh(
      new SphereGeometry(13.5, sunSegments, sunSegments),
      glowMaterial
    );
    sunMesh.add(glowMesh);

    scene.add(sunMesh);
    simRef.current.sunMesh = sunMesh;

    // 使用不依赖距离的方向光 + 受控点光源，避免手机端远处行星因物理衰减变黑。
    const sunLight = new PointLight(0xffffff, 360, 0, 2);
    sunLight.position.set(0, 0, 0);
    scene.add(sunLight);

    const fillLight = new DirectionalLight(0xb8d6ff, 1.8);
    fillLight.position.set(-120, 90, 140);
    scene.add(fillLight);

    // 柔和环境光负责保留行星背光面的轮廓和颜色。
    const ambientLight = new AmbientLight(0x6680a6, 1.35);
    scene.add(ambientLight);

    // 创建行星 - 使用更高精度几何体和更细致的材质
    PLANETS.forEach((pl, index) => {
      const radius = displayRadius(pl.diameterKm) * 0.5;
      const geometry = new SphereGeometry(radius, planetSegments, planetSegments);

      // 为不同天体创建更精细的材质，增加表面细节感
      const material = new MeshStandardMaterial({
        color: pl.color,
        roughness: pl.id === "earth" ? 0.45 : 0.72,
        metalness: pl.id === "earth" ? 0.08 : 0,
        // 适当增加自发光，提升暗部细节可见度
        emissive: new Color(pl.color),
        emissiveIntensity: pl.id === "earth" ? 0.06 : 0.12,
      });

      const mesh = new Mesh(geometry, material);
      mesh.userData.radius = radius;
      scene.add(mesh);
      simRef.current.planetMeshes.set(pl.id, mesh);

      // 为土星添加带有卡西尼缝隙感的多层环系，而不是一块平面的粗圆环。
      if (pl.id === "saturn") {
        const ringGroup = createSaturnRings(radius, isLowPowerDevice);
        mesh.add(ringGroup);
      }

      // 为地球添加月球 - 增加月球精度
      if (pl.id === "earth") {
        const moonGeometry = new SphereGeometry(radius * 0.27, 20, 20);
        const moonMaterial = new MeshStandardMaterial({
          color: 0xc9ccd4,
          emissive: new Color(0x566174),
          emissiveIntensity: 0.08,
          roughness: 0.85,
        });
        const moon = new Mesh(moonGeometry, moonMaterial);
        moon.userData.isMoon = true;
        mesh.add(moon);
      }

      // 创建轨道线 - 增加分段数使轨道更平滑
      {
        const orbitRadius = orbitT(pl.au) * 100;
        const points = [];
        const orbitSegments = 96;
        for (let i = 0; i <= orbitSegments; i++) {
          const angle = (i / orbitSegments) * TAU;
          points.push(getOrbitPosition(orbitRadius, angle, pl.id));
        }
        const orbitGeometry = new BufferGeometry().setFromPoints(points);
        const orbitMaterial = new LineBasicMaterial({
          color: 0x94aac8,
          transparent: true,
          opacity: 0.35,
        });
        const orbit = new Line(orbitGeometry, orbitMaterial);
        orbit.visible = showOrbits;
        scene.add(orbit);
        simRef.current.orbitLines.set(pl.id, orbit);
      }
    });

    // 事件处理：鼠标拖动旋转视角
    const onMouseDown = (e: MouseEvent) => {
      simRef.current.isDragging = true;
      simRef.current.dragDistance = 0;
      simRef.current.didDrag = false;
      simRef.current.lastMouseX = e.clientX;
      simRef.current.lastMouseY = e.clientY;
    };

    const onMouseMove = (e: MouseEvent) => {
      if (!simRef.current.isDragging) return;

      const deltaX = e.clientX - simRef.current.lastMouseX;
      const deltaY = e.clientY - simRef.current.lastMouseY;

      simRef.current.dragDistance += Math.abs(deltaX) + Math.abs(deltaY);
      simRef.current.didDrag = simRef.current.dragDistance > 5;
      simRef.current.cameraAngleH = normalizeAngle(simRef.current.cameraAngleH - deltaX * 0.005);
      simRef.current.cameraAngleV = clampCameraPitch(simRef.current.cameraAngleV + deltaY * 0.005);

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
      e.preventDefault();
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

    // 触摸事件处理（手机控制）
    const onTouchStart = (e: TouchEvent) => {
      if (e.touches.length === 1) {
        // 单指拖动
        simRef.current.isDragging = true;
        simRef.current.dragDistance = 0;
        simRef.current.didDrag = false;
        simRef.current.lastMouseX = e.touches[0].clientX;
        simRef.current.lastMouseY = e.touches[0].clientY;
      } else if (e.touches.length === 2) {
        // 双指捏合缩放
        simRef.current.isDragging = false;
        simRef.current.didDrag = true;
        const dx = e.touches[0].clientX - e.touches[1].clientX;
        const dy = e.touches[0].clientY - e.touches[1].clientY;
        simRef.current.lastTouchDistance = Math.sqrt(dx * dx + dy * dy);
      }
    };

    const onTouchMove = (e: TouchEvent) => {
      e.preventDefault();

      if (e.touches.length === 1 && simRef.current.isDragging) {
        // 单指拖动旋转
        const deltaX = e.touches[0].clientX - simRef.current.lastMouseX;
        const deltaY = e.touches[0].clientY - simRef.current.lastMouseY;

        simRef.current.dragDistance += Math.abs(deltaX) + Math.abs(deltaY);
        simRef.current.didDrag = simRef.current.dragDistance > 5;
        simRef.current.cameraAngleH = normalizeAngle(simRef.current.cameraAngleH - deltaX * 0.005);
        simRef.current.cameraAngleV = clampCameraPitch(simRef.current.cameraAngleV + deltaY * 0.005);

        simRef.current.lastMouseX = e.touches[0].clientX;
        simRef.current.lastMouseY = e.touches[0].clientY;

        if (simRef.current.camera) {
          updateCameraPosition(
            simRef.current.camera,
            simRef.current.cameraAngleH,
            simRef.current.cameraAngleV,
            simRef.current.cameraDistance
          );
        }
      } else if (e.touches.length === 2) {
        // 双指捏合缩放
        const dx = e.touches[0].clientX - e.touches[1].clientX;
        const dy = e.touches[0].clientY - e.touches[1].clientY;
        const currentDistance = Math.sqrt(dx * dx + dy * dy);

        if (simRef.current.lastTouchDistance > 0) {
          const delta = currentDistance - simRef.current.lastTouchDistance;
          simRef.current.cameraDistance -= delta * 0.5;
          simRef.current.cameraDistance = Math.max(50, Math.min(800, simRef.current.cameraDistance));

          if (simRef.current.camera) {
            updateCameraPosition(
              simRef.current.camera,
              simRef.current.cameraAngleH,
              simRef.current.cameraAngleV,
              simRef.current.cameraDistance
            );
          }
        }

        simRef.current.lastTouchDistance = currentDistance;
      }
    };

    const onTouchEnd = (e: TouchEvent) => {
      // 双指缩放后保留一根手指时，立即平滑切回单指旋转，而不是失去控制。
      if (e.touches.length === 1) {
        simRef.current.isDragging = true;
        simRef.current.lastTouchDistance = 0;
        simRef.current.lastMouseX = e.touches[0].clientX;
        simRef.current.lastMouseY = e.touches[0].clientY;
        return;
      }
      simRef.current.isDragging = false;
      simRef.current.lastTouchDistance = 0;
    };

    // 点击选择行星
    const onClick = (e: MouseEvent) => {
      // 拖动结束后浏览器仍会派发 click；跳过它，避免旋转镜头时误选天体。
      if (simRef.current.isDragging || simRef.current.didDrag) {
        simRef.current.didDrag = false;
        return;
      }

      const rect = renderer.domElement.getBoundingClientRect();
      simRef.current.mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      simRef.current.mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

      simRef.current.raycaster.setFromCamera(simRef.current.mouse, camera);

      const meshes: Mesh[] = [sunMesh!, ...Array.from(simRef.current.planetMeshes.values())];
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
    container.addEventListener("wheel", onWheel, { passive: false });
    container.addEventListener("click", onClick);

    // 触摸事件监听（手机控制）
    container.addEventListener("touchstart", onTouchStart, { passive: false });
    container.addEventListener("touchmove", onTouchMove, { passive: false });
    container.addEventListener("touchend", onTouchEnd);
    container.addEventListener("touchcancel", onTouchEnd);

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
    let frameCount = 0;
    let isPageVisible = document.visibilityState === "visible";
    let lastTime = performance.now();
    const onVisibilityChange = () => {
      isPageVisible = document.visibilityState === "visible";
      lastTime = performance.now();
    };
    document.addEventListener("visibilitychange", onVisibilityChange);

    const animate = (now: number) => {
      const dt = (now - lastTime) / 1000;
      lastTime = now;

      if (!isPageVisible) {
        raf = requestAnimationFrame(animate);
        return;
      }

      const p = propsRef.current;
      const sim = simRef.current;
      frameCount += 1;

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

        mesh.position.copy(getOrbitPosition(orbitRadius, theta, pl.id));

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

      // 标签位置不需要与画面每一帧同步；低功耗设备进一步降低更新频率。
      const labelUpdateInterval = sim.isLowPowerDevice ? 3 : 2;
      if (frameCount % labelUpdateInterval === 0) {
        updateLabels(camera, renderer.domElement);
      }

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
      document.removeEventListener("visibilitychange", onVisibilityChange);
      container.removeEventListener("wheel", onWheel);
      container.removeEventListener("click", onClick);
      container.removeEventListener("touchstart", onTouchStart);
      container.removeEventListener("touchmove", onTouchMove);
      container.removeEventListener("touchend", onTouchEnd);
      container.removeEventListener("touchcancel", onTouchEnd);

      simRef.current.labels.forEach((label) => label.remove());
      simRef.current.labels.clear();

      // 清理 Three.js 资源
      scene.traverse((object) => {
        if ((object as Mesh).isMesh) {
          const mesh = object as Mesh;
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
    simRef.current.orbitLines.forEach((orbit) => {
      orbit.visible = showOrbits;
    });
  }, [showOrbits]);

  // 更新标签：仅在需要时创建或删除，动画帧中复用既有 DOM 节点。
  const updateLabels = useCallback((camera: Camera, canvas: HTMLCanvasElement) => {
    const sim = simRef.current;
    const p = propsRef.current;
    const wanted = new Map<string, { text: string; position: Vector3; selected: boolean }>();

    if (p.showLabels || p.selectedId === "sun") {
      wanted.set("sun", {
        text: SUN.name,
        position: new Vector3(0, -25, 0),
        selected: p.selectedId === "sun",
      });
    }

    PLANETS.forEach((pl) => {
      if (!p.showLabels && p.selectedId !== pl.id) return;
      const mesh = sim.planetMeshes.get(pl.id);
      if (!mesh) return;
      wanted.set(pl.id, {
        text: pl.name,
        position: new Vector3(
          mesh.position.x,
          mesh.position.y - (mesh.userData.radius as number) - 5,
          mesh.position.z,
        ),
        selected: p.selectedId === pl.id,
      });
    });

    sim.labels.forEach((label, id) => {
      if (!wanted.has(id)) {
        label.remove();
        sim.labels.delete(id);
      }
    });

    wanted.forEach((item, id) => {
      let label = sim.labels.get(id);
      if (!label) {
        label = createLabel(item.text, item.position, camera, canvas, item.selected);
        sim.labels.set(id, label);
      }
      label.style.color = item.selected ? "rgba(255,255,255,0.95)" : "rgba(196,214,238,0.72)";
      updateLabelPosition(label, item.position, camera, canvas);
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
        touchAction: "none", // 禁止浏览器默认触摸行为
      }}
    />
  );
}

// 更新相机位置
function clampCameraPitch(angle: number) {
  return Math.max(MIN_CAMERA_PITCH, Math.min(MAX_CAMERA_PITCH, angle));
}

function normalizeAngle(angle: number) {
  return ((angle + Math.PI) % TAU + TAU) % TAU - Math.PI;
}

function getOrbitPosition(radius: number, theta: number, planetId: string) {
  const node = (ASCENDING_NODES_DEG[planetId] ?? 0) * Math.PI / 180;
  const tilt = (ORBIT_TILTS_DEG[planetId] ?? 0) * Math.PI / 180;
  const planarX = Math.cos(theta) * radius;
  const planarZ = Math.sin(theta) * radius;
  const nodeX = planarX * Math.cos(node) - planarZ * Math.sin(node);
  const nodeZ = planarX * Math.sin(node) + planarZ * Math.cos(node);

  return new Vector3(
    nodeX,
    nodeZ * Math.sin(tilt),
    nodeZ * Math.cos(tilt),
  );
}

function updateCameraPosition(
  camera: Camera,
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

// 创建精细化土星环：使用多个同心带模拟主要环区与卡西尼缝隙。
function createSaturnRings(radius: number, isLowPowerDevice: boolean) {
  const group = new Group();
  const segments = isLowPowerDevice ? 96 : 128;
  const bands = [
    { inner: 1.18, outer: 1.38, color: 0xb79b70, opacity: 0.78 },
    { inner: 1.44, outer: 1.60, color: 0xe0c99a, opacity: 0.88 },
    { inner: 1.68, outer: 1.84, color: 0x8f765a, opacity: 0.62 },
    { inner: 1.93, outer: 2.18, color: 0xd2b982, opacity: 0.72 },
    { inner: 2.24, outer: 2.38, color: 0x77634f, opacity: 0.45 },
  ];

  bands.forEach(({ inner, outer, color, opacity }) => {
    const ring = new Mesh(
      new RingGeometry(radius * inner, radius * outer, segments),
      new MeshStandardMaterial({
        color,
        roughness: 0.85,
        metalness: 0,
        emissive: new Color(color),
        emissiveIntensity: 0.1,
        side: DoubleSide,
        transparent: true,
        opacity,
        depthWrite: false,
      }),
    );
    // RingGeometry 原始平面为 XY；旋转到黄道面后再施加土星约 26.7° 的轴倾角。
    ring.rotation.x = Math.PI / 2 - 26.7 * Math.PI / 180;
    ring.rotation.z = 0.06;
    group.add(ring);
  });

  return group;
}

// 创建星空背景 - 增加星星数量和大小变化，使背景更丰富细致
function createStarfield(scene: Scene) {
  const starGeometry = new BufferGeometry();
  // 增加星星数量，创造更密集的星空
  const starCount = 2000;
  const positions = new Float32Array(starCount * 3);
  const colors = new Float32Array(starCount * 3);
  const sizes = new Float32Array(starCount);

  for (let i = 0; i < starCount * 3; i += 3) {
    const radius = 800 + Math.random() * 600;
    const theta = Math.random() * TAU;
    const phi = Math.acos(2 * Math.random() - 1);

    positions[i] = radius * Math.sin(phi) * Math.cos(theta);
    positions[i + 1] = radius * Math.sin(phi) * Math.sin(theta);
    positions[i + 2] = radius * Math.cos(phi);

    // 星星颜色变化 - 增加更多颜色种类
    const colorChoice = Math.random();
    if (colorChoice < 0.65) {
      // 白色
      colors[i] = 1;
      colors[i + 1] = 1;
      colors[i + 2] = 1;
    } else if (colorChoice < 0.80) {
      // 蓝色
      colors[i] = 0.65;
      colors[i + 1] = 0.75;
      colors[i + 2] = 1;
    } else if (colorChoice < 0.90) {
      // 黄色
      colors[i] = 1;
      colors[i + 1] = 0.92;
      colors[i + 2] = 0.75;
    } else if (colorChoice < 0.96) {
      // 淡红色
      colors[i] = 1;
      colors[i + 1] = 0.82;
      colors[i + 2] = 0.78;
    } else {
      // 青蓝色
      colors[i] = 0.75;
      colors[i + 1] = 0.9;
      colors[i + 2] = 1;
    }
    
    // 星星大小变化
    sizes[i / 3] = 1.0 + Math.random() * 2.5;
  }

  starGeometry.setAttribute("position", new BufferAttribute(positions, 3));
  starGeometry.setAttribute("color", new BufferAttribute(colors, 3));
  starGeometry.setAttribute("size", new BufferAttribute(sizes, 1));

  const starMaterial = new PointsMaterial({
    size: 2.0,
    vertexColors: true,
    transparent: true,
    opacity: 0.85,
    sizeAttenuation: true,
  });

  const stars = new Points(starGeometry, starMaterial);
  scene.add(stars);
}

// 创建标签
function createLabel(
  text: string,
  position: Vector3,
  camera: Camera,
  canvas: HTMLCanvasElement,
  isSelected: boolean
): HTMLDivElement {
  const div = document.createElement("div");
  div.textContent = text;
  div.style.cssText = `
    position: absolute;
    font-family: "Noto Sans SC", sans-serif;
    font-size: 10px;
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
  position: Vector3,
  camera: Camera,
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
