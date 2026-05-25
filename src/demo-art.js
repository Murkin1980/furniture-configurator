function sofaSVG(angle) {
  const svgs = [
    sofaFront,
    sofaFrontRight,
    sofaRight,
    sofaBackRight,
    sofaBack,
    sofaBackLeft,
    sofaLeft,
    sofaFrontLeft,
  ];
  return svgs[angle]();
}

function sofaFront() {
  return `<svg viewBox="0 0 400 300" xmlns="http://www.w3.org/2000/svg">
    <rect x="60" y="140" width="280" height="100" rx="8" fill="#8B7355"/>
    <rect x="60" y="140" width="280" height="40" rx="8" fill="#A0896B"/>
    <rect x="40" y="170" width="30" height="70" rx="6" fill="#6B5B45"/>
    <rect x="330" y="170" width="30" height="70" rx="6" fill="#6B5B45"/>
    <rect x="70" y="240" width="30" height="20" rx="4" fill="#4A3C2A"/>
    <rect x="150" y="240" width="30" height="20" rx="4" fill="#4A3C2A"/>
    <rect x="230" y="240" width="30" height="20" rx="4" fill="#4A3C2A"/>
    <rect x="310" y="240" width="30" height="20" rx="4" fill="#4A3C2A"/>
    <rect x="75" y="60" width="250" height="90" rx="10" fill="#A0896B"/>
    <rect x="85" y="55" width="230" height="30" rx="6" fill="#B8A58C"/>
  </svg>`;
}

function sofaFrontRight() {
  return `<svg viewBox="0 0 400 300" xmlns="http://www.w3.org/2000/svg">
    <polygon points="100,150 350,110 350,210 100,240" fill="#8B7355"/>
    <polygon points="100,150 350,110 350,140 100,175" fill="#A0896B"/>
    <polygon points="80,175 100,150 100,240 80,210" fill="#6B5B45"/>
    <rect x="340" y="120" width="25" height="80" rx="5" fill="#6B5B45" transform="skewY(8)"/>
    <rect x="110" y="230" width="28" height="18" rx="4" fill="#4A3C2A" transform="skewX(-4)"/>
    <rect x="210" y="225" width="28" height="18" rx="4" fill="#4A3C2A" transform="skewX(-4)"/>
    <rect x="290" y="210" width="28" height="18" rx="4" fill="#4A3C2A" transform="skewX(-4)"/>
    <polygon points="110,60 340,40 340,110 110,130" fill="#A0896B"/>
  </svg>`;
}

function sofaRight() {
  return `<svg viewBox="0 0 400 300" xmlns="http://www.w3.org/2000/svg">
    <rect x="140" y="100" width="100" height="140" rx="8" fill="#8B7355"/>
    <rect x="140" y="100" width="100" height="40" rx="8" fill="#A0896B"/>
    <rect x="120" y="130" width="30" height="110" rx="6" fill="#6B5B45"/>
    <rect x="170" y="240" width="24" height="18" rx="4" fill="#4A3C2A"/>
    <rect x="230" y="240" width="24" height="18" rx="4" fill="#4A3C2A"/>
    <rect x="155" y="30" width="70" height="80" rx="10" fill="#A0896B"/>
  </svg>`;
}

function sofaBackRight() {
  return `<svg viewBox="0 0 400 300" xmlns="http://www.w3.org/2000/svg">
    <polygon points="50,110 300,150 300,240 50,200" fill="#8B7355"/>
    <polygon points="50,110 300,150 300,175 50,140" fill="#A0896B"/>
    <polygon points="300,150 330,145 330,230 300,240" fill="#6B5B45"/>
    <rect x="55" y="120" width="25" height="70" rx="5" fill="#6B5B45" transform="skewY(-4)"/>
    <rect x="60" y="195" width="28" height="18" rx="4" fill="#4A3C2A"/>
    <rect x="160" y="208" width="28" height="18" rx="4" fill="#4A3C2A" transform="skewX(4)"/>
    <rect x="260" y="225" width="28" height="18" rx="4" fill="#4A3C2A" transform="skewX(4)"/>
    <polygon points="60,30 290,60 290,110 60,100" fill="#A0896B"/>
  </svg>`;
}

