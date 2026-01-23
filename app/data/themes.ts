import { Theme } from '@/app/types/background';

// --- Preset Themes ---
export const themes: Theme[] = [
  {
    id: 'morning',
    name: 'Morning Mist',
    pageBg: 'bg-[#f2f0eb]',
    skyGradient: 'bg-gradient-to-b from-orange-100 via-rose-100 to-indigo-100',
    waterGradient: 'bg-gradient-to-b from-indigo-100 via-teal-100 to-emerald-100',
    orbColors: {
      sun: 'rgba(255, 218, 185, 0.6)',
      atmosphere: 'rgba(255, 228, 225, 0.4)',
      waterLight: 'rgba(175, 238, 238, 0.3)',
      waterDeep: 'rgba(46, 139, 87, 0.2)',
    },
    waveColors: [
      'rgba(240, 255, 255, 0.7)',
      'rgba(255, 245, 245, 0.5)',
      'rgba(255, 255, 255, 0.6)',
      'rgba(255, 255, 255, 0.2)',
    ],
    pageLayout: {
      box1Bg: 'transparent',
      box2Bg: 'bg-[#f2f0eb]',
      containerPaddingTop: '0px',
    }
  },
  {
    id: 'sakura',
    name: 'Sakura Breeze',
    pageBg: 'bg-pink-50',
    skyGradient: 'bg-gradient-to-b from-red-50 via-pink-100 to-purple-100',
    waterGradient: 'bg-gradient-to-b from-purple-100 via-fuchsia-200 to-violet-300',
    orbColors: {
      sun: 'rgba(255, 240, 245, 0.8)', // Lavender Blush
      atmosphere: 'rgba(255, 192, 203, 0.4)', // Pink
      waterLight: 'rgba(255, 228, 225, 0.3)', // Misty Rose
      waterDeep: 'rgba(148, 0, 211, 0.2)', // Violet
    },
    waveColors: [
      'rgba(255, 240, 245, 0.8)',
      'rgba(255, 182, 193, 0.5)',
      'rgba(255, 255, 255, 0.7)',
      'rgba(216, 191, 216, 0.4)',
    ],
    pageLayout: {
      box1Bg: 'transparent',
      box2Bg: 'bg-pink-50',
      containerPaddingTop: '0px',
    }
  },
  {
    id: 'coral',
    name: 'Coral Reef',
    pageBg: 'bg-orange-50',
    skyGradient: 'bg-gradient-to-b from-orange-100 via-amber-100 to-yellow-100',
    waterGradient: 'bg-gradient-to-b from-yellow-100 via-teal-200 to-teal-500',
    orbColors: {
      sun: 'rgba(255, 160, 122, 0.5)', // Light Salmon
      atmosphere: 'rgba(255, 218, 185, 0.4)', // Peach
      waterLight: 'rgba(64, 224, 208, 0.3)', // Turquoise
      waterDeep: 'rgba(0, 128, 128, 0.3)', // Teal
    },
    waveColors: [
      'rgba(255, 255, 224, 0.8)', // Light Yellow
      'rgba(255, 127, 80, 0.3)', // Coral tint
      'rgba(255, 255, 255, 0.7)',
      'rgba(0, 139, 139, 0.2)', // Dark Cyan
    ],
    pageLayout: {
      box1Bg: 'transparent',
      box2Bg: 'bg-orange-50',
      containerPaddingTop: '0px',
    }
  },
  {
    id: 'azure',
    name: 'Azure Day',
    pageBg: 'bg-sky-50',
    skyGradient: 'bg-gradient-to-b from-sky-300 via-sky-200 to-white',
    waterGradient: 'bg-gradient-to-b from-cyan-100 via-cyan-400 to-blue-600',
    orbColors: {
      sun: 'rgba(255, 255, 224, 0.9)', // Light Yellow Sun
      atmosphere: 'rgba(224, 255, 255, 0.4)', // Light Cyan
      waterLight: 'rgba(255, 255, 255, 0.5)', // High clarity
      waterDeep: 'rgba(0, 0, 205, 0.2)', // Medium Blue
    },
    waveColors: [
      'rgba(255, 255, 255, 0.9)',
      'rgba(224, 255, 255, 0.6)',
      'rgba(255, 255, 255, 0.8)',
      'rgba(135, 206, 235, 0.4)',
    ],
    pageLayout: {
      box1Bg: 'transparent',
      box2Bg: 'bg-sky-50',
      containerPaddingTop: '0px',
    }
  },
  {
    id: 'emerald',
    name: 'Emerald Springs',
    pageBg: 'bg-green-50',
    skyGradient: 'bg-gradient-to-b from-yellow-50 via-lime-50 to-green-100',
    waterGradient: 'bg-gradient-to-b from-emerald-100 via-emerald-600 to-green-900',
    orbColors: {
      sun: 'rgba(250, 250, 210, 0.6)',
      atmosphere: 'rgba(152, 251, 152, 0.3)',
      waterLight: 'rgba(144, 238, 144, 0.2)',
      waterDeep: 'rgba(0, 100, 0, 0.4)',
    },
    waveColors: [
      'rgba(240, 255, 240, 0.7)',
      'rgba(152, 251, 152, 0.5)',
      'rgba(255, 255, 255, 0.6)',
      'rgba(34, 139, 34, 0.3)',
    ],
    pageLayout: {
      box1Bg: 'transparent',
      box2Bg: 'bg-green-50',
      containerPaddingTop: '0px',
    }
  },
  {
    id: 'midnight',
    name: 'Deep Ocean',
    pageBg: 'bg-slate-900',
    skyGradient: 'bg-gradient-to-b from-slate-900 via-blue-900 to-indigo-900',
    waterGradient: 'bg-gradient-to-b from-indigo-950 via-blue-950 to-slate-950',
    orbColors: {
      sun: 'rgba(100, 149, 237, 0.3)',
      atmosphere: 'rgba(25, 25, 112, 0.6)',
      waterLight: 'rgba(0, 255, 255, 0.1)',
      waterDeep: 'rgba(0, 0, 50, 0.5)',
    },
    waveColors: [
      'rgba(100, 149, 237, 0.4)',
      'rgba(72, 61, 139, 0.4)',
      'rgba(173, 216, 230, 0.3)',
      'rgba(25, 25, 112, 0.5)',
    ],
    pageLayout: {
      box1Bg: 'transparent',
      box2Bg: 'bg-slate-900',
      containerPaddingTop: '0px',
    }
  },
  {
    id: 'deep-ocean',
    name: 'Deep Sea Abyss',
    pageBg: 'bg-slate-950', // 使用极深的底色呼应深蓝色调
    skyGradient: 'bg-gradient-to-b from-[#081c54] via-[#225ea8] to-[#1d91c0]', // 深蓝到湖蓝的过渡
    waterGradient: 'bg-gradient-to-b from-[#41b6c4] via-[#7fcdbb] to-[#f3f8cf]', // 青绿到浅黄的透光感
    orbColors: {
      sun: 'rgba(243, 248, 207, 0.6)', // 使用最亮的浅黄色作为光源
      atmosphere: 'rgba(127, 205, 187, 0.3)', // 蓝绿色大气感
      waterLight: 'rgba(65, 182, 196, 0.4)', // 青蓝色水光
      waterDeep: 'rgba(8, 28, 84, 0.5)', // 深蓝色基调
    },
    waveColors: [
      'rgba(243, 248, 207, 0.7)', // 浅黄色的浪尖亮光
      'rgba(199, 233, 180, 0.4)', // 浅绿色的过渡波纹
      'rgba(255, 255, 255, 0.5)', // 纯白浪花
      'rgba(34, 94, 168, 0.3)',   // 中段蓝色的阴影
    ],
    pageLayout: {
      box1Bg: 'transparent',
      box2Bg: 'bg-[#081c54]/20', // 半透明的深蓝背景
      containerPaddingTop: '0px',
    }
  },
  {
    id: 'sunset',
    name: 'Golden Hour',
    pageBg: 'bg-stone-100',
    skyGradient: 'bg-gradient-to-b from-orange-400 via-amber-200 to-yellow-100',
    waterGradient: 'bg-gradient-to-b from-amber-100 via-orange-200 to-red-200',
    orbColors: {
      sun: 'rgba(255, 69, 0, 0.4)',
      atmosphere: 'rgba(255, 215, 0, 0.3)',
      waterLight: 'rgba(255, 255, 224, 0.4)',
      waterDeep: 'rgba(139, 69, 19, 0.3)',
    },
    waveColors: [
      'rgba(255, 250, 205, 0.6)',
      'rgba(255, 160, 122, 0.5)',
      'rgba(255, 255, 255, 0.7)',
      'rgba(210, 105, 30, 0.2)',
    ],
    pageLayout: {
      box1Bg: 'transparent',
      box2Bg: 'bg-stone-100',
      containerPaddingTop: '0px',
    }
  },
  {
    id: 'noir',
    name: 'Monochrome Noir',
    pageBg: 'bg-gray-200',
    skyGradient: 'bg-gradient-to-b from-gray-100 via-gray-300 to-gray-400',
    waterGradient: 'bg-gradient-to-b from-gray-500 via-gray-700 to-black',
    orbColors: {
      sun: 'rgba(255, 255, 255, 0.8)',
      atmosphere: 'rgba(200, 200, 200, 0.5)',
      waterLight: 'rgba(255, 255, 255, 0.1)',
      waterDeep: 'rgba(0, 0, 0, 0.5)',
    },
    waveColors: [
      'rgba(255, 255, 255, 0.8)',
      'rgba(200, 200, 200, 0.6)',
      'rgba(150, 150, 150, 0.7)',
      'rgba(50, 50, 50, 0.5)',
    ],
    pageLayout: {
      box1Bg: 'transparent',
      box2Bg: 'bg-gray-200',
      containerPaddingTop: '0px',
    }
  },
  {
    id: 'glacial',
    name: 'Glacial Melt',
    pageBg: 'bg-slate-50',
    skyGradient: 'bg-gradient-to-b from-slate-50 via-cyan-50 to-sky-100',
    waterGradient: 'bg-gradient-to-b from-sky-100 via-cyan-200 to-blue-300',
    orbColors: {
      sun: 'rgba(224, 255, 255, 0.6)',
      atmosphere: 'rgba(240, 255, 255, 0.5)',
      waterLight: 'rgba(255, 255, 255, 0.4)',
      waterDeep: 'rgba(0, 119, 190, 0.3)',
    },
    waveColors: [
      'rgba(224, 255, 255, 0.8)',
      'rgba(176, 224, 230, 0.6)',
      'rgba(255, 255, 255, 0.9)',
      'rgba(70, 130, 180, 0.3)',
    ],
    pageLayout: {
      box1Bg: 'transparent',
      box2Bg: 'bg-slate-50',
      containerPaddingTop: '0px',
    }
  }
];
