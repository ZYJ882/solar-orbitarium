export interface CelestialBody {
  id: string;
  name: string;
  english: string;
  type: string;
  color: string;
  colorLight: string;
  colorDark: string;
  diameterKm: number;
  distanceMKm: number; // 与太阳的平均距离（百万公里），太阳为 0
  au: number; // 天文单位
  periodDays: number; // 公转周期（地球日），太阳为 0
  periodLabel: string;
  rotationLabel: string;
  moons: string;
  tempLabel: string;
  fact: string;
}

export const SUN: CelestialBody = {
  id: "sun",
  name: "太阳",
  english: "SUN",
  type: "恒星 · G2V 型",
  color: "#ffc84d",
  colorLight: "#fff6d8",
  colorDark: "#f08a1d",
  diameterKm: 1392700,
  distanceMKm: 0,
  au: 0,
  periodDays: 0,
  periodLabel: "—",
  rotationLabel: "约 25.4 天（赤道）",
  moons: "8 颗行星环绕",
  tempLabel: "5,505 °C（表面）",
  fact: "太阳占据了整个太阳系总质量的 99.86%，正是它的引力牵引着所有行星沿椭圆轨道运行。核心温度高达 1,500 万 °C，每秒钟将约 6 亿吨氢聚变为氦。",
};

export const PLANETS: CelestialBody[] = [
  {
    id: "mercury",
    name: "水星",
    english: "MERCURY",
    type: "类地行星",
    color: "#b5a397",
    colorLight: "#e0d3c4",
    colorDark: "#6e5f52",
    diameterKm: 4879,
    distanceMKm: 57.9,
    au: 0.39,
    periodDays: 88,
    periodLabel: "88 天",
    rotationLabel: "58.6 天",
    moons: "0",
    tempLabel: "-173 ~ 427 °C",
    fact: "距离太阳最近的行星，表面布满陨石坑，几乎没有大气保温，昼夜温差超过 600 °C，是太阳系中温差最极端的行星。",
  },
  {
    id: "venus",
    name: "金星",
    english: "VENUS",
    type: "类地行星",
    color: "#e8c46b",
    colorLight: "#fbe4a9",
    colorDark: "#a67c2e",
    diameterKm: 12104,
    distanceMKm: 108.2,
    au: 0.72,
    periodDays: 224.7,
    periodLabel: "224.7 天",
    rotationLabel: "243 天（逆向）",
    moons: "0",
    tempLabel: "约 464 °C",
    fact: "被浓厚的二氧化碳大气包裹，失控的温室效应使它成为最热的行星。它的自转方向与众相反——在金星上，太阳从西边升起。",
  },
  {
    id: "earth",
    name: "地球",
    english: "EARTH",
    type: "类地行星",
    color: "#4f9df5",
    colorLight: "#a6d0ff",
    colorDark: "#1d4e9e",
    diameterKm: 12756,
    distanceMKm: 149.6,
    au: 1.0,
    periodDays: 365.2,
    periodLabel: "365.2 天",
    rotationLabel: "23.9 小时",
    moons: "1（月球）",
    tempLabel: "约 15 °C",
    fact: "目前已知唯一孕育生命的星球。71% 的表面被海洋覆盖，恰到好处的日地距离让液态水得以长期存在——这里被称为「宜居带」。",
  },
  {
    id: "mars",
    name: "火星",
    english: "MARS",
    type: "类地行星",
    color: "#e0714f",
    colorLight: "#f6a583",
    colorDark: "#8c3a20",
    diameterKm: 6792,
    distanceMKm: 227.9,
    au: 1.52,
    periodDays: 687,
    periodLabel: "687 天",
    rotationLabel: "24.6 小时",
    moons: "2",
    tempLabel: "约 -63 °C",
    fact: "红色源自地表广泛分布的氧化铁。这里矗立着太阳系最高的火山——奥林帕斯山，高度约 21.9 公里，接近珠穆朗玛峰的 2.5 倍。",
  },
  {
    id: "jupiter",
    name: "木星",
    english: "JUPITER",
    type: "气态巨行星",
    color: "#d9a066",
    colorLight: "#f3c99a",
    colorDark: "#8a5a2c",
    diameterKm: 142984,
    distanceMKm: 778.6,
    au: 5.2,
    periodDays: 4333,
    periodLabel: "11.9 年",
    rotationLabel: "9.9 小时",
    moons: "95",
    tempLabel: "约 -108 °C",
    fact: "体积足以装下约 1,300 个地球，是太阳系最大的行星。标志性的大红斑是一场持续了至少 300 多年的巨型反气旋风暴。",
  },
  {
    id: "saturn",
    name: "土星",
    english: "SATURN",
    type: "气态巨行星",
    color: "#e6c98a",
    colorLight: "#f8e6b8",
    colorDark: "#9c7c3e",
    diameterKm: 120536,
    distanceMKm: 1433.5,
    au: 9.58,
    periodDays: 10759,
    periodLabel: "29.4 年",
    rotationLabel: "10.7 小时",
    moons: "146",
    tempLabel: "约 -139 °C",
    fact: "以壮观的冰质光环闻名——光环宽度超过 28 万公里，厚度却常常不足 1 公里。它的平均密度比水还低，理论上可以浮在水面上。",
  },
  {
    id: "uranus",
    name: "天王星",
    english: "URANUS",
    type: "冰巨行星",
    color: "#8fd5d8",
    colorLight: "#c9eef0",
    colorDark: "#3e8a92",
    diameterKm: 51118,
    distanceMKm: 2872.5,
    au: 19.19,
    periodDays: 30687,
    periodLabel: "84.0 年",
    rotationLabel: "17.2 小时（逆向）",
    moons: "28",
    tempLabel: "约 -197 °C",
    fact: "自转轴倾角高达 98°，几乎是「躺」着绕太阳滚动的行星——科学家推测这是远古时期一次剧烈撞击的结果。每个极点会经历 42 年的极昼或极夜。",
  },
  {
    id: "neptune",
    name: "海王星",
    english: "NEPTUNE",
    type: "冰巨行星",
    color: "#5b7fe8",
    colorLight: "#a8bcff",
    colorDark: "#27398f",
    diameterKm: 49528,
    distanceMKm: 4495.1,
    au: 30.07,
    periodDays: 60190,
    periodLabel: "164.8 年",
    rotationLabel: "16.1 小时",
    moons: "16",
    tempLabel: "约 -201 °C",
    fact: "先由数学计算预言位置、后被望远镜证实的行星。这里刮着太阳系最猛烈的风，风速可达 2,100 km/h，约为音速的 1.7 倍。",
  },
];

export const BODIES: CelestialBody[] = [SUN, ...PLANETS];

export const getBody = (id: string | null): CelestialBody | null =>
  BODIES.find((b) => b.id === id) ?? null;

/** 公转周期（天）→ 显示文案 */
export function formatDays(totalDays: number): string {
  const days = Math.max(0, Math.floor(totalDays));
  const years = Math.floor(days / 365.25);
  const rem = Math.floor(days % 365.25);
  if (years <= 0) return `${days} 天`;
  return `${years} 年 ${rem} 天`;
}

/** 公里数 → 千分位显示 */
export function formatKm(km: number): string {
  return km.toLocaleString("en-US");
}
