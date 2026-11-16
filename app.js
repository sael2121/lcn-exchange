// LCN · Liberty City National Exchange — shared code (header, wallet, data)

// The stocks listed on LCN. Add a line here to list a new company.
// snap = last known values, shown until live data arrives.
const STOCKS = [
  { ca: 'FYmetCGBfuepV6HbYkAmmPG28T9iN6qqpJPvydpzpump', name: 'Burger Shot', sym: 'BURGER', img: 'logos/burger.png', snap: { price: 0.000001994, mcap: 1994.05, chg: 0.02 } },
  { ca: 'DcFXfTjak5K2B66pBEc44t7YZhPvnvbKpYbsziTkpump', name: 'Ecola', sym: 'ECOLA', img: 'logos/ecola.png', snap: { price: 0.000001996, mcap: 1996.57, chg: 0.02 } },
  { ca: 'HA1M9YguVxgaPeGQu2xbBTWbnBLCz6KSeJuPtt71pump', name: 'Sprunk', sym: 'SPRUNK', img: 'logos/sprunk.png', snap: { price: 0.000001988, mcap: 1988.45, chg: 0.02 } },
  { ca: 'CyrA9aqXpLHrQHD2jpk1Nwv6mZxHWso7MVbL7vxmpump', name: 'Cluckin Bell', sym: 'CLUCK', img: 'logos/cluck.png', snap: { price: 0.000001988, mcap: 1988.45, chg: 0.02 } },
  { ca: 'AY7RSgpzECTordSvua9mcruVhS3GGaYknF1Nx3dPpump', name: 'Fleeca Bank', sym: 'FLEECA', img: 'logos/fleeca.png', snap: { price: 0.000001993, mcap: 1993.11, chg: 0 } },
  { ca: 'EgYvd9MGhe4uHYap55HwKDwHf1za7QAmGifVudRLpump', name: 'Ammu Nation', sym: 'AMMU', img: 'logos/ammu.png', snap: { price: 0.000001996, mcap: 1996.19, chg: 0 } },
  { ca: 'FowhkNQmvNr2J7CLg7RgDd59Wa4iXvhybbEXjW61pump', name: 'AudaCity', sym: 'AUDACITY', img: 'logos/audacity.png', snap: { price: 0.000001986, mcap: 1986.4, chg: 0 } },
  { ca: '3Bo1iDWPvcXWpGoHqNugNFj12WUDyWYf5jmAacunpump', name: 'NINE1NINE', sym: 'NINE1NINE', img: 'logos/nine1nine.png', snap: { price: 0.000001997, mcap: 1997.97, chg: 0.02 } },
  { ca: 'DJoV1RCnJa3XLLUiBnRZe6rm8Rwg8pr1mYPRU99Jpump', name: 'Only Raw Records', sym: 'ORR', img: 'logos/orr.png', snap: { price: 0.000001997, mcap: 1997.97, chg: 0.02 } }
];

const LCN = {
  live: {},
  liveAt: null,
  wallet: null,
  listeners: [],
  onUpdate(fn) { this.listeners.push(fn); },
  emit() { this.listeners.forEach((fn) => fn()); },
  data(st) { return this.live[st.ca] || st.snap; }
};

// ---------- formatting ----------
function fmtUsd(n) {
  if (n == null || isNaN(n)) return '—';
  if (n >= 1e9) return '$' + (n / 1e9).toFixed(2) + 'B';
  if (n >= 1e6) return '$' + (n / 1e6).toFixed(2) + 'M';
  if (n >= 1e3) return '$' + (n / 1e3).toFixed(2) + 'K';
  return '$' + n.toFixed(0);
}
function fmtPrice(n) {
  if (n == null || isNaN(n)) return '—';
  return '$' + (n < 0.01 ? n.toPrecision(4) : n.toFixed(4));
}
function fmtPct(n, signed) { return (signed && n >= 0 ? '+' : '') + n.toFixed(2) + '%'; }

// ---------- live prices (DexScreener, refreshed every 10 s) ----------
async function refreshPrices() {
  try {
    const res = await fetch('https://api.dexscreener.com/tokens/v1/solana/' + STOCKS.map((s) => s.ca).join(','));
    if (!res.ok) return;
    const pairs = await res.json();
    const live = {};
    pairs.forEach((p) => {
      const ca = p.baseToken && p.baseToken.address;
      if (!ca) return;
      const liq = (p.liquidity && p.liquidity.usd) || 0;
      if (!live[ca] || liq > live[ca].liq) {
        live[ca] = { price: parseFloat(p.priceUsd), mcap: p.marketCap || p.fdv, chg: (p.priceChange && p.priceChange.h24) || 0, liq };
      }
    });
    LCN.live = live;
    LCN.liveAt = new Date();
    LCN.emit();
  } catch (e) { /* keep last values */ }
}

