export const INDEX_HTML = `<!DOCTYPE html>
<html lang="en" class="dark">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover">
  <title>CalorieFlow · Health & Nutrition</title>
  
  <!-- PWA Meta -->
  <link rel="manifest" href="/manifest.json">
  <meta name="theme-color" content="#08090C">
  <meta name="mobile-web-app-capable" content="yes">
  <meta name="apple-mobile-web-app-capable" content="yes">
  <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">
  <meta name="apple-mobile-web-app-title" content="CalorieFlow">
  <link rel="apple-touch-icon" href="/icon-192.png">

  <!-- Fonts & Icons -->
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@300;400;500;600;700;800&family=JetBrains+Mono:wght@400;500;600;700&display=swap" rel="stylesheet">
  <script src="https://cdn.tailwindcss.com"></script>
  <script>
    tailwind.config = {
      darkMode: 'class',
      theme: {
        extend: {
          fontFamily: {
            sans: ['"Plus Jakarta Sans"', '-apple-system', 'BlinkMacSystemFont', 'system-ui', 'sans-serif'],
            mono: ['"JetBrains Mono"', 'ui-monospace', 'monospace'],
          },
          colors: {
            canvas: '#08090C',
            surface: {
              card: '#12141E',
              elevated: '#181B28',
              hover: '#1E2234',
            },
            flow: {
              cyan: '#38BDF8',
              emerald: '#34D399',
              amber: '#FBBF24',
              rose: '#FB7185',
              purple: '#A855F7',
            }
          }
        }
      }
    }
  </script>
  <style>
    :root {
      --bg-canvas: #08090C;
      --bg-card: rgba(18, 20, 30, 0.75);
      --bg-card-hover: rgba(26, 29, 44, 0.85);
      --bg-elevated: rgba(24, 27, 40, 0.65);
      --border-subtle: rgba(255, 255, 255, 0.08);
      --border-active: rgba(255, 255, 255, 0.18);
      --bevel-light: inset 0 1px 0 0 rgba(255, 255, 255, 0.08);
      --glow-cyan: 0 0 24px -4px rgba(56, 189, 248, 0.35);
      --glow-purple: 0 0 24px -4px rgba(168, 85, 247, 0.35);
      --glow-emerald: 0 0 24px -4px rgba(52, 211, 153, 0.35);
    }
    
    * {
      box-sizing: border-box;
      -webkit-font-smoothing: antialiased;
      -moz-osx-font-smoothing: grayscale;
    }
    
    body {
      background-color: var(--bg-canvas);
      color: #F8FAFC;
      font-family: 'Plus Jakarta Sans', system-ui, -apple-system, sans-serif;
      -webkit-tap-highlight-color: transparent;
      min-height: 100vh;
    }

    .tabular-num {
      font-variant-numeric: tabular-nums;
      font-feature-settings: "tnum" 1;
    }

    .glass-card {
      background: var(--bg-card);
      backdrop-filter: blur(20px);
      -webkit-backdrop-filter: blur(20px);
      border: 1px solid var(--border-subtle);
      box-shadow: var(--bevel-light), 0 12px 32px -4px rgba(0, 0, 0, 0.65);
      transition: border-color 0.2s ease, box-shadow 0.2s ease, transform 0.2s ease;
    }
    .glass-card:hover {
      border-color: var(--border-active);
    }

    .surface-card {
      background: var(--bg-card);
      backdrop-filter: blur(16px);
      -webkit-backdrop-filter: blur(16px);
      border: 1px solid var(--border-subtle);
      box-shadow: var(--bevel-light), 0 8px 24px -4px rgba(0, 0, 0, 0.5);
    }

    .surface-elevated {
      background: var(--bg-elevated);
      border: 1px solid var(--border-subtle);
    }

    .nav-pill {
      transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
    }
    .nav-pill.active {
      background: rgba(255, 255, 255, 0.12);
      color: #FFFFFF;
      box-shadow: 0 2px 10px rgba(0, 0, 0, 0.35), inset 0 1px 0 rgba(255, 255, 255, 0.15);
    }

    .btn-press {
      transition: transform 0.12s ease, opacity 0.12s ease;
    }
    .btn-press:active {
      transform: scale(0.96);
    }

    .scrollbar-none::-webkit-scrollbar { display: none; }
    .scrollbar-none { -ms-overflow-style: none; scrollbar-width: none; }

    @keyframes popIn {
      from { transform: scale(0.96) translateY(6px); opacity: 0; }
      to { transform: scale(1) translateY(0); opacity: 1; }
    }
    .animate-pop {
      animation: popIn 0.2s cubic-bezier(0.16, 1, 0.3, 1) forwards;
    }

    @keyframes laserScan {
      0% { top: 2%; opacity: 0.85; }
      50% { opacity: 1; filter: drop-shadow(0 0 12px #38BDF8); }
      100% { top: 96%; opacity: 0.85; }
    }
    .laser-line {
      position: absolute;
      left: 0; right: 0; height: 3px;
      background: linear-gradient(90deg, transparent, #38BDF8, #34D399, transparent);
      box-shadow: 0 0 20px #38BDF8, 0 0 35px #34D399;
      animation: laserScan 2.2s infinite ease-in-out;
    }

    /* Ambient background grid */
    .bg-grid-ambient {
      background-size: 32px 32px;
      background-image: 
        linear-gradient(to right, rgba(255, 255, 255, 0.02) 1px, transparent 1px),
        linear-gradient(to bottom, rgba(255, 255, 255, 0.02) 1px, transparent 1px);
    }

    /* Gauge ring glow */
    .glow-ring {
      filter: drop-shadow(0 0 10px rgba(56, 189, 248, 0.45));
    }
  </style>
</head>
<body class="selection:bg-flow-cyan/30 selection:text-white pb-24 md:pb-16 bg-grid-ambient">

  <!-- Ambient background glow top -->
  <div class="fixed inset-x-0 top-0 h-96 bg-[radial-gradient(ellipse_at_top,rgba(56,189,248,0.07),transparent_70%)] pointer-events-none z-0"></div>
  <div class="fixed top-1/4 -right-48 w-96 h-96 bg-[radial-gradient(circle,rgba(168,85,247,0.05),transparent_70%)] pointer-events-none z-0"></div>

  <!-- Toast Container -->
  <div id="toast-container" class="fixed bottom-20 md:bottom-6 right-4 sm:right-6 z-50 flex flex-col gap-2 pointer-events-none"></div>

  <!-- TOP APP BAR -->
  <header class="sticky top-0 z-40 border-b border-white/[0.07] bg-[#08090C]/85 backdrop-blur-xl">
    <div class="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-3">
      
      <!-- Brand & Live Sync Pill -->
      <div class="flex items-center gap-3">
        <div class="relative group cursor-pointer" onclick="location.reload()">
          <div class="w-9 h-9 rounded-xl bg-gradient-to-tr from-sky-500/25 via-emerald-500/20 to-purple-500/25 border border-white/15 flex items-center justify-center text-sky-400 shadow-inner group-hover:scale-105 transition">
            <svg class="w-4 h-4 fill-current" viewBox="0 0 24 24"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/></svg>
          </div>
          <div class="absolute -inset-1 rounded-xl bg-gradient-to-r from-sky-500 to-emerald-500 opacity-20 blur group-hover:opacity-40 transition"></div>
        </div>
        <div>
          <div class="flex items-center gap-2">
            <span class="text-base font-extrabold tracking-tight text-white flex items-center">
              Calorie<span class="text-transparent bg-clip-text bg-gradient-to-r from-sky-400 to-emerald-400">Flow</span>
            </span>
            <button id="btn-sync-pill" class="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-white/[0.04] border border-white/[0.08] hover:border-emerald-500/40 hover:bg-emerald-500/[0.06] transition btn-press" title="Sync live status with Hermes">
              <span class="relative flex h-2 w-2">
                <span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span class="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
              <span id="sync-pill-text" class="text-[10px] font-semibold text-slate-300">Hermes Live</span>
            </button>
          </div>
          <p class="text-[10px] text-slate-500 hidden sm:block tracking-wide">Intelligent Health & Nutrition Engine</p>
        </div>
      </div>

      <!-- Center Desktop Segmented Nav (Hidden on Mobile, shown md+) -->
      <nav class="hidden md:flex items-center p-1 bg-[#12141E] border border-white/[0.08] rounded-xl shadow-inner gap-1">
        <button id="tab-intake" class="tab-btn nav-pill active px-3.5 py-1.5 rounded-lg text-xs font-bold text-white flex items-center gap-1.5" data-tab="intake">
          <svg class="w-3.5 h-3.5 text-sky-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 3v18h18M7 16h4m4-4h4m-8-4h8"/></svg>
          <span>Intake</span>
        </button>
        <button id="tab-photo" class="tab-btn nav-pill px-3.5 py-1.5 rounded-lg text-xs font-semibold text-slate-400 hover:text-white flex items-center gap-1.5" data-tab="photo">
          <svg class="w-3.5 h-3.5 text-teal-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"/><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z"/></svg>
          <span>Photo AI</span>
        </button>
        <button id="tab-fasting" class="tab-btn nav-pill px-3.5 py-1.5 rounded-lg text-xs font-semibold text-slate-400 hover:text-white flex items-center gap-1.5" data-tab="fasting">
          <svg class="w-3.5 h-3.5 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
          <span>Fasting</span>
        </button>
        <button id="tab-weight" class="tab-btn nav-pill px-3.5 py-1.5 rounded-lg text-xs font-semibold text-slate-400 hover:text-white flex items-center gap-1.5" data-tab="weight">
          <svg class="w-3.5 h-3.5 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"/></svg>
          <span>Weight</span>
        </button>
      </nav>

      <!-- Right Actions: Date Navigator + Install + Settings -->
      <div class="flex items-center gap-2">
        
        <!-- PWA Install Button -->
        <button id="btn-pwa-install" class="hidden items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gradient-to-r from-sky-500/20 to-emerald-500/20 border border-sky-500/30 text-sky-300 hover:text-white text-xs font-bold shadow-sm transition btn-press">
          <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"/></svg>
          <span class="hidden sm:inline">Install</span>
        </button>

        <!-- Date Switcher -->
        <div id="date-switcher-wrap" class="flex items-center bg-[#12141E] border border-white/[0.08] rounded-xl p-0.5 shadow-inner">
          <button id="btn-prev-day" class="p-1.5 text-slate-400 hover:text-white hover:bg-white/[0.06] rounded-lg transition" title="Previous Day">
            <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M15 19l-7-7 7-7"/></svg>
          </button>
          <div class="relative px-2.5 py-1 flex items-center gap-1.5 cursor-pointer">
            <svg class="w-3 h-3 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/></svg>
            <span id="date-display-label" class="text-xs font-bold text-slate-200 select-none tabular-num">Today</span>
            <input type="date" id="date-input" class="absolute inset-0 opacity-0 cursor-pointer w-full">
          </div>
          <button id="btn-next-day" class="p-1.5 text-slate-400 hover:text-white hover:bg-white/[0.06] rounded-lg transition" title="Next Day">
            <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M9 5l7 7-7 7"/></svg>
          </button>
        </div>

        <!-- Settings Button -->
        <button id="btn-open-settings" class="p-2 text-slate-400 hover:text-white bg-[#12141E] border border-white/[0.08] rounded-xl transition hover:border-white/20 btn-press" title="Targets & Preferences">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"/><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/></svg>
        </button>
      </div>
    </div>
  </header>

  <!-- MOBILE BOTTOM NAVIGATION -->
  <nav class="md:hidden fixed bottom-0 inset-x-0 z-40 bg-[#08090C]/90 backdrop-blur-2xl border-t border-white/[0.08] px-3 py-2 flex items-center justify-around">
    <button class="mobile-tab-btn flex flex-col items-center gap-1 text-white active-tab flex-1 py-1" data-tab="intake">
      <svg class="w-4 h-4 text-sky-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 3v18h18M7 16h4m4-4h4m-8-4h8"/></svg>
      <span class="text-[10px] font-bold tracking-tight">Intake</span>
    </button>
    <button class="mobile-tab-btn flex flex-col items-center gap-1 text-slate-400 flex-1 py-1" data-tab="photo">
      <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"/><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z"/></svg>
      <span class="text-[10px] font-semibold tracking-tight">Photo AI</span>
    </button>
    <button class="mobile-tab-btn flex flex-col items-center gap-1 text-slate-400 flex-1 py-1" data-tab="fasting">
      <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
      <span class="text-[10px] font-semibold tracking-tight">Fasting</span>
    </button>
    <button class="mobile-tab-btn flex flex-col items-center gap-1 text-slate-400 flex-1 py-1" data-tab="weight">
      <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"/></svg>
      <span class="text-[10px] font-semibold tracking-tight">Weight</span>
    </button>
  </nav>

  <!-- MAIN APP CONTAINER -->
  <main class="max-w-6xl mx-auto px-4 sm:px-6 pt-5 pb-8 relative z-10">

    <!-- ======================================================== -->
    <!-- TAB 1: INTAKE & MACROS (2-Column Desktop Grid)          -->
    <!-- ======================================================== -->
    <div id="view-intake" class="space-y-6 lg:space-y-0 lg:grid lg:grid-cols-12 lg:gap-6 items-start">
      
      <!-- LEFT COLUMN: Energy Ring Hero + Macronutrients Split -->
      <div class="lg:col-span-5 space-y-6">

        <!-- 1. ENERGY BALANCE HERO CARD -->
        <section class="glass-card rounded-3xl p-6 relative overflow-hidden">
          <div class="absolute -top-12 -left-12 w-32 h-32 bg-sky-500/10 rounded-full blur-2xl pointer-events-none"></div>

          <!-- Header -->
          <div class="flex items-center justify-between mb-5 relative z-10">
            <div class="flex items-center gap-2">
              <span class="text-[11px] font-extrabold uppercase tracking-wider text-slate-400">Energy Balance</span>
              <span id="target-pill-display" class="px-2.5 py-0.5 rounded-full text-[11px] font-mono bg-white/[0.04] text-slate-300 border border-white/[0.07]">Target: 2,000 kcal</span>
            </div>
            <span id="budget-status-pill" class="text-xs font-bold text-emerald-400 flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20">
              <span class="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
              <span id="budget-status-text">On Track</span>
            </span>
          </div>

          <!-- Circular Radial Ring & Primary Metric -->
          <div class="flex flex-col sm:flex-row items-center justify-between gap-6 relative z-10">
            
            <!-- SVG Progress Ring Gauge -->
            <div class="relative w-44 h-44 flex-shrink-0 flex items-center justify-center">
              <svg class="w-44 h-44 -rotate-90 transform" viewBox="0 0 120 120">
                <defs>
                  <linearGradient id="ringGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stop-color="#38BDF8"/>
                    <stop offset="100%" stop-color="#34D399"/>
                  </linearGradient>
                  <linearGradient id="ringOverGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stop-color="#FB7185"/>
                    <stop offset="100%" stop-color="#F43F5E"/>
                  </linearGradient>
                </defs>
                <!-- Background Track -->
                <circle cx="60" cy="60" r="48" stroke="rgba(255,255,255,0.06)" stroke-width="11" fill="none"/>
                <!-- Glowing Progress Arc -->
                <circle id="calorie-gauge-circle" cx="60" cy="60" r="48" stroke="url(#ringGrad)" stroke-width="11" stroke-linecap="round" fill="none" stroke-dasharray="301.6" stroke-dashoffset="301.6" class="transition-all duration-700 ease-out glow-ring"/>
              </svg>
              
              <!-- Center Metric Display -->
              <div class="absolute inset-0 flex flex-col items-center justify-center text-center">
                <span id="hero-remaining-val" class="text-3xl font-black tracking-tight text-white tabular-num">--</span>
                <span id="hero-remaining-lbl" class="text-[10px] uppercase tracking-wider font-extrabold text-slate-400 mt-0.5">Remaining</span>
                <span id="hero-pct-val" class="text-[10px] font-mono text-sky-400 mt-1 px-2 py-0.5 rounded-full bg-sky-500/10">0% eaten</span>
              </div>
            </div>

            <!-- Metric Split Cards -->
            <div class="flex-1 w-full space-y-3">
              <div class="surface-elevated p-3.5 rounded-2xl flex items-center justify-between">
                <div class="flex items-center gap-2.5 min-w-0">
                  <div class="w-8 h-8 rounded-xl bg-sky-500/15 text-sky-400 flex items-center justify-center flex-shrink-0">
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"/></svg>
                  </div>
                  <div class="min-w-0">
                    <span class="text-[10px] font-bold text-slate-400 uppercase tracking-wide block">Consumed</span>
                    <span class="text-[11px] font-medium text-slate-400 truncate block">Today</span>
                  </div>
                </div>
                <div class="text-right flex-shrink-0 pl-2">
                  <span id="hero-eaten-val" class="text-lg font-black text-white tabular-num">0</span>
                  <span class="text-[10px] text-slate-400 font-mono block">kcal</span>
                </div>
              </div>

              <div class="surface-elevated p-3.5 rounded-2xl flex items-center justify-between">
                <div class="flex items-center gap-2.5 min-w-0">
                  <div class="w-8 h-8 rounded-xl bg-emerald-500/15 text-emerald-400 flex items-center justify-center flex-shrink-0">
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
                  </div>
                  <div class="min-w-0">
                    <span class="text-[10px] font-bold text-slate-400 uppercase tracking-wide block">Daily Budget</span>
                    <span class="text-[11px] font-medium text-slate-400 truncate block">Goal target</span>
                  </div>
                </div>
                <div class="text-right flex-shrink-0 pl-2">
                  <span id="hero-budget-val" class="text-lg font-black text-white tabular-num">2,000</span>
                  <span class="text-[10px] text-slate-400 font-mono block">kcal</span>
                </div>
              </div>

              <!-- Over Budget Banner (Hidden by default) -->
              <div id="hero-over-badge" class="hidden surface-elevated border-rose-500/30 p-2.5 rounded-xl text-center text-xs font-bold text-rose-400 bg-rose-500/10">
                Budget exceeded for today
              </div>

              <!-- Horizontal Progress Bar -->
              <div class="w-full h-2 rounded-full bg-white/[0.06] overflow-hidden mt-1 p-0.5">
                <div id="hero-progress-bar" class="h-full bg-gradient-to-r from-sky-400 via-teal-400 to-emerald-400 rounded-full transition-all duration-500" style="width: 0%"></div>
              </div>
            </div>

          </div>
        </section>

        <!-- 2. MACRONUTRIENTS SPLIT CARD -->
        <section class="glass-card rounded-3xl p-6 relative overflow-hidden">
          <div class="flex items-center justify-between mb-4">
            <div class="flex items-center gap-2">
              <span class="text-[11px] font-extrabold uppercase tracking-wider text-slate-400">Macronutrients Split</span>
            </div>
            <span id="macro-pct-ratio" class="text-[11px] font-mono text-slate-300 px-2.5 py-0.5 rounded-full bg-white/[0.04] border border-white/[0.06]">P: 0% • C: 0% • F: 0%</span>
          </div>

          <div class="space-y-4">
            
            <!-- Protein Metric Bar -->
            <div class="surface-elevated p-3.5 rounded-2xl hover:border-sky-500/30 transition">
              <div class="flex justify-between items-center mb-2">
                <div class="flex items-center gap-2">
                  <span class="w-2.5 h-2.5 rounded-full bg-sky-400 shadow-sm shadow-sky-400"></span>
                  <span class="text-xs font-bold text-white tracking-wide">Protein</span>
                </div>
                <div class="flex items-center gap-2">
                  <span class="tabular-num text-xs font-bold text-white"><span id="macro-p-consumed">0</span> / <span id="macro-p-target">140</span>g</span>
                  <span id="macro-p-pct" class="text-[10px] font-mono font-bold text-sky-400 px-1.5 py-0.5 rounded bg-sky-500/10">0%</span>
                </div>
              </div>
              <div class="w-full h-2 rounded-full bg-white/[0.07] overflow-hidden">
                <div id="macro-p-bar" class="h-full bg-gradient-to-r from-sky-500 to-sky-400 rounded-full transition-all duration-500" style="width: 0%"></div>
              </div>
              <div class="flex justify-between text-[11px] text-slate-400 mt-1.5">
                <span id="macro-p-left" class="font-medium">140g left</span>
                <span class="text-[10px] text-slate-500 font-mono">4 kcal/g</span>
              </div>
            </div>

            <!-- Carbs Metric Bar -->
            <div class="surface-elevated p-3.5 rounded-2xl hover:border-amber-500/30 transition">
              <div class="flex justify-between items-center mb-2">
                <div class="flex items-center gap-2">
                  <span class="w-2.5 h-2.5 rounded-full bg-amber-400 shadow-sm shadow-amber-400"></span>
                  <span class="text-xs font-bold text-white tracking-wide">Carbohydrates</span>
                </div>
                <div class="flex items-center gap-2">
                  <span class="tabular-num text-xs font-bold text-white"><span id="macro-c-consumed">0</span> / <span id="macro-c-target">200</span>g</span>
                  <span id="macro-c-pct" class="text-[10px] font-mono font-bold text-amber-400 px-1.5 py-0.5 rounded bg-amber-500/10">0%</span>
                </div>
              </div>
              <div class="w-full h-2 rounded-full bg-white/[0.07] overflow-hidden">
                <div id="macro-c-bar" class="h-full bg-gradient-to-r from-amber-500 to-amber-400 rounded-full transition-all duration-500" style="width: 0%"></div>
              </div>
              <div class="flex justify-between text-[11px] text-slate-400 mt-1.5">
                <span id="macro-c-left" class="font-medium">200g left</span>
                <span class="text-[10px] text-slate-500 font-mono">4 kcal/g</span>
              </div>
            </div>

            <!-- Fat Metric Bar -->
            <div class="surface-elevated p-3.5 rounded-2xl hover:border-rose-500/30 transition">
              <div class="flex justify-between items-center mb-2">
                <div class="flex items-center gap-2">
                  <span class="w-2.5 h-2.5 rounded-full bg-rose-400 shadow-sm shadow-rose-400"></span>
                  <span class="text-xs font-bold text-white tracking-wide">Fats</span>
                </div>
                <div class="flex items-center gap-2">
                  <span class="tabular-num text-xs font-bold text-white"><span id="macro-f-consumed">0</span> / <span id="macro-f-target">65</span>g</span>
                  <span id="macro-f-pct" class="text-[10px] font-mono font-bold text-rose-400 px-1.5 py-0.5 rounded bg-rose-500/10">0%</span>
                </div>
              </div>
              <div class="w-full h-2 rounded-full bg-white/[0.07] overflow-hidden">
                <div id="macro-f-bar" class="h-full bg-gradient-to-r from-rose-500 to-rose-400 rounded-full transition-all duration-500" style="width: 0%"></div>
              </div>
              <div class="flex justify-between text-[11px] text-slate-400 mt-1.5">
                <span id="macro-f-left" class="font-medium">65g left</span>
                <span class="text-[10px] text-slate-500 font-mono">9 kcal/g</span>
              </div>
            </div>

          </div>
        </section>

      </div>

      <!-- RIGHT COLUMN: One-Tap Staples & Today's Meals Timeline -->
      <div class="lg:col-span-7 space-y-6">

        <!-- 3. ONE-TAP STAPLES & PRESETS CAROUSEL -->
        <section class="glass-card rounded-3xl p-6">
          <div class="flex items-center justify-between mb-3.5">
            <div class="flex items-center gap-2">
              <span class="text-[11px] font-extrabold uppercase tracking-wider text-slate-400">One-Tap Staples & Presets</span>
              <span class="text-[10px] text-slate-500 hidden sm:inline">• Tap to log instantly</span>
            </div>
            <button id="btn-open-preset-modal" class="text-xs text-sky-400 hover:text-sky-300 font-bold flex items-center gap-1 transition px-2.5 py-1 rounded-lg bg-sky-500/10 border border-sky-500/20 btn-press">
              <span>+ New Preset</span>
            </button>
          </div>
          <div id="presets-carousel" class="flex gap-3 overflow-x-auto pb-1 scrollbar-none">
            <!-- Populated dynamically via JS -->
          </div>
        </section>

        <!-- 4. TODAY'S MEALS TIMELINE -->
        <section class="glass-card rounded-3xl p-6 space-y-4">
          <div class="flex items-center justify-between">
            <div class="flex items-center gap-2">
              <span class="text-[11px] font-extrabold uppercase tracking-wider text-slate-400">Today's Meals Timeline</span>
              <span id="meal-count-pill" class="px-2 py-0.5 rounded-full text-xs font-mono font-bold bg-white/[0.06] text-white">0</span>
            </div>
            <button id="btn-open-meal-modal" class="px-4 py-2 rounded-xl bg-gradient-to-r from-rose-500 to-rose-600 hover:from-rose-600 hover:to-rose-700 text-white text-xs font-bold shadow-lg shadow-rose-500/25 active:scale-95 transition flex items-center gap-1.5 btn-press">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M12 4v16m8-8H4"/></svg>
              <span>Log Meal</span>
            </button>
          </div>
          
          <div id="meals-list" class="space-y-2.5">
            <!-- Populated dynamically via JS -->
          </div>
        </section>

      </div>

    </div>

    <!-- ======================================================== -->
    <!-- TAB 2: PHOTO TO MACROS AI SCANNER                       -->
    <!-- ======================================================== -->
    <div id="view-photo" class="hidden max-w-2xl mx-auto space-y-6">
      
      <section class="glass-card rounded-3xl p-6 sm:p-8 relative overflow-hidden">
        <div class="flex items-center justify-between mb-2">
          <div class="flex items-center gap-2.5">
            <div class="w-8 h-8 rounded-xl bg-sky-500/20 border border-sky-500/30 flex items-center justify-center text-sky-400">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"/><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z"/></svg>
            </div>
            <h2 class="text-base font-extrabold text-white">Visual Food AI Scanner</h2>
          </div>
          <span class="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-sky-500/10 text-sky-400 border border-sky-500/20">Llama 3.2 Vision</span>
        </div>
        <p class="text-xs text-slate-400 mb-5">Snap a meal photo or upload from library. Computer vision extracts ingredients, portion weights, calories, and macros in real-time.</p>

        <!-- Dropzone / Viewfinder HUD Area -->
        <div id="photo-dropzone" class="border-2 border-dashed border-white/15 hover:border-sky-500/50 rounded-3xl p-8 text-center cursor-pointer transition bg-white/[0.02] hover:bg-white/[0.04] relative overflow-hidden group">
          <input type="file" id="photo-file-input" accept="image/*" capture="environment" class="hidden">
          
          <div id="photo-empty-state" class="space-y-4">
            <div class="relative w-16 h-16 mx-auto">
              <div class="w-16 h-16 rounded-2xl bg-gradient-to-tr from-sky-500/20 to-emerald-500/20 border border-white/10 flex items-center justify-center text-sky-400 group-hover:scale-105 transition shadow-inner">
                <svg class="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"/><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z"/></svg>
              </div>
              <div class="absolute -top-1 -left-1 w-3 h-3 border-t-2 border-l-2 border-sky-400"></div>
              <div class="absolute -top-1 -right-1 w-3 h-3 border-t-2 border-r-2 border-sky-400"></div>
              <div class="absolute -bottom-1 -left-1 w-3 h-3 border-b-2 border-l-2 border-sky-400"></div>
              <div class="absolute -bottom-1 -right-1 w-3 h-3 border-b-2 border-r-2 border-sky-400"></div>
            </div>
            <div>
              <p class="text-sm font-bold text-white">Capture or Upload Meal Photo</p>
              <p class="text-xs text-slate-400 mt-1">Tap to browse camera roll, or drag & drop image here</p>
            </div>
            <button type="button" class="px-5 py-2.5 rounded-xl bg-white/[0.08] hover:bg-white/[0.12] border border-white/10 text-xs font-bold text-white transition pointer-events-none shadow-sm">
              Select Photo
            </button>
          </div>

          <!-- Preview & Futuristic Scanning Laser -->
          <div id="photo-preview-state" class="hidden relative max-w-md mx-auto rounded-2xl overflow-hidden shadow-2xl border border-white/15">
            <img id="photo-preview-img" src="" alt="Food Preview" class="w-full max-h-72 object-cover rounded-2xl">
            <div id="photo-laser" class="laser-line hidden"></div>
            <div id="photo-analyzing-overlay" class="hidden absolute inset-0 bg-black/65 backdrop-blur-sm flex flex-col items-center justify-center gap-3">
              <div class="w-10 h-10 rounded-full border-3 border-sky-400 border-t-transparent animate-spin"></div>
              <span class="text-xs font-bold text-sky-300 tracking-wide">Analyzing nutrition with AI Vision...</span>
            </div>
          </div>
        </div>

        <!-- Optional Context Hint -->
        <div class="mt-4 flex gap-2">
          <input type="text" id="photo-hint-input" placeholder="Optional notes (e.g. 200g grilled salmon with quinoa & avocado)" class="flex-1 px-4 py-2.5 text-xs rounded-xl surface-elevated text-white placeholder-slate-500 focus:outline-none focus:border-sky-500/60">
          <button id="btn-reanalyze-photo" class="px-4 py-2.5 rounded-xl bg-white/[0.08] hover:bg-white/[0.12] border border-white/10 text-xs font-bold text-slate-200 transition btn-press">
            Scan
          </button>
        </div>
      </section>

      <!-- AI Analysis Result Card -->
      <section id="photo-result-card" class="hidden glass-card rounded-3xl p-6 sm:p-8 space-y-5 animate-pop">
        <div class="flex items-center justify-between border-b border-white/[0.08] pb-4">
          <div class="flex-1">
            <div class="flex items-center gap-1.5 text-emerald-400 text-xs font-bold uppercase tracking-wider">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/></svg>
              <span>AI Detection Complete</span>
            </div>
            <input type="text" id="detected-food-name" class="text-lg font-black text-white bg-transparent border-b border-transparent focus:border-sky-400 focus:outline-none w-full mt-1">
          </div>
          <div class="text-right pl-4">
            <span id="detected-calories" class="text-2xl font-black text-rose-400 tabular-num">0</span>
            <span class="text-xs text-slate-400 font-mono block">kcal</span>
          </div>
        </div>

        <!-- Macro Breakdown Badges -->
        <div class="grid grid-cols-3 gap-3">
          <div class="surface-elevated p-3 rounded-2xl text-center border-t-2 border-sky-400">
            <span class="text-[10px] font-bold text-sky-400 uppercase tracking-wide">Protein</span>
            <div class="flex items-center justify-center gap-0.5 mt-1">
              <input type="number" id="detected-protein" step="0.1" class="w-14 text-center text-base font-extrabold text-white bg-transparent focus:outline-none">
              <span class="text-xs text-slate-400">g</span>
            </div>
          </div>
          <div class="surface-elevated p-3 rounded-2xl text-center border-t-2 border-amber-400">
            <span class="text-[10px] font-bold text-amber-400 uppercase tracking-wide">Carbs</span>
            <div class="flex items-center justify-center gap-0.5 mt-1">
              <input type="number" id="detected-carbs" step="0.1" class="w-14 text-center text-base font-extrabold text-white bg-transparent focus:outline-none">
              <span class="text-xs text-slate-400">g</span>
            </div>
          </div>
          <div class="surface-elevated p-3 rounded-2xl text-center border-t-2 border-rose-400">
            <span class="text-[10px] font-bold text-rose-400 uppercase tracking-wide">Fat</span>
            <div class="flex items-center justify-center gap-0.5 mt-1">
              <input type="number" id="detected-fat" step="0.1" class="w-14 text-center text-base font-extrabold text-white bg-transparent focus:outline-none">
              <span class="text-xs text-slate-400">g</span>
            </div>
          </div>
        </div>

        <!-- Portion & Category Controls -->
        <div class="grid grid-cols-3 gap-3">
          <div>
            <label class="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Portion Amount</label>
            <input type="number" id="detected-amount" step="0.1" class="w-full mt-1 px-3 py-2 text-xs rounded-xl surface-elevated text-white focus:outline-none">
          </div>
          <div>
            <label class="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Unit</label>
            <input type="text" id="detected-unit" class="w-full mt-1 px-3 py-2 text-xs rounded-xl surface-elevated text-white focus:outline-none">
          </div>
          <div>
            <label class="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Meal Type</label>
            <select id="detected-meal-type" class="w-full mt-1 px-3 py-2 text-xs rounded-xl surface-elevated text-white focus:outline-none">
              <option value="lunch">Lunch</option>
              <option value="breakfast">Breakfast</option>
              <option value="dinner">Dinner</option>
              <option value="snack">Snack</option>
            </select>
          </div>
        </div>

        <div>
          <label class="text-[10px] font-bold text-slate-400 uppercase tracking-wide">AI Nutrition Insights</label>
          <textarea id="detected-notes" rows="2" class="w-full mt-1 px-3.5 py-2 text-xs rounded-xl surface-elevated text-slate-300 focus:outline-none"></textarea>
        </div>

        <!-- Save Actions -->
        <div class="flex gap-3 pt-2">
          <button id="btn-log-detected-meal" class="flex-1 py-3 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white text-xs font-bold shadow-lg shadow-emerald-500/25 active:scale-95 transition flex items-center justify-center gap-2 btn-press">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M5 13l4 4L19 7"/></svg>
            <span>Log to Today's Meals</span>
          </button>
          <button id="btn-save-detected-preset" class="px-5 py-3 rounded-2xl bg-white/[0.08] hover:bg-white/[0.12] border border-white/10 text-xs font-bold text-white transition btn-press">
            Save as Preset
          </button>
        </div>
      </section>
    </div>

    <!-- ======================================================== -->
    <!-- TAB 3: INTERMITTENT FASTING WINDOW                      -->
    <!-- ======================================================== -->
    <div id="view-fasting" class="hidden max-w-3xl mx-auto space-y-6">
      
      <!-- Fasting Hero Ring & Timer -->
      <section class="glass-card rounded-3xl p-6 sm:p-8 text-center relative overflow-hidden">
        
        <!-- Status Pill -->
        <div class="flex items-center justify-between mb-4">
          <span class="text-[11px] font-extrabold uppercase tracking-wider text-slate-400">Intermittent Fasting</span>
          <span id="fasting-state-badge" class="px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-purple-500/15 text-purple-300 border border-purple-500/30 flex items-center gap-1.5">
            <span class="w-2 h-2 rounded-full bg-purple-400 animate-pulse"></span>
            <span id="fasting-state-text">Fasting Active</span>
          </span>
        </div>

        <!-- Radial Fasting Timer -->
        <div class="relative w-52 h-52 mx-auto my-3 flex items-center justify-center">
          <svg class="w-52 h-52 -rotate-90 transform" viewBox="0 0 120 120">
            <circle cx="60" cy="60" r="50" stroke="rgba(255,255,255,0.06)" stroke-width="8" fill="none"/>
            <circle id="fasting-gauge-circle" cx="60" cy="60" r="50" stroke="#A855F7" stroke-width="8" stroke-linecap="round" fill="none" stroke-dasharray="314.15" stroke-dashoffset="314.15" class="transition-all duration-700 ease-out" style="filter: drop-shadow(0 0 8px rgba(168, 85, 247, 0.45));"/>
          </svg>
          <div class="absolute inset-0 flex flex-col items-center justify-center">
            <span id="fasting-timer-countdown" class="text-3xl font-black font-mono tracking-tight text-white tabular-num">00:00:00</span>
            <span id="fasting-timer-sublabel" class="text-[10px] uppercase font-extrabold text-slate-400 mt-1">Elapsed Duration</span>
          </div>
        </div>

        <!-- Target & Time Details -->
        <div class="grid grid-cols-2 gap-3 mt-4 pt-4 border-t border-white/[0.08] text-left">
          <div class="surface-elevated p-3.5 rounded-2xl">
            <span class="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Target Goal</span>
            <p id="fasting-target-display" class="text-sm font-extrabold text-white mt-0.5">16 Hours (16:8)</p>
          </div>
          <div class="surface-elevated p-3.5 rounded-2xl">
            <span class="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Remaining Until Goal</span>
            <p id="fasting-remaining-display" class="text-sm font-extrabold text-purple-300 mt-0.5">--</p>
          </div>
        </div>

        <!-- Fasting Controls -->
        <div class="flex gap-3 mt-5">
          <button id="btn-toggle-fast" class="flex-1 py-3 rounded-2xl bg-gradient-to-r from-purple-500 to-indigo-600 hover:from-purple-600 hover:to-indigo-700 text-white text-xs font-bold shadow-lg shadow-purple-500/25 active:scale-95 transition btn-press">
            Start Fast
          </button>
          <button id="btn-edit-fast-time" class="px-5 py-3 rounded-2xl bg-white/[0.08] hover:bg-white/[0.12] border border-white/10 text-xs font-bold text-slate-200 transition btn-press">
            Adjust Start
          </button>
        </div>
      </section>

      <!-- Protocol Preset Selector -->
      <section class="glass-card rounded-3xl p-6 space-y-3">
        <span class="text-[11px] font-extrabold uppercase tracking-wider text-slate-400">Fasting Protocols</span>
        <div class="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
          <button class="fasting-preset-btn py-3 px-2 rounded-2xl surface-elevated text-center hover:border-purple-500/40 transition active:scale-95 btn-press" data-hours="14" data-type="14:10">
            <span class="block text-sm font-extrabold text-white">14:10</span>
            <span class="block text-[10px] text-slate-400 mt-0.5">Gentle</span>
          </button>
          <button class="fasting-preset-btn py-3 px-2 rounded-2xl surface-elevated border-purple-500/50 bg-purple-500/10 text-center hover:border-purple-500/40 transition active:scale-95 btn-press" data-hours="16" data-type="16:8">
            <span class="block text-sm font-extrabold text-white">16:8</span>
            <span class="block text-[10px] text-purple-300 mt-0.5">Classic</span>
          </button>
          <button class="fasting-preset-btn py-3 px-2 rounded-2xl surface-elevated text-center hover:border-purple-500/40 transition active:scale-95 btn-press" data-hours="18" data-type="18:6">
            <span class="block text-sm font-extrabold text-white">18:6</span>
            <span class="block text-[10px] text-slate-400 mt-0.5">Focused</span>
          </button>
          <button class="fasting-preset-btn py-3 px-2 rounded-2xl surface-elevated text-center hover:border-purple-500/40 transition active:scale-95 btn-press" data-hours="20" data-type="20:4">
            <span class="block text-sm font-extrabold text-white">20:4</span>
            <span class="block text-[10px] text-slate-400 mt-0.5">Warrior</span>
          </button>
        </div>
      </section>

      <!-- Metabolic Milestones -->
      <section class="glass-card rounded-3xl p-6 space-y-3">
        <span class="text-[11px] font-extrabold uppercase tracking-wider text-slate-400">Metabolic Milestones</span>
        <div class="space-y-2.5 text-xs">
          <div id="milestone-1" class="surface-elevated p-3.5 rounded-2xl flex items-center justify-between border-l-4 border-sky-400">
            <div>
              <span class="font-bold text-white">0–12 Hours: Blood Sugar Stabilization</span>
              <p class="text-[11px] text-slate-400 mt-0.5">Insulin falls, glycogen depletes, liver energy reset</p>
            </div>
            <span class="text-sky-400 font-mono text-[10px] font-bold px-2 py-0.5 rounded bg-sky-500/10">Glycogen</span>
          </div>
          <div id="milestone-2" class="surface-elevated p-3.5 rounded-2xl flex items-center justify-between border-l-4 border-amber-400">
            <div>
              <span class="font-bold text-white">12–16 Hours: Fat Burning & Ketosis</span>
              <p class="text-[11px] text-slate-400 mt-0.5">Lipolysis accelerates, burning stored adipose tissue</p>
            </div>
            <span class="text-amber-400 font-mono text-[10px] font-bold px-2 py-0.5 rounded bg-amber-500/10">Fat Burn</span>
          </div>
          <div id="milestone-3" class="surface-elevated p-3.5 rounded-2xl flex items-center justify-between border-l-4 border-purple-400">
            <div>
              <span class="font-bold text-white">16–18 Hours: Cellular Autophagy</span>
              <p class="text-[11px] text-slate-400 mt-0.5">Cells recycle damaged organelles and proteins</p>
            </div>
            <span class="text-purple-400 font-mono text-[10px] font-bold px-2 py-0.5 rounded bg-purple-500/10">Autophagy</span>
          </div>
          <div id="milestone-4" class="surface-elevated p-3.5 rounded-2xl flex items-center justify-between border-l-4 border-rose-400">
            <div>
              <span class="font-bold text-white">18+ Hours: Deep Ketosis & HGH</span>
              <p class="text-[11px] text-slate-400 mt-0.5">Elevated growth hormone, profound cellular renewal</p>
            </div>
            <span class="text-rose-400 font-mono text-[10px] font-bold px-2 py-0.5 rounded bg-rose-500/10">Deep Ketosis</span>
          </div>
        </div>
      </section>
    </div>

    <!-- ======================================================== -->
    <!-- TAB 4: WEIGHT PROGRESSION                               -->
    <!-- ======================================================== -->
    <div id="view-weight" class="hidden max-w-4xl mx-auto space-y-6">
      
      <!-- Key Weight Stats Card -->
      <section class="glass-card rounded-3xl p-6 sm:p-8">
        <div class="flex items-center justify-between mb-5">
          <div class="flex items-center gap-2">
            <span class="text-[11px] font-extrabold uppercase tracking-wider text-slate-400">Body Weight Tracker</span>
          </div>
          <button id="btn-open-weight-modal" class="px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 text-white text-xs font-bold shadow-lg shadow-emerald-500/25 active:scale-95 transition flex items-center gap-1.5 btn-press">
            <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M12 4v16m8-8H4"/></svg>
            <span>Log Weight</span>
          </button>
        </div>

        <div class="grid grid-cols-3 gap-3 text-center">
          <div class="surface-elevated p-4 rounded-2xl">
            <span class="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Current</span>
            <div class="mt-1">
              <span id="weight-stat-latest" class="text-xl sm:text-2xl font-black text-white tabular-num">--</span>
              <span class="text-xs text-slate-400 font-mono">kg</span>
            </div>
          </div>
          <div class="surface-elevated p-4 rounded-2xl">
            <span class="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Net Change</span>
            <div class="mt-1">
              <span id="weight-stat-change" class="text-xl sm:text-2xl font-black text-emerald-400 tabular-num">0.0</span>
              <span class="text-xs text-slate-400 font-mono">kg</span>
            </div>
          </div>
          <div class="surface-elevated p-4 rounded-2xl">
            <span class="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Goal Target</span>
            <div class="mt-1">
              <span id="weight-stat-target" class="text-xl sm:text-2xl font-black text-sky-400 tabular-num">--</span>
              <span class="text-xs text-slate-400 font-mono">kg</span>
            </div>
          </div>
        </div>
      </section>

      <!-- Interactive SVG Weight Curve Chart -->
      <section class="glass-card rounded-3xl p-6 sm:p-8 space-y-4">
        <div class="flex items-center justify-between">
          <span class="text-[11px] font-extrabold uppercase tracking-wider text-slate-400">Progression Curve Trend</span>
          <span id="weight-trend-label" class="text-xs font-bold text-slate-400 px-2.5 py-0.5 rounded-full bg-white/[0.04]">30-Day Trend</span>
        </div>

        <div class="relative w-full h-56 surface-elevated rounded-2xl p-4 flex flex-col justify-between overflow-hidden">
          <svg id="weight-chart-svg" class="w-full h-full overflow-visible" viewBox="0 0 400 150" preserveAspectRatio="none">
            <!-- Dynamic SVG elements rendered via JS -->
          </svg>
        </div>
      </section>

      <!-- Weight Logs History -->
      <section class="glass-card rounded-3xl p-6 sm:p-8 space-y-4">
        <span class="text-[11px] font-extrabold uppercase tracking-wider text-slate-400">Weigh-In History Log</span>
        <div id="weight-history-list" class="space-y-2.5">
          <!-- Populated dynamically via JS -->
        </div>
      </section>
    </div>

  </main>

  <!-- ======================================================== -->
  <!-- MODALS                                                   -->
  <!-- ======================================================== -->

  <!-- Add / Edit Meal Modal -->
  <div id="meal-modal" class="fixed inset-0 z-50 bg-black/75 backdrop-blur-md hidden flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-labelledby="meal-modal-title">
    <div class="glass-card rounded-3xl w-full max-w-md p-6 space-y-5 animate-pop">
      <div class="flex items-center justify-between border-b border-white/[0.08] pb-3">
        <h3 id="meal-modal-title" class="text-base font-extrabold text-white">Log Meal</h3>
        <button id="btn-close-meal-modal" class="text-slate-400 hover:text-white text-xl font-bold w-8 h-8 rounded-lg flex items-center justify-center hover:bg-white/[0.08]">×</button>
      </div>
      <form id="form-meal" class="space-y-3.5">
        <input type="hidden" id="meal-edit-id">
        <div>
          <label class="text-[11px] font-bold text-slate-300 uppercase tracking-wide">Food Name</label>
          <input type="text" id="meal-food-name" required placeholder="e.g. Scrambled Eggs with Sourdough" class="w-full mt-1 px-3.5 py-2.5 text-xs rounded-xl surface-elevated text-white focus:outline-none focus:border-rose-500">
        </div>
        <div class="grid grid-cols-3 gap-2.5">
          <div>
            <label class="text-[11px] font-bold text-slate-300 uppercase tracking-wide">Amount</label>
            <input type="number" id="meal-amount" step="0.1" value="1" required class="w-full mt-1 px-3 py-2 text-xs rounded-xl surface-elevated text-white focus:outline-none">
          </div>
          <div>
            <label class="text-[11px] font-bold text-slate-300 uppercase tracking-wide">Unit</label>
            <input type="text" id="meal-unit" value="serving" required class="w-full mt-1 px-3 py-2 text-xs rounded-xl surface-elevated text-white focus:outline-none">
          </div>
          <div>
            <label class="text-[11px] font-bold text-slate-300 uppercase tracking-wide">Meal Type</label>
            <select id="meal-type" class="w-full mt-1 px-2.5 py-2 text-xs rounded-xl surface-elevated text-white focus:outline-none">
              <option value="breakfast">Breakfast</option>
              <option value="lunch">Lunch</option>
              <option value="dinner">Dinner</option>
              <option value="snack">Snack</option>
            </select>
          </div>
        </div>
        <div>
          <label class="text-[11px] font-bold text-slate-300 uppercase tracking-wide">Calories (kcal)</label>
          <input type="number" id="meal-calories" required placeholder="e.g. 420" class="w-full mt-1 px-3.5 py-2 text-xs rounded-xl surface-elevated text-white focus:outline-none font-bold">
        </div>
        <div class="grid grid-cols-3 gap-2.5">
          <div>
            <label class="text-[11px] font-bold text-sky-400 uppercase tracking-wide">Protein (g)</label>
            <input type="number" id="meal-protein" step="0.1" placeholder="0" class="w-full mt-1 px-3 py-2 text-xs rounded-xl surface-elevated text-white focus:outline-none">
          </div>
          <div>
            <label class="text-[11px] font-bold text-amber-400 uppercase tracking-wide">Carbs (g)</label>
            <input type="number" id="meal-carbs" step="0.1" placeholder="0" class="w-full mt-1 px-3 py-2 text-xs rounded-xl surface-elevated text-white focus:outline-none">
          </div>
          <div>
            <label class="text-[11px] font-bold text-rose-400 uppercase tracking-wide">Fat (g)</label>
            <input type="number" id="meal-fat" step="0.1" placeholder="0" class="w-full mt-1 px-3 py-2 text-xs rounded-xl surface-elevated text-white focus:outline-none">
          </div>
        </div>
        <div>
          <label class="text-[11px] font-bold text-slate-300 uppercase tracking-wide">Notes / Ingredients</label>
          <input type="text" id="meal-notes" placeholder="Optional notes" class="w-full mt-1 px-3.5 py-2 text-xs rounded-xl surface-elevated text-white focus:outline-none">
        </div>
        <div class="flex gap-2.5 pt-2">
          <button type="submit" class="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-rose-500 to-rose-600 hover:from-rose-600 hover:to-rose-700 text-white text-xs font-bold transition shadow-md shadow-rose-500/20 btn-press">Save Meal</button>
          <button type="button" id="btn-cancel-meal-modal" class="px-4 py-2.5 rounded-xl bg-white/[0.08] hover:bg-white/[0.12] text-xs font-semibold text-slate-300 btn-press">Cancel</button>
        </div>
      </form>
    </div>
  </div>

  <!-- Create New Preset Modal -->
  <div id="preset-modal" class="fixed inset-0 z-50 bg-black/75 backdrop-blur-md hidden flex items-center justify-center p-4" role="dialog" aria-modal="true">
    <div class="glass-card rounded-3xl w-full max-w-md p-6 space-y-5 animate-pop">
      <div class="flex items-center justify-between border-b border-white/[0.08] pb-3">
        <h3 class="text-base font-extrabold text-white">Create Quick Preset</h3>
        <button id="btn-close-preset-modal" class="text-slate-400 hover:text-white text-xl font-bold w-8 h-8 rounded-lg flex items-center justify-center hover:bg-white/[0.08]">×</button>
      </div>
      <form id="form-preset" class="space-y-3.5">
        <div>
          <label class="text-[11px] font-bold text-slate-300 uppercase tracking-wide">Preset Nickname</label>
          <input type="text" id="preset-name" required placeholder="e.g. Morning Protein Shake" class="w-full mt-1 px-3.5 py-2.5 text-xs rounded-xl surface-elevated text-white focus:outline-none focus:border-sky-500">
        </div>
        <div>
          <label class="text-[11px] font-bold text-slate-300 uppercase tracking-wide">Food Name</label>
          <input type="text" id="preset-food-name" required placeholder="e.g. Whey Protein with Almond Milk" class="w-full mt-1 px-3.5 py-2 text-xs rounded-xl surface-elevated text-white focus:outline-none">
        </div>
        <div class="grid grid-cols-3 gap-2.5">
          <div>
            <label class="text-[11px] font-bold text-slate-300 uppercase tracking-wide">Amount</label>
            <input type="number" id="preset-amount" step="0.1" value="1" required class="w-full mt-1 px-3 py-2 text-xs rounded-xl surface-elevated text-white focus:outline-none">
          </div>
          <div>
            <label class="text-[11px] font-bold text-slate-300 uppercase tracking-wide">Unit</label>
            <input type="text" id="preset-unit" value="serving" required class="w-full mt-1 px-3 py-2 text-xs rounded-xl surface-elevated text-white focus:outline-none">
          </div>
          <div>
            <label class="text-[11px] font-bold text-slate-300 uppercase tracking-wide">Category</label>
            <select id="preset-type" class="w-full mt-1 px-2.5 py-2 text-xs rounded-xl surface-elevated text-white focus:outline-none">
              <option value="snack">Snack</option>
              <option value="breakfast">Breakfast</option>
              <option value="lunch">Lunch</option>
              <option value="dinner">Dinner</option>
            </select>
          </div>
        </div>
        <div>
          <label class="text-[11px] font-bold text-slate-300 uppercase tracking-wide">Calories (kcal)</label>
          <input type="number" id="preset-calories" required placeholder="e.g. 240" class="w-full mt-1 px-3.5 py-2 text-xs rounded-xl surface-elevated text-white focus:outline-none font-bold">
        </div>
        <div class="grid grid-cols-3 gap-2.5">
          <div>
            <label class="text-[11px] font-bold text-sky-400 uppercase tracking-wide">Protein (g)</label>
            <input type="number" id="preset-protein" step="0.1" placeholder="30" class="w-full mt-1 px-3 py-2 text-xs rounded-xl surface-elevated text-white focus:outline-none">
          </div>
          <div>
            <label class="text-[11px] font-bold text-amber-400 uppercase tracking-wide">Carbs (g)</label>
            <input type="number" id="preset-carbs" step="0.1" placeholder="8" class="w-full mt-1 px-3 py-2 text-xs rounded-xl surface-elevated text-white focus:outline-none">
          </div>
          <div>
            <label class="text-[11px] font-bold text-rose-400 uppercase tracking-wide">Fat (g)</label>
            <input type="number" id="preset-fat" step="0.1" placeholder="3" class="w-full mt-1 px-3 py-2 text-xs rounded-xl surface-elevated text-white focus:outline-none">
          </div>
        </div>
        <div class="flex gap-2.5 pt-2">
          <button type="submit" class="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-sky-500 to-sky-600 hover:from-sky-600 hover:to-sky-700 text-white text-xs font-bold transition shadow-md shadow-sky-500/20 btn-press">Save Preset</button>
          <button type="button" id="btn-cancel-preset-modal" class="px-4 py-2.5 rounded-xl bg-white/[0.08] hover:bg-white/[0.12] text-xs font-semibold text-slate-300 btn-press">Cancel</button>
        </div>
      </form>
    </div>
  </div>

  <!-- Log Weight Modal -->
  <div id="weight-modal" class="fixed inset-0 z-50 bg-black/75 backdrop-blur-md hidden flex items-center justify-center p-4" role="dialog" aria-modal="true">
    <div class="glass-card rounded-3xl w-full max-w-sm p-6 space-y-5 animate-pop">
      <div class="flex items-center justify-between border-b border-white/[0.08] pb-3">
        <h3 class="text-base font-extrabold text-white">Record Weight</h3>
        <button id="btn-close-weight-modal" class="text-slate-400 hover:text-white text-xl font-bold w-8 h-8 rounded-lg flex items-center justify-center hover:bg-white/[0.08]">×</button>
      </div>
      <form id="form-weight" class="space-y-3.5">
        <div>
          <label class="text-[11px] font-bold text-slate-300 uppercase tracking-wide">Weight (kg)</label>
          <input type="number" id="input-weight-kg" step="0.1" required placeholder="e.g. 74.2" class="w-full mt-1 px-3.5 py-2.5 text-base font-bold rounded-xl surface-elevated text-white focus:outline-none focus:border-emerald-500">
        </div>
        <div>
          <label class="text-[11px] font-bold text-slate-300 uppercase tracking-wide">Date</label>
          <input type="date" id="input-weight-date" required class="w-full mt-1 px-3.5 py-2 text-xs rounded-xl surface-elevated text-white focus:outline-none">
        </div>
        <div>
          <label class="text-[11px] font-bold text-slate-300 uppercase tracking-wide">Notes</label>
          <input type="text" id="input-weight-notes" placeholder="e.g. Morning fasted after cardio" class="w-full mt-1 px-3.5 py-2 text-xs rounded-xl surface-elevated text-white focus:outline-none">
        </div>
        <div class="flex gap-2.5 pt-2">
          <button type="submit" class="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white text-xs font-bold transition btn-press">Save Entry</button>
          <button type="button" id="btn-cancel-weight-modal" class="px-4 py-2.5 rounded-xl bg-white/[0.08] hover:bg-white/[0.12] text-xs font-semibold text-slate-300 btn-press">Cancel</button>
        </div>
      </form>
    </div>
  </div>

  <!-- Settings & Targets Modal -->
  <div id="settings-modal" class="fixed inset-0 z-50 bg-black/75 backdrop-blur-md hidden flex items-center justify-center p-4" role="dialog" aria-modal="true">
    <div class="glass-card rounded-3xl w-full max-w-md p-6 space-y-5 animate-pop">
      <div class="flex items-center justify-between border-b border-white/[0.08] pb-3">
        <h3 class="text-base font-extrabold text-white">Daily Targets & Goals</h3>
        <button id="btn-close-settings" class="text-slate-400 hover:text-white text-xl font-bold w-8 h-8 rounded-lg flex items-center justify-center hover:bg-white/[0.08]">×</button>
      </div>
      <form id="form-settings" class="space-y-3.5">
        <div>
          <label class="text-[11px] font-bold text-slate-300 uppercase tracking-wide">Daily Calorie Target (kcal)</label>
          <input type="number" id="setting-target" value="2000" class="w-full mt-1 px-3.5 py-2.5 text-xs rounded-xl surface-elevated text-white focus:outline-none font-bold">
        </div>
        <div class="grid grid-cols-3 gap-2.5">
          <div>
            <label class="text-[11px] font-bold text-sky-400 uppercase tracking-wide">Protein (g)</label>
            <input type="number" id="setting-protein" value="140" class="w-full mt-1 px-3 py-2 text-xs rounded-xl surface-elevated text-white focus:outline-none">
          </div>
          <div>
            <label class="text-[11px] font-bold text-amber-400 uppercase tracking-wide">Carbs (g)</label>
            <input type="number" id="setting-carbs" value="200" class="w-full mt-1 px-3 py-2 text-xs rounded-xl surface-elevated text-white focus:outline-none">
          </div>
          <div>
            <label class="text-[11px] font-bold text-rose-400 uppercase tracking-wide">Fat (g)</label>
            <input type="number" id="setting-fat" value="65" class="w-full mt-1 px-3 py-2 text-xs rounded-xl surface-elevated text-white focus:outline-none">
          </div>
        </div>
        <div class="grid grid-cols-2 gap-2.5">
          <div>
            <label class="text-[11px] font-bold text-slate-300 uppercase tracking-wide">Goal Weight (kg)</label>
            <input type="number" id="setting-weight-goal" step="0.1" placeholder="e.g. 70.0" class="w-full mt-1 px-3.5 py-2 text-xs rounded-xl surface-elevated text-white focus:outline-none">
          </div>
          <div>
            <label class="text-[11px] font-bold text-purple-400 uppercase tracking-wide">Fasting Target (h)</label>
            <input type="number" id="setting-fasting-target" step="1" value="16" class="w-full mt-1 px-3 py-2 text-xs rounded-xl surface-elevated text-white focus:outline-none">
          </div>
        </div>
        <div>
          <label class="text-[11px] font-bold text-slate-300 uppercase tracking-wide">Timezone</label>
          <input type="text" id="setting-tz" value="UTC" class="w-full mt-1 px-3.5 py-2 text-xs rounded-xl surface-elevated text-white focus:outline-none">
        </div>
        <div class="flex gap-2.5 pt-2">
          <button type="submit" class="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-sky-500 to-sky-600 hover:from-sky-600 hover:to-sky-700 text-white text-xs font-bold transition btn-press">Save Targets</button>
          <button type="button" id="btn-cancel-settings" class="px-4 py-2.5 rounded-xl bg-white/[0.08] hover:bg-white/[0.12] text-xs font-semibold text-slate-300 btn-press">Cancel</button>
        </div>
      </form>
    </div>
  </div>

  <!-- PWA iOS Instructions Modal -->
  <div id="pwa-ios-modal" class="fixed inset-0 z-50 bg-black/80 backdrop-blur-md hidden flex items-center justify-center p-4" role="dialog" aria-modal="true">
    <div class="glass-card rounded-3xl w-full max-w-sm p-6 space-y-4 animate-pop text-center">
      <div class="w-14 h-14 mx-auto rounded-2xl bg-sky-500/20 border border-sky-500/30 flex items-center justify-center text-sky-400">
        <svg class="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z"/></svg>
      </div>
      <div>
        <h3 class="text-base font-extrabold text-white">Install on iPhone / iPad</h3>
        <p class="text-xs text-slate-400 mt-1">CalorieFlow installs as a full standalone iOS app directly from Safari:</p>
      </div>
      <div class="surface-elevated p-3.5 rounded-2xl text-xs text-left space-y-2 text-slate-300">
        <p class="flex items-center gap-2"><span>1.</span> Tap the <strong>Share</strong> button <span class="px-1.5 py-0.5 rounded bg-white/10 text-white font-mono">⎋</span> at bottom of Safari.</p>
        <p class="flex items-center gap-2"><span>2.</span> Scroll down and tap <strong>Add to Home Screen</strong> <span class="px-1.5 py-0.5 rounded bg-white/10 text-white font-mono">⊞</span>.</p>
        <p class="flex items-center gap-2"><span>3.</span> Tap <strong>Add</strong> in the top right corner.</p>
      </div>
      <button id="btn-close-pwa-ios" class="w-full py-3 rounded-2xl bg-white/[0.1] hover:bg-white/[0.15] text-xs font-bold text-white transition btn-press">Got it!</button>
    </div>
  </div>

  <!-- ======================================================== -->
  <!-- CLIENT JAVASCRIPT LOGIC                                  -->
  <!-- ======================================================== -->
  <script>
    // Application State
    let currentDate = new Date().toISOString().split("T")[0];
    let summaryData = null;
    let weightData = null;
    let fastingData = null;
    let fastingInterval = null;
    let deferredPwaPrompt = null;
    let activeTab = "intake";

    // PWA Service Worker Registration
    if ('serviceWorker' in navigator) {
      window.addEventListener('load', () => {
        navigator.serviceWorker.register('/sw.js').catch(err => console.log('SW registration failed:', err));
      });
    }

    // PWA Install Prompt
    window.addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault();
      deferredPwaPrompt = e;
      const installBtn = document.getElementById("btn-pwa-install");
      if (installBtn) installBtn.classList.remove("hidden");
    });

    document.getElementById("btn-pwa-install").onclick = async () => {
      if (deferredPwaPrompt) {
        deferredPwaPrompt.prompt();
        const { outcome } = await deferredPwaPrompt.userChoice;
        if (outcome === 'accepted') {
          showToast("App installed successfully! 🎉", "success");
        }
        deferredPwaPrompt = null;
        document.getElementById("btn-pwa-install").classList.add("hidden");
      } else {
        const isIos = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
        if (isIos) {
          document.getElementById("pwa-ios-modal").classList.remove("hidden");
        } else {
          showToast("App already installed or browser does not support prompt", "info");
        }
      }
    };

    document.getElementById("btn-close-pwa-ios").onclick = () => {
      document.getElementById("pwa-ios-modal").classList.add("hidden");
    };

    // Tab Navigation
    const desktopTabBtns = document.querySelectorAll(".tab-btn");
    const mobileTabBtns = document.querySelectorAll(".mobile-tab-btn");
    const views = {
      intake: document.getElementById("view-intake"),
      photo: document.getElementById("view-photo"),
      fasting: document.getElementById("view-fasting"),
      weight: document.getElementById("view-weight")
    };

    desktopTabBtns.forEach(btn => {
      btn.onclick = () => switchTab(btn.dataset.tab);
    });
    mobileTabBtns.forEach(btn => {
      btn.onclick = () => switchTab(btn.dataset.tab);
    });

    function switchTab(tab) {
      activeTab = tab;

      // Update Desktop Tabs
      desktopTabBtns.forEach(b => {
        if (b.dataset.tab === tab) {
          b.className = "tab-btn nav-pill active px-3.5 py-1.5 rounded-lg text-xs font-bold text-white flex items-center gap-1.5";
        } else {
          b.className = "tab-btn nav-pill px-3.5 py-1.5 rounded-lg text-xs font-semibold text-slate-400 hover:text-white flex items-center gap-1.5";
        }
      });

      // Update Mobile Tabs
      mobileTabBtns.forEach(b => {
        if (b.dataset.tab === tab) {
          b.className = "mobile-tab-btn flex flex-col items-center gap-1 text-white active-tab flex-1 py-1";
          const label = b.querySelector("span:last-child");
          if (label) label.className = "text-[10px] font-bold tracking-tight text-white";
          const svg = b.querySelector("svg");
          if (svg) svg.className = "w-4 h-4 text-sky-400";
        } else {
          b.className = "mobile-tab-btn flex flex-col items-center gap-1 text-slate-400 flex-1 py-1";
          const label = b.querySelector("span:last-child");
          if (label) label.className = "text-[10px] font-semibold tracking-tight text-slate-400";
          const svg = b.querySelector("svg");
          if (svg) svg.className = "w-4 h-4";
        }
      });

      // Toggle View Sections
      Object.keys(views).forEach(k => {
        if (k === tab) views[k].classList.remove("hidden");
        else views[k].classList.add("hidden");
      });

      // Date switcher visibility
      const dateWrap = document.getElementById("date-switcher-wrap");
      if (tab === "intake") dateWrap.classList.remove("hidden");
      else dateWrap.classList.add("hidden");

      if (tab === "fasting") loadFastingData();
      if (tab === "weight") loadWeightData();
    }

    // Date Switcher Logic
    const dateInput = document.getElementById("date-input");
    const dateDisplayLabel = document.getElementById("date-display-label");
    dateInput.value = currentDate;

    function updateDateLabel() {
      const today = new Date().toISOString().split("T")[0];
      const yest = new Date(Date.now() - 86400000).toISOString().split("T")[0];
      const tomo = new Date(Date.now() + 86400000).toISOString().split("T")[0];
      if (currentDate === today) dateDisplayLabel.innerText = "Today";
      else if (currentDate === yest) dateDisplayLabel.innerText = "Yesterday";
      else if (currentDate === tomo) dateDisplayLabel.innerText = "Tomorrow";
      else {
        try {
          const parts = currentDate.split("-");
          const d = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
          dateDisplayLabel.innerText = d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
        } catch {
          dateDisplayLabel.innerText = currentDate;
        }
      }
    }

    document.getElementById("btn-prev-day").onclick = () => {
      const parts = currentDate.split("-");
      const d = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
      d.setDate(d.getDate() - 1);
      currentDate = d.toISOString().split("T")[0];
      dateInput.value = currentDate;
      updateDateLabel();
      loadData();
    };

    document.getElementById("btn-next-day").onclick = () => {
      const parts = currentDate.split("-");
      const d = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
      d.setDate(d.getDate() + 1);
      currentDate = d.toISOString().split("T")[0];
      dateInput.value = currentDate;
      updateDateLabel();
      loadData();
    };

    dateInput.onchange = (e) => {
      currentDate = e.target.value;
      updateDateLabel();
      loadData();
    };

    // Load Intake Summary Data
    async function loadData() {
      try {
        const res = await fetch('/api/summary?date=' + currentDate);
        summaryData = await res.json();
        renderSummary();
        renderMeals();
        loadPresets();
      } catch (err) {
        showToast("Error loading tracker data", "error");
      }
    }

    function renderSummary() {
      if (!summaryData) return;
      const target = summaryData.daily_target || 2000;
      const eaten = summaryData.consumed || 0;
      const remaining = summaryData.remaining || 0;
      const overBudget = summaryData.over_budget;
      const pct = Math.min(100, Math.round((eaten / target) * 100));

      document.getElementById("target-pill-display").innerText = "Target: " + target.toLocaleString() + " kcal";
      document.getElementById("hero-budget-val").innerText = target.toLocaleString();
      document.getElementById("hero-eaten-val").innerText = eaten.toLocaleString();
      document.getElementById("hero-remaining-val").innerText = (overBudget ? "+" + (eaten - target) : remaining).toLocaleString();
      document.getElementById("hero-remaining-lbl").innerText = overBudget ? "Over Budget" : "Remaining";
      document.getElementById("hero-pct-val").innerText = pct + "% eaten";

      // SVG Ring Stroke Gauge
      const circle = document.getElementById("calorie-gauge-circle");
      const circum = 2 * Math.PI * 48; // ~301.6
      const offset = circum - (pct / 100) * circum;
      circle.style.strokeDashoffset = Math.max(0, offset);
      circle.style.stroke = overBudget ? "url(#ringOverGrad)" : "url(#ringGrad)";

      // Over budget badge
      const overBadge = document.getElementById("hero-over-badge");
      if (overBadge) {
        if (overBudget) overBadge.classList.remove("hidden");
        else overBadge.classList.add("hidden");
      }

      document.getElementById("hero-progress-bar").style.width = pct + "%";
      const statusPill = document.getElementById("budget-status-text");
      statusPill.innerText = overBudget ? "Over Target" : (pct >= 85 ? "Optimal" : "On Track");
      statusPill.className = overBudget ? "text-rose-400 font-bold" : (pct >= 85 ? "text-emerald-400 font-bold" : "text-sky-400 font-bold");

      // Macros
      const cm = summaryData.consumed_macros;
      const tm = summaryData.target_macros;
      const rm = summaryData.remaining_macros;

      // Protein
      document.getElementById("macro-p-consumed").innerText = cm.protein_g;
      document.getElementById("macro-p-target").innerText = tm.protein_g;
      document.getElementById("macro-p-left").innerText = rm.protein_g + "g left";
      const pPct = Math.min(100, Math.round((cm.protein_g / tm.protein_g) * 100)) || 0;
      document.getElementById("macro-p-bar").style.width = pPct + "%";
      document.getElementById("macro-p-pct").innerText = pPct + "%";

      // Carbs
      document.getElementById("macro-c-consumed").innerText = cm.carbs_g;
      document.getElementById("macro-c-target").innerText = tm.carbs_g;
      document.getElementById("macro-c-left").innerText = rm.carbs_g + "g left";
      const cPct = Math.min(100, Math.round((cm.carbs_g / tm.carbs_g) * 100)) || 0;
      document.getElementById("macro-c-bar").style.width = cPct + "%";
      document.getElementById("macro-c-pct").innerText = cPct + "%";

      // Fat
      document.getElementById("macro-f-consumed").innerText = cm.fat_g;
      document.getElementById("macro-f-target").innerText = tm.fat_g;
      document.getElementById("macro-f-left").innerText = rm.fat_g + "g left";
      const fPct = Math.min(100, Math.round((cm.fat_g / tm.fat_g) * 100)) || 0;
      document.getElementById("macro-f-bar").style.width = fPct + "%";
      document.getElementById("macro-f-pct").innerText = fPct + "%";

      const totalMacroGrams = (cm.protein_g + cm.carbs_g + cm.fat_g) || 1;
      const pRatio = Math.round((cm.protein_g / totalMacroGrams) * 100);
      const cRatio = Math.round((cm.carbs_g / totalMacroGrams) * 100);
      const fRatio = Math.round((cm.fat_g / totalMacroGrams) * 100);
      document.getElementById("macro-pct-ratio").innerText = "P: " + pRatio + "% • C: " + cRatio + "% • F: " + fRatio + "%";
    }

    function renderMeals() {
      const list = document.getElementById("meals-list");
      list.innerHTML = "";
      const meals = summaryData?.meals || [];
      document.getElementById("meal-count-pill").innerText = meals.length;

      if (meals.length === 0) {
        list.innerHTML = '<div class="surface-elevated p-8 rounded-2xl text-center text-xs text-slate-400 space-y-2"><div class="w-10 h-10 mx-auto rounded-xl bg-white/[0.04] flex items-center justify-center text-slate-400"><svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"/></svg></div><p class="font-bold text-white">No meals recorded for this date</p><p class="text-[11px] text-slate-500">Tap "+ Log Meal", snap a photo in Photo AI, or tap a preset above.</p></div>';
        return;
      }

      meals.forEach(m => {
        const item = document.createElement("div");
        item.className = "surface-elevated rounded-2xl p-4 flex items-center justify-between gap-3 group hover:border-white/20 transition";

        let typeBadgeClass = "bg-sky-500/10 text-sky-400 border-sky-500/20";
        if (m.meal_type === "breakfast") typeBadgeClass = "bg-amber-500/10 text-amber-400 border-amber-500/20";
        else if (m.meal_type === "dinner") typeBadgeClass = "bg-purple-500/10 text-purple-400 border-purple-500/20";
        else if (m.meal_type === "snack") typeBadgeClass = "bg-emerald-500/10 text-emerald-400 border-emerald-500/20";

        item.innerHTML = \`
          <div class="flex-1 min-w-0">
            <div class="flex items-center gap-2">
              <span class="px-2 py-0.5 rounded-full text-[9px] uppercase font-extrabold tracking-wider border \${typeBadgeClass}">\${m.meal_type}</span>
              <h4 class="text-xs font-bold text-white truncate">\${m.food_name}</h4>
            </div>
            <div class="flex items-center flex-wrap gap-2 text-[11px] text-slate-400 mt-1.5">
              <span class="font-medium text-slate-300">\${m.amount} \${m.unit}</span>
              <span>•</span>
              <span class="text-sky-300 font-mono font-bold">\${m.protein_g}g P</span>
              <span class="text-amber-300 font-mono font-bold">\${m.carbs_g}g C</span>
              <span class="text-rose-300 font-mono font-bold">\${m.fat_g}g F</span>
              \${m.notes ? '<span class="text-slate-500 truncate max-w-[140px]">(' + m.notes + ')</span>' : ''}
            </div>
          </div>
          <div class="flex items-center gap-3 flex-shrink-0">
            <div class="text-right">
              <span class="text-sm font-black text-white tabular-num">\${m.calories}</span>
              <span class="text-[10px] text-slate-400 font-mono">kcal</span>
            </div>
            <button class="btn-del-meal p-2 text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition" data-id="\${m.id}" title="Delete meal">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
            </button>
          </div>
        \`;
        list.appendChild(item);
      });

      document.querySelectorAll(".btn-del-meal").forEach(b => {
        b.onclick = async (e) => {
          e.stopPropagation();
          const id = b.dataset.id;
          if (confirm("Delete this meal entry?")) {
            await fetch('/api/meals/' + id, { method: 'DELETE' });
            showToast("Meal removed", "info");
            loadData();
          }
        };
      });
    }

    async function loadPresets() {
      try {
        const res = await fetch('/api/presets');
        const data = await res.json();
        const carousel = document.getElementById("presets-carousel");
        carousel.innerHTML = "";
        
        const presets = data.presets || [];
        if (presets.length === 0) {
          carousel.innerHTML = '<div class="text-xs text-slate-500 py-1 italic">No presets saved yet. Click "+ New Preset" to create one.</div>';
          return;
        }

        presets.forEach(p => {
          const card = document.createElement("button");
          card.className = "flex-shrink-0 px-3.5 py-2.5 rounded-2xl surface-elevated hover:border-sky-500/50 text-left transition active:scale-95 group btn-press";
          card.innerHTML = \`
            <div class="flex items-center gap-1.5">
              <svg class="w-3.5 h-3.5 text-sky-400 fill-current" viewBox="0 0 24 24"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/></svg>
              <span class="text-xs font-bold text-white group-hover:text-sky-300 transition">\${p.name}</span>
            </div>
            <div class="text-[10px] text-slate-400 mt-1">
              <span class="font-bold text-slate-200">\${p.calories} kcal</span> • <span class="text-sky-300">\${p.protein_g}g P</span>
            </div>
          \`;
          card.onclick = async () => {
            await fetch('/api/presets/log', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ preset: p.name })
            });
            showToast("Logged " + p.name + "! ⚡", "success");
            loadData();
          };
          carousel.appendChild(card);
        });
      } catch (e) {
        console.error(e);
      }
    }

    // Photo AI File Upload & Dropzone
    const dropzone = document.getElementById("photo-dropzone");
    const fileInput = document.getElementById("photo-file-input");
    const previewState = document.getElementById("photo-preview-state");
    const emptyState = document.getElementById("photo-empty-state");
    const previewImg = document.getElementById("photo-preview-img");
    const laser = document.getElementById("photo-laser");
    const analyzingOverlay = document.getElementById("photo-analyzing-overlay");
    const resultCard = document.getElementById("photo-result-card");
    let currentPhotoBase64 = null;

    dropzone.onclick = () => fileInput.click();

    fileInput.onchange = (e) => {
      const file = e.target.files[0];
      if (file) handlePhotoFile(file);
    };

    dropzone.ondragover = (e) => { e.preventDefault(); dropzone.classList.add("border-sky-500"); };
    dropzone.ondragleave = () => dropzone.classList.remove("border-sky-500");
    dropzone.ondrop = (e) => {
      e.preventDefault();
      dropzone.classList.remove("border-sky-500");
      if (e.dataTransfer.files[0]) handlePhotoFile(e.dataTransfer.files[0]);
    };

    function handlePhotoFile(file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        currentPhotoBase64 = e.target.result;
        previewImg.src = currentPhotoBase64;
        emptyState.classList.add("hidden");
        previewState.classList.remove("hidden");
        analyzeCurrentPhoto();
      };
      reader.readAsDataURL(file);
    }

    async function analyzeCurrentPhoto() {
      if (!currentPhotoBase64) return;
      laser.classList.remove("hidden");
      analyzingOverlay.classList.remove("hidden");
      resultCard.classList.add("hidden");

      try {
        const hint = document.getElementById("photo-hint-input").value;
        const res = await fetch("/api/analyze-food-photo", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            image: currentPhotoBase64,
            food_description: hint
          })
        });
        const data = await res.json();
        if (data.success) {
          document.getElementById("detected-food-name").value = data.food_name || "Detected Meal";
          document.getElementById("detected-calories").innerText = data.calories || 0;
          document.getElementById("detected-protein").value = data.protein_g || 0;
          document.getElementById("detected-carbs").value = data.carbs_g || 0;
          document.getElementById("detected-fat").value = data.fat_g || 0;
          document.getElementById("detected-amount").value = data.amount || 1;
          document.getElementById("detected-unit").value = data.unit || "serving";
          document.getElementById("detected-notes").value = data.notes || "";
          resultCard.classList.remove("hidden");
          showToast("Photo analyzed! ✨", "success");
        } else {
          showToast("Failed to analyze: " + (data.error || "Unknown"), "error");
        }
      } catch (err) {
        showToast("AI Vision analysis failed", "error");
      } finally {
        laser.classList.add("hidden");
        analyzingOverlay.classList.add("hidden");
      }
    }

    document.getElementById("btn-reanalyze-photo").onclick = analyzeCurrentPhoto;

    document.getElementById("btn-log-detected-meal").onclick = async () => {
      const payload = {
        food_name: document.getElementById("detected-food-name").value,
        calories: parseInt(document.getElementById("detected-calories").innerText) || 0,
        protein_g: parseFloat(document.getElementById("detected-protein").value) || 0,
        carbs_g: parseFloat(document.getElementById("detected-carbs").value) || 0,
        fat_g: parseFloat(document.getElementById("detected-fat").value) || 0,
        amount: parseFloat(document.getElementById("detected-amount").value) || 1,
        unit: document.getElementById("detected-unit").value || "serving",
        meal_type: document.getElementById("detected-meal-type").value || "lunch",
        notes: document.getElementById("detected-notes").value,
        calorie_source: "estimate",
        logged_at: new Date().toISOString(),
        local_date: currentDate
      };

      try {
        await fetch("/api/meals", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload)
        });
        showToast("Meal logged from photo! 📸", "success");
        switchTab("intake");
        loadData();
      } catch (e) {
        showToast("Error saving meal", "error");
      }
    };

    document.getElementById("btn-save-detected-preset").onclick = async () => {
      const name = prompt("Enter preset name:", document.getElementById("detected-food-name").value);
      if (!name) return;
      const payload = {
        name,
        food_name: document.getElementById("detected-food-name").value,
        calories: parseInt(document.getElementById("detected-calories").innerText) || 0,
        protein_g: parseFloat(document.getElementById("detected-protein").value) || 0,
        carbs_g: parseFloat(document.getElementById("detected-carbs").value) || 0,
        fat_g: parseFloat(document.getElementById("detected-fat").value) || 0,
        amount: parseFloat(document.getElementById("detected-amount").value) || 1,
        unit: document.getElementById("detected-unit").value || "serving",
        meal_type: document.getElementById("detected-meal-type").value || "snack",
        notes: document.getElementById("detected-notes").value
      };
      await fetch("/api/presets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      showToast("Saved preset '" + name + "'! 🔖", "success");
      loadPresets();
    };

    // Intermittent Fasting Logic
    async function loadFastingData() {
      try {
        const res = await fetch("/api/fasting");
        fastingData = await res.json();
        renderFasting();
      } catch (e) {
        console.error("Failed to load fasting data:", e);
      }
    }

    function renderFasting() {
      if (!fastingData) return;
      const isActive = fastingData.is_active;
      const autoTracked = fastingData.auto_tracked;
      const stateBadge = document.getElementById("fasting-state-badge");
      const stateText = document.getElementById("fasting-state-text");
      const toggleBtn = document.getElementById("btn-toggle-fast");

      if (isActive) {
        stateBadge.className = "px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-purple-500/15 text-purple-300 border border-purple-500/30 flex items-center gap-1.5";
        stateText.innerText = "Fasting Active";
        toggleBtn.innerText = "End Fast";
        toggleBtn.className = "flex-1 py-3 rounded-2xl bg-gradient-to-r from-rose-500 to-rose-600 hover:from-rose-600 hover:to-rose-700 text-white text-xs font-bold transition btn-press";
      } else if (autoTracked) {
        stateBadge.className = "px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-sky-500/15 text-sky-300 border border-sky-500/30 flex items-center gap-1.5";
        stateText.innerText = "Auto-Fasting (Last Meal)";
        toggleBtn.innerText = "Start Manual Fast";
        toggleBtn.className = "flex-1 py-3 rounded-2xl bg-gradient-to-r from-purple-500 to-indigo-600 hover:from-purple-600 hover:to-indigo-700 text-white text-xs font-bold transition btn-press";
      } else {
        stateBadge.className = "px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 flex items-center gap-1.5";
        stateText.innerText = "Eating Window Open";
        toggleBtn.innerText = "Start Fast";
        toggleBtn.className = "flex-1 py-3 rounded-2xl bg-gradient-to-r from-purple-500 to-indigo-600 hover:from-purple-600 hover:to-indigo-700 text-white text-xs font-bold transition btn-press";
      }

      document.getElementById("fasting-target-display").innerText = (fastingData.target_hours || 16) + " Hours (" + (fastingData.fast_type || "16:8") + ")";
      updateFastingTimer();

      if (!fastingInterval) {
        fastingInterval = setInterval(updateFastingTimer, 1000);
      }
    }

    function updateFastingTimer() {
      if (!fastingData || !fastingData.start_time) {
        document.getElementById("fasting-timer-countdown").innerText = "00:00:00";
        return;
      }
      const startMs = new Date(fastingData.start_time).getTime();
      const elapsedSec = Math.max(0, Math.floor((Date.now() - startMs) / 1000));
      const targetSec = (fastingData.target_hours || 16) * 3600;
      const remSec = Math.max(0, targetSec - elapsedSec);

      const h = Math.floor(elapsedSec / 3600).toString().padStart(2, '0');
      const m = Math.floor((elapsedSec % 3600) / 60).toString().padStart(2, '0');
      const s = Math.floor(elapsedSec % 60).toString().padStart(2, '0');
      document.getElementById("fasting-timer-countdown").innerText = \`\${h}:\${m}:\${s}\`;

      const remH = Math.floor(remSec / 3600);
      const remM = Math.floor((remSec % 3600) / 60);
      document.getElementById("fasting-remaining-display").innerText = remSec === 0 ? "Goal reached! 🏆" : \`\${remH}h \${remM}m left\`;

      const pct = Math.min(100, Math.round((elapsedSec / targetSec) * 100));
      const circle = document.getElementById("fasting-gauge-circle");
      const circum = 2 * Math.PI * 50; // 314.15
      circle.style.strokeDashoffset = circum - (pct / 100) * circum;
      circle.style.stroke = pct >= 100 ? "#34D399" : "#A855F7";
    }

    document.getElementById("btn-toggle-fast").onclick = async () => {
      if (fastingData?.is_active) {
        if (confirm("End your active fasting window?")) {
          await fetch("/api/fasting/end", { method: "POST" });
          showToast("Fast completed! 🏁", "success");
          loadFastingData();
        }
      } else {
        await fetch("/api/fasting/start", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ target_hours: 16.0, fast_type: "16:8" })
        });
        showToast("Fasting window started! ⏱️", "success");
        loadFastingData();
      }
    };

    document.querySelectorAll(".fasting-preset-btn").forEach(b => {
      b.onclick = async () => {
        const hours = parseFloat(b.dataset.hours);
        const type = b.dataset.type;
        await fetch("/api/fasting/start", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ target_hours: hours, fast_type: type })
        });
        showToast("Set fast to " + type + " (" + hours + "h)! ⏳", "success");
        loadFastingData();
      };
    });

    document.getElementById("btn-edit-fast-time").onclick = async () => {
      const cur = fastingData?.start_time ? new Date(fastingData.start_time).toISOString().slice(0, 16) : new Date().toISOString().slice(0, 16);
      const val = prompt("Enter fast start datetime (YYYY-MM-DDTHH:MM):", cur);
      if (val) {
        await fetch("/api/fasting/start", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            start_time: new Date(val).toISOString(),
            target_hours: fastingData?.target_hours || 16.0
          })
        });
        showToast("Fast start time updated! ⏱️", "success");
        loadFastingData();
      }
    };

    // Weight Progression Handling
    async function loadWeightData() {
      try {
        const res = await fetch("/api/weight");
        weightData = await res.json();
        renderWeight();
      } catch (e) {
        console.error(e);
      }
    }

    function renderWeight() {
      if (!weightData) return;
      const stats = weightData.stats || {};
      const logs = weightData.logs || [];

      document.getElementById("weight-stat-latest").innerText = stats.latest_weight ?? "--";
      document.getElementById("weight-stat-change").innerText = (stats.net_change > 0 ? "+" : "") + stats.net_change;
      document.getElementById("weight-stat-target").innerText = stats.target_weight ?? "--";

      renderWeightChart(logs);
      renderWeightHistory(logs);
    }

    function renderWeightChart(logs) {
      const svg = document.getElementById("weight-chart-svg");
      svg.innerHTML = "";
      if (logs.length < 2) {
        svg.innerHTML = '<text x="200" y="75" fill="#64748B" font-size="12" font-weight="600" text-anchor="middle">Log at least 2 weigh-ins to see progression curve.</text>';
        return;
      }

      const weights = logs.map(l => l.weight_kg);
      const minW = Math.min(...weights) - 0.5;
      const maxW = Math.max(...weights) + 0.5;
      const rangeW = maxW - minW || 1;

      const width = 400;
      const height = 150;
      const padding = 20;

      const points = logs.map((l, i) => {
        const x = padding + (i / (logs.length - 1)) * (width - 2 * padding);
        const y = height - padding - ((l.weight_kg - minW) / rangeW) * (height - 2 * padding);
        return { x, y, weight: l.weight_kg, date: l.date };
      });

      // SVG Gradients & Area
      const defs = document.createElementNS("http://www.w3.org/2000/svg", "defs");
      defs.innerHTML = \`
        <linearGradient id="weightGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="#34D399" stop-opacity="0.35"/>
          <stop offset="100%" stop-color="#34D399" stop-opacity="0.0"/>
        </linearGradient>
      \`;
      svg.appendChild(defs);

      // Area Path
      const areaPath = \`M \${points[0].x} \${height - padding} L \` + points.map(p => \`\${p.x} \${p.y}\`).join(" L ") + \` L \${points[points.length-1].x} \${height - padding} Z\`;
      const area = document.createElementNS("http://www.w3.org/2000/svg", "path");
      area.setAttribute("d", areaPath);
      area.setAttribute("fill", "url(#weightGrad)");
      svg.appendChild(area);

      // Trend Line
      const linePath = "M " + points.map(p => \`\${p.x} \${p.y}\`).join(" L ");
      const line = document.createElementNS("http://www.w3.org/2000/svg", "path");
      line.setAttribute("d", linePath);
      line.setAttribute("fill", "none");
      line.setAttribute("stroke", "#34D399");
      line.setAttribute("stroke-width", "3");
      line.setAttribute("stroke-linecap", "round");
      line.setAttribute("stroke-linejoin", "round");
      line.style.filter = "drop-shadow(0 0 6px rgba(52, 211, 153, 0.4))";
      svg.appendChild(line);

      // Data Points
      points.forEach(p => {
        const dot = document.createElementNS("http://www.w3.org/2000/svg", "circle");
        dot.setAttribute("cx", p.x);
        dot.setAttribute("cy", p.y);
        dot.setAttribute("r", "4.5");
        dot.setAttribute("fill", "#08090C");
        dot.setAttribute("stroke", "#34D399");
        dot.setAttribute("stroke-width", "2.5");
        
        const title = document.createElementNS("http://www.w3.org/2000/svg", "title");
        title.textContent = \`\${p.date}: \${p.weight} kg\`;
        dot.appendChild(title);
        svg.appendChild(dot);
      });
    }

    function renderWeightHistory(logs) {
      const list = document.getElementById("weight-history-list");
      list.innerHTML = "";
      if (logs.length === 0) {
        list.innerHTML = '<p class="text-xs text-slate-500 py-2">No weight records logged yet.</p>';
        return;
      }
      [...logs].reverse().forEach(w => {
        const row = document.createElement("div");
        row.className = "surface-elevated p-3.5 rounded-2xl flex items-center justify-between";
        row.innerHTML = \`
          <div>
            <span class="text-xs font-bold text-white">\${w.date}</span>
            \${w.notes ? '<p class="text-[10px] text-slate-400 mt-0.5">' + w.notes + '</p>' : ''}
          </div>
          <div class="flex items-center gap-3">
            <span class="text-sm font-black text-white tabular-num">\${w.weight_kg} kg</span>
            <button class="btn-del-weight text-slate-500 hover:text-rose-400 p-1.5 rounded-lg hover:bg-rose-500/10 transition" data-id="\${w.id}" title="Delete record">
              <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
            </button>
          </div>
        \`;
        list.appendChild(row);
      });

      document.querySelectorAll(".btn-del-weight").forEach(b => {
        b.onclick = async () => {
          if (confirm("Delete weight record?")) {
            await fetch("/api/weight/" + b.dataset.id, { method: "DELETE" });
            showToast("Weight record deleted", "info");
            loadWeightData();
          }
        };
      });
    }

    // Weight Modal Handlers
    const weightModal = document.getElementById("weight-modal");
    document.getElementById("btn-open-weight-modal").onclick = () => {
      document.getElementById("input-weight-date").value = currentDate;
      weightModal.classList.remove("hidden");
    };
    document.getElementById("btn-close-weight-modal").onclick = () => weightModal.classList.add("hidden");
    document.getElementById("btn-cancel-weight-modal").onclick = () => weightModal.classList.add("hidden");

    document.getElementById("form-weight").onsubmit = async (e) => {
      e.preventDefault();
      const payload = {
        weight_kg: parseFloat(document.getElementById("input-weight-kg").value),
        date: document.getElementById("input-weight-date").value,
        notes: document.getElementById("input-weight-notes").value
      };
      await fetch("/api/weight", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      weightModal.classList.add("hidden");
      showToast("Logged " + payload.weight_kg + " kg! ⚖️", "success");
      loadWeightData();
    };

    // Meal Modal Handlers
    const mealModal = document.getElementById("meal-modal");
    document.getElementById("btn-open-meal-modal").onclick = () => {
      document.getElementById("form-meal").reset();
      document.getElementById("meal-edit-id").value = "";
      document.getElementById("meal-modal-title").innerText = "Log Meal";
      mealModal.classList.remove("hidden");
    };
    document.getElementById("btn-close-meal-modal").onclick = () => mealModal.classList.add("hidden");
    document.getElementById("btn-cancel-meal-modal").onclick = () => mealModal.classList.add("hidden");

    document.getElementById("form-meal").onsubmit = async (e) => {
      e.preventDefault();
      const payload = {
        food_name: document.getElementById("meal-food-name").value,
        amount: parseFloat(document.getElementById("meal-amount").value),
        unit: document.getElementById("meal-unit").value,
        meal_type: document.getElementById("meal-type").value,
        calories: parseInt(document.getElementById("meal-calories").value),
        protein_g: parseFloat(document.getElementById("meal-protein").value) || 0,
        carbs_g: parseFloat(document.getElementById("meal-carbs").value) || 0,
        fat_g: parseFloat(document.getElementById("meal-fat").value) || 0,
        notes: document.getElementById("meal-notes").value,
        calorie_source: "user",
        logged_at: new Date().toISOString(),
        local_date: currentDate
      };
      await fetch("/api/meals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      mealModal.classList.add("hidden");
      showToast("Meal logged! 🥗", "success");
      loadData();
    };

    // Preset Modal Handlers
    const presetModal = document.getElementById("preset-modal");
    document.getElementById("btn-open-preset-modal").onclick = () => {
      document.getElementById("form-preset").reset();
      presetModal.classList.remove("hidden");
    };
    document.getElementById("btn-close-preset-modal").onclick = () => presetModal.classList.add("hidden");
    document.getElementById("btn-cancel-preset-modal").onclick = () => presetModal.classList.add("hidden");

    document.getElementById("form-preset").onsubmit = async (e) => {
      e.preventDefault();
      const payload = {
        name: document.getElementById("preset-name").value,
        food_name: document.getElementById("preset-food-name").value,
        amount: parseFloat(document.getElementById("preset-amount").value),
        unit: document.getElementById("preset-unit").value,
        meal_type: document.getElementById("preset-type").value,
        calories: parseInt(document.getElementById("preset-calories").value),
        protein_g: parseFloat(document.getElementById("preset-protein").value) || 0,
        carbs_g: parseFloat(document.getElementById("preset-carbs").value) || 0,
        fat_g: parseFloat(document.getElementById("preset-fat").value) || 0
      };
      await fetch("/api/presets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      presetModal.classList.add("hidden");
      showToast("Preset saved! 🔖", "success");
      loadPresets();
    };

    // Settings Modal Handlers
    const settingsModal = document.getElementById("settings-modal");
    document.getElementById("btn-open-settings").onclick = async () => {
      const res = await fetch("/api/settings");
      const s = await res.json();
      document.getElementById("setting-target").value = s.daily_calorie_target || 2000;
      document.getElementById("setting-protein").value = s.target_protein_g || 140;
      document.getElementById("setting-carbs").value = s.target_carbs_g || 200;
      document.getElementById("setting-fat").value = s.target_fat_g || 65;
      document.getElementById("setting-weight-goal").value = s.target_weight_kg || "";
      document.getElementById("setting-fasting-target").value = s.fasting_target_hours || 16;
      document.getElementById("setting-tz").value = s.timezone || "UTC";
      settingsModal.classList.remove("hidden");
    };
    document.getElementById("btn-close-settings").onclick = () => settingsModal.classList.add("hidden");
    document.getElementById("btn-cancel-settings").onclick = () => settingsModal.classList.add("hidden");

    document.getElementById("form-settings").onsubmit = async (e) => {
      e.preventDefault();
      const payload = {
        daily_calorie_target: parseInt(document.getElementById("setting-target").value) || null,
        target_protein_g: parseFloat(document.getElementById("setting-protein").value) || null,
        target_carbs_g: parseFloat(document.getElementById("setting-carbs").value) || null,
        target_fat_g: parseFloat(document.getElementById("setting-fat").value) || null,
        target_weight_kg: parseFloat(document.getElementById("setting-weight-goal").value) || null,
        fasting_target_hours: parseFloat(document.getElementById("setting-fasting-target").value) || 16.0,
        timezone: document.getElementById("setting-tz").value.trim() || "UTC",
      };
      await fetch("/api/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      settingsModal.classList.add("hidden");
      showToast("Targets & goals updated! 🎯", "success");
      loadData();
    };

    // Global ESC key listener to close modals
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape") {
        mealModal.classList.add("hidden");
        weightModal.classList.add("hidden");
        settingsModal.classList.add("hidden");
        presetModal.classList.add("hidden");
        document.getElementById("pwa-ios-modal").classList.add("hidden");
      }
    });

    // Sync button
    document.getElementById("btn-sync-pill").onclick = async () => {
      showToast("Syncing with Hermes Agent...", "info");
      await loadData();
      showToast("Data up to date! ⚡", "success");
    };

    // Toast Notifications
    function showToast(message, type = "success") {
      const container = document.getElementById("toast-container");
      const toast = document.createElement("div");
      toast.className = "pointer-events-auto px-4 py-2.5 rounded-2xl glass-card text-xs font-bold shadow-2xl flex items-center gap-2.5 animate-pop " +
        (type === "error" ? "border-rose-500/50 text-rose-300" : (type === "info" ? "border-sky-500/50 text-sky-300" : "border-emerald-500/50 text-emerald-300"));
      toast.innerHTML = (type === "error" ? "⚠️" : (type === "info" ? "ℹ️" : "✨")) + " " + message;
      container.appendChild(toast);
      setTimeout(() => {
        toast.style.opacity = "0";
        toast.style.transform = "translateY(8px)";
        toast.style.transition = "all 0.3s ease";
        setTimeout(() => toast.remove(), 300);
      }, 2600);
    }

    // Init App
    updateDateLabel();
    loadData();
  </script>
</body>
</html>
`;