function sofaBack() {
  return `<svg viewBox="0 0 400 300" xmlns="http://www.w3.org/2000/svg">
    <rect x="60" y="140" width="280" height="100" rx="8" fill="#8B7355"/>
    <rect x="60" y="140" width="280" height="40" rx="8" fill="#7A6548"/>
    <rect x="40" y="170" width="30" height="70" rx="6" fill="#5C4E38"/>
    <rect x="330" y="170" width="30" height="70" rx="6" fill="#5C4E38"/>
    <rect x="70" y="240" width="30" height="20" rx="4" fill="#4A3C2A"/>
    <rect x="150" y="240" width="30" height="20" rx="4" fill="#4A3C2A"/>
    <rect x="230" y="240" width="30" height="20" rx="4" fill="#4A3C2A"/>
    <rect x="310" y="240" width="30" height="20" rx="4" fill="#4A3C2A"/>
    <rect x="75" y="50" width="250" height="95" rx="10" fill="#7A6548"/>
    <rect x="85" y="45" width="230" height="30" rx="6" fill="#8B7355"/>
  </svg>`;
}

function sofaBackLeft() {
  return `<svg viewBox="0 0 400 300" xmlns="http://www.w3.org/2000/svg">
    <polygon points="300,110 50,150 50,240 300,200" fill="#8B7355"/>
    <polygon points="300,110 50,150 50,175 300,140" fill="#7A6548"/>
    <polygon points="50,150 20,145 20,230 50,240" fill="#5C4E38"/>
    <rect x="295" y="120" width="25" height="70" rx="5" fill="#5C4E38" transform="skewY(4)"/>
    <rect x="290" y="195" width="28" height="18" rx="4" fill="#4A3C2A" transform="skewX(-4)"/>
    <rect x="190" y="208" width="28" height="18" rx="4" fill="#4A3C2A" transform="skewX(-4)"/>
    <rect x="90" y="225" width="28" height="18" rx="4" fill="#4A3C2A" transform="skewX(-4)"/>
    <polygon points="290,30 60,60 60,110 290,100" fill="#7A6548"/>
  </svg>`;
}

function sofaLeft() {
  return `<svg viewBox="0 0 400 300" xmlns="http://www.w3.org/2000/svg">
    <rect x="160" y="100" width="100" height="140" rx="8" fill="#8B7355"/>
    <rect x="160" y="100" width="100" height="40" rx="8" fill="#A0896B"/>
    <rect x="250" y="130" width="30" height="110" rx="6" fill="#6B5B45"/>
    <rect x="170" y="240" width="24" height="18" rx="4" fill="#4A3C2A"/>
    <rect x="230" y="240" width="24" height="18" rx="4" fill="#4A3C2A"/>
    <rect x="175" y="30" width="70" height="80" rx="10" fill="#A0896B"/>
  </svg>`;
}

function sofaFrontLeft() {
  return `<svg viewBox="0 0 400 300" xmlns="http://www.w3.org/2000/svg">
    <polygon points="300,150 50,110 50,240 300,210" fill="#8B7355"/>
    <polygon points="300,150 50,110 50,140 300,175" fill="#A0896B"/>
    <polygon points="320,175 300,150 300,210 320,210" fill="#6B5B45"/>
    <rect x="55" y="120" width="25" height="80" rx="5" fill="#6B5B45" transform="skewY(-8)"/>
    <rect x="250" y="225" width="28" height="18" rx="4" fill="#4A3C2A" transform="skewX(4)"/>
    <rect x="150" y="232" width="28" height="18" rx="4" fill="#4A3C2A" transform="skewX(4)"/>
    <rect x="65" y="235" width="28" height="18" rx="4" fill="#4A3C2A" transform="skewX(4)"/>
    <polygon points="290,60 60,40 60,110 290,130" fill="#A0896B"/>
  </svg>`;
}