// ---------- wallet (Phantom) ----------
function phantom() {
  const p = (window.phantom && window.phantom.solana) || window.solana;
  return p && p.isPhantom ? p : null;
}
function shortAddr(a) { return a.slice(0, 4) + '…' + a.slice(-4); }
async function toggleWallet() {
  const provider = phantom();
  if (LCN.wallet) {
    try { if (provider) await provider.disconnect(); } catch (e) {}
    LCN.wallet = null;
    LCN.emit();
    return;
  }
  if (!provider) { document.getElementById('wallet-modal').classList.remove('hidden'); return; }
  try {
    const res = await provider.connect();
    LCN.wallet = res.publicKey.toString();
    LCN.emit();
  } catch (e) {}
}
async function silentReconnect() {
  const provider = phantom();
  if (!provider) return;
  try {
    const res = await provider.connect({ onlyIfTrusted: true });
    LCN.wallet = res.publicKey.toString();
    LCN.emit();
  } catch (e) {}
}

// ---------- shared layout ----------
const WALLET_ICON = '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20 7H5a2 2 0 0 1 0-4h13v4"/><path d="M3 5v14a2 2 0 0 0 2 2h15V7"/><circle cx="16" cy="14" r="1.5"/></svg>';

function renderChrome(active) {
  const tab = (href, label, key, last) =>
    `<a href="${href}" class="${key === active ? 'active' : ''}"${last ? ' style="border-right:none"' : ''}>${label}</a>`;
  document.getElementById('chrome-top').innerHTML = `
    <header class="header">
      <a href="index.html" class="brand">
        <div class="brand-mark arch">LCN<svg width="150" height="60" viewBox="0 0 150 60" fill="none" aria-hidden="true"><path d="M2 46 L30 20 L52 38 L78 10 L102 30 L146 4" stroke="#2b55d6" stroke-width="7" stroke-linejoin="round"/><path d="M2 46 L30 20 L52 38 L78 10 L102 30 L146 4" stroke="#ffffff" stroke-width="2.5" stroke-linejoin="round"/></svg></div>
        <div class="brand-text"><span class="brand-title arch">LIBERTY CITY NATIONAL</span><span class="brand-sub">EXCHANGE</span></div>
      </a>
      <button type="button" class="wallet-btn" data-wallet>${WALLET_ICON}<span data-wallet-label>Connect wallet</span></button>
    </header>
    <nav class="nav">
      ${tab('index.html', 'Markets', 'markets')}
      ${tab('portfolio.html', 'Portfolio', 'portfolio')}
      ${tab('how-it-works.html', 'How it works', 'how', true)}
      <div class="nav-brand arch">LCN</div>
    </nav>`;
  document.getElementById('chrome-bottom').innerHTML = `
    <footer>
      <span>LCN · Liberty City National Exchange — fan-made stock exchange on Solana. Payments are real SOL and final. Nothing here is financial advice.</span>
      <span style="color:#fff">X · Telegram</span>
    </footer>
    <div class="modal hidden" id="wallet-modal">
      <div class="modal-box" role="dialog" aria-modal="true" aria-labelledby="wm-title">
        <div class="modal-head"><span class="arch" id="wm-title">CONNECT WALLET</span>
          <button type="button" aria-label="Close" data-close-modal><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" aria-hidden="true"><path d="M5 5l14 14M19 5 5 19"/></svg></button></div>
        <div class="modal-body">
          <p style="margin:0;font-size:16px;line-height:1.5">Phantom wasn't detected in this browser. Install the Phantom extension, then click <b>Connect wallet</b> again.</p>
          <a href="https://phantom.app/download" target="_blank" rel="noopener">Get Phantom</a>
        </div>
      </div>
    </div>`;
  document.addEventListener('click', (e) => {
    if (e.target.closest('[data-wallet]')) toggleWallet();
    if (e.target.closest('[data-close-modal]') || e.target.id === 'wallet-modal') document.getElementById('wallet-modal').classList.add('hidden');
  });
  const paintWallet = () => document.querySelectorAll('[data-wallet-label]').forEach((el) => { el.textContent = LCN.wallet ? shortAddr(LCN.wallet) : 'Connect wallet'; });
  LCN.onUpdate(paintWallet);
  paintWallet();
  silentReconnect();
}
