import { initializeApp } from "firebase/app";
import { getFirestore, doc, getDoc, setDoc, deleteDoc } from "firebase/firestore";

// Your web app's Firebase configuration (from Firebase Console > Project settings)
const firebaseConfig = {
  apiKey: "AIzaSyDC0NThlSGHHeYmAqxVgiRA1Q8nB61iI2o",
  authDomain: "wifi-home-722cd.firebaseapp.com",
  databaseURL: "https://wifi-home-722cd-default-rtdb.firebaseio.com",
  projectId: "wifi-home-722cd",
  storageBucket: "wifi-home-722cd.firebasestorage.app",
  messagingSenderId: "452512589725",
  appId: "1:452512589725:web:23a0c9d9be4826b968f174",
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// Exported so auth.js and reviews.js can reuse the same Firebase app/db
// instead of each initializing their own connection.
export { app, db };


// Every key (products_0, products_meta, orders, banners, categories, ...)
// is stored as its own document in a single "app_data" collection, with the
// JSON string in a "value" field. This keeps the exact same get/set/delete
// shape the app already uses (window.storage), so nothing else in App.jsx
// has to change — only the import at the top swaps over to this file.
export const storage = {
  async get(key) {
    const snap = await getDoc(doc(db, "app_data", key));
    if (!snap.exists()) return null;
    const data = snap.data();
    return { key, value: data.value, shared: true };
  },

  async set(key, value) {
    await setDoc(doc(db, "app_data", key), { value });
    return { key, value, shared: true };
  },

  async delete(key) {
    await deleteDoc(doc(db, "app_data", key));
    return { key, deleted: true, shared: true };
  },
};function ProductCard({ p, onOpen, onAdd }) {
  const hasDiscount = p.discount && p.discount > 0 && p.discount < p.price;
  const discountPct = hasDiscount ? Math.round(((p.price - p.discount) / p.price) * 100) : 0;
  const firstColorImg = p.colorImages && Object.values(p.colorImages)[0];
  const imgSrc = (p.images && p.images.length > 0) ? p.images[0] : (firstColorImg || `https://picsum.photos/seed/${p.seed || p.id}/400/500`);
  const outOfStock = p.inStock === false;
  return (
    <div className="rounded-2xl overflow-hidden shadow-sm relative" style={{ background: PALETTE.card }}>
      <div className="aspect-[4/5] overflow-hidden cursor-pointer relative" onClick={() => onOpen(p)}>
        <img src={imgSrc} alt={p.title} className="w-full h-full object-cover" style={outOfStock ? { filter: "grayscale(60%)", opacity: 0.7 } : undefined} />
        {outOfStock && (
          <span className="absolute top-2 left-2 text-[10px] font-semibold px-2 py-0.5 rounded-full" style={{ background: "#C0392B", color: "#fff" }}>
            স্টক নেই
          </span>
        )}
        {!outOfStock && hasDiscount && (
          <span className="absolute top-2 right-2 text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ background: PALETTE.orange, color: "#fff" }}>
            {discountPct}% ছাড়
          </span>
        )}
        {!outOfStock && p.codEnabled === false && (
          <span className="absolute bottom-2 left-2 text-[10px] font-semibold px-2 py-0.5 rounded-full" style={{ background: "#E2136E", color: "#fff" }}>
            শুধু বিকাশ পেমেন্ট
          </span>
        )}
      </div>
      <div className="p-3">
        <h3 className="font-semibold text-[14px] leading-snug cursor-pointer" onClick={() => onOpen(p)}>{p.title}</h3>
        <div className="mt-1 flex items-center gap-2">
          <span className="font-bold text-sm" style={{ color: PALETTE.blue }}>
            <Taka amount={hasDiscount ? p.discount : p.price} />
          </span>
          {hasDiscount && (
            <span className="text-xs line-through" style={{ color: "#A9B8C5" }}>
              <Taka amount={p.price} />
            </span>
          )}
        </div>
        <button
          onClick={() => !outOfStock && onAdd(p)}
          disabled={outOfStock}
          className="mt-2 w-full text-xs font-semibold px-3 py-1.5 rounded-full"
          style={outOfStock ? { background: "#D8C9B8", color: "#7A6A58", cursor: "not-allowed" } : { background: PALETTE.blue, color: "#fff" }}
        >
          {outOfStock ? "স্টক নেই" : "কার্টে দিন"}
        </button>
      </div>
    </div>
  );
}

// Products are stored across multiple keys ("products_0", "products_1", ...)
// instead of one single key, because each storage key has a size ceiling.
// This groups products into chunks that each stay safely under that ceiling,
// so the shop can keep adding products without hitting a hard wall.
const PRODUCT_CHUNK_MAX_BYTES = 3_800_000;
function splitProductsIntoChunks(products) {
  const chunks = [];
  let current = [];
  let currentSize = 2;
  for (const p of products) {
    const size = JSON.stringify(p).length + 1;
    if (currentSize + size > PRODUCT_CHUNK_MAX_BYTES && current.length > 0) {
      chunks.push(current);
      current = [];
      currentSize = 2;
    }
    current.push(p);
    currentSize += size;
  }
  chunks.push(current); // always at least one chunk, even if empty
  return chunks;
}

export default function App() {
  useEffect(() => {
    const link = document.createElement("link");
    link.href = "https://fonts.googleapis.com/css2?family=Baloo+Da+2:wght@600;700&family=Hind+Siliguri:wght@400;500;600&display=swap";
    link.rel = "stylesheet";
    document.head.appendChild(link);
    return () => document.head.removeChild(link);
  }, []);

  const [hash, navigate] = useHashRoute();
  const [products, setProducts] = useState(SEED_PRODUCTS);
  const [orders, setOrders] = useState([]);
  const [banners, setBanners] = useState([BANNER]);
  const [logo, setLogo] = useState(LOGO);
  const [user, setUser] = useState(null);
  const [authChecked, setAuthChecked] = useState(false);

  useEffect(() => {
    const unsubscribe = watchAuthState((u) => {
      setUser(u);
      setAuthChecked(true);
    });
    return () => unsubscribe();
  }, []);
  const [categories, setCategories] = useState(DEFAULT_CATEGORIES);
  const [promoPopup, setPromoPopup] = useState({ enabled: false, image: BANNER, category: "শীতের কালেকশন", text: "নতুন কালেকশন এসেছে! এখনই দেখো →" });
  const [promoPopupDismissed, setPromoPopupDismissed] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [cart, setCart] = useState({}); // key: productId|size|color -> {qty, size, color, id}
  const [cartOpen, setCartOpen] = useState(false);
  const [toast, setToast] = useState("");
  const productChunkCountRef = useRef(1);

  // load from shared storage
  useEffect(() => {
    (async () => {
      try {
        const metaRes = await storage.get("products_meta", true);
        if (metaRes && metaRes.value) {
          // New chunked format
          const meta = JSON.parse(metaRes.value);
          const count = meta.count || 1;
          let all = [];
          for (let i = 0; i < count; i++) {
            const cres = await storage.get(`products_${i}`, true);
            if (cres && cres.value) all = all.concat(JSON.parse(cres.value));
          }
          setProducts(all);
          productChunkCountRef.current = count;
        } else {
          // Old single-key format (or first run) — read it, then migrate.
          const res = await storage.get("products", true);
          if (res && res.value) {
            const old = JSON.parse(res.value);
            setProducts(old);
            const chunks = splitProductsIntoChunks(old);
            for (let i = 0; i < chunks.length; i++) {
              await storage.set(`products_${i}`, JSON.stringify(chunks[i]), true);
            }
            await storage.set("products_meta", JSON.stringify({ count: chunks.length }), true);
            productChunkCountRef.current = chunks.length;
          } else {
            setProducts(SEED_PRODUCTS);
            await storage.set("products_0", JSON.stringify(SEED_PRODUCTS), true);
            await storage.set("products_meta", JSON.stringify({ count: 1 }), true);
            productChunkCountRef.current = 1;
          }
        }
      } catch (e) {
        // IMPORTANT: if reading storage fails (network hiccup, temporary error,
        // etc.) we must NOT overwrite the real saved products with the seed
        // list — that would permanently wipe out everything the admin added.
        // Just keep showing the local SEED_PRODUCTS fallback in the UI and
        // try again next time the page loads; the shared storage itself is
        // left untouched.
      }
      try {
        const ores = await storage.get("orders", true);
        if (ores && ores.value) setOrders(JSON.parse(ores.value));
      } catch (e) {}
      try {
        const bres = await storage.get("banners", true);
        if (bres && bres.value) {
          const parsed = JSON.parse(bres.value);
          if (parsed && parsed.length > 0) setBanners(parsed);
        }
      } catch (e) {}
      try {
        const lres = await storage.get("logo", true);
        if (lres && lres.value) setLogo(lres.value);
      } catch (e) {}
      try {
        const cres = await storage.get("categories", true);
        if (cres && cres.value) {
          const parsed = JSON.parse(cres.value);
          if (parsed && parsed.length > 0) setCategories(parsed);
        } else {
          await storage.set("categories", JSON.stringify(DEFAULT_CATEGORIES), true);
        }
      } catch (e) {}
      setLoaded(true);
    })();
  }, []);

  const saveProducts = async (next) => {
    setProducts(next);
    const chunks = splitProductsIntoChunks(next);
    const oldCount = productChunkCountRef.current;
    try {
      for (let i = 0; i < chunks.length; i++) {
        await storage.set(`products_${i}`, JSON.stringify(chunks[i]), true);
      }
      await storage.set("products_meta", JSON.stringify({ count: chunks.length }), true);
      // Clean up any leftover chunk keys from before, if the list shrank.
      for (let i = chunks.length; i < oldCount; i++) {
        try { await storage.delete(`products_${i}`, true); } catch (_e) {}
      }
      productChunkCountRef.current = chunks.length;
    } catch (e) {
      alert("প্রোডাক্ট সেভ করা যায়নি! নেটওয়ার্ক সমস্যা হতে পারে। পেজ রিফ্রেশ করে আবার চেষ্টা করুন।");
    }
  };
  const saveOrders = async (next) => {
    setOrders(next);
    try { await storage.set("orders", JSON.stringify(next), true); } catch (e) {}
  };
  const saveBanners = async (next) => {
    setBanners(next);
    try { await storage.set("banners", JSON.stringify(next), true); } catch (e) {}
  };
  const saveLogo = async (url) => {
    setLogo(url);
    try { await storage.set("logo", url, true); } catch (e) {}
  };
  const saveCategories = async (next) => {
    setCategories(next);
    try { await storage.set("categories", JSON.stringify(next), true); } catch (e) {}
  };

  const showToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(""), 2000);
  };

  const addToCart = (p, size, color) => {
    if (p.inStock === false) {
      showToast("এই প্রোডাক্টটি এখন স্টকে নেই");
      return;
    }
    const key = `${p.id}|${size || p.sizes[0]}|${color || p.colors[0]}`;
    setCart((c) => ({
      ...c,
      [key]: { ...(c[key] || { id: p.id, size: size || p.sizes[0], color: color || p.colors[0], qty: 0 }), qty: (c[key]?.qty || 0) + 1 },
    }));
    showToast("কার্টে যোগ হয়েছে");
  };
  const changeQty = (key, delta) => {
    setCart((c) => {
      const next = { ...c };
      const item = next[key];
      if (!item) return c;
      const qty = Math.max(0, item.qty + delta);
      if (qty === 0) delete next[key];
      else next[key] = { ...item, qty };
      return next;
    });
  };

  const cartItems = useMemo(
    () =>
      Object.entries(cart).map(([key, v]) => {
        const p = products.find((x) => x.id === v.id);
        return p ? { key, ...v, product: p } : null;
      }).filter(Boolean),
    [cart, products]
  );
  const cartCount = cartItems.reduce((s, i) => s + i.qty, 0);
  const cartSubtotal = cartItems.reduce((s, i) => {
    const price = getVariantPrice(i.product, i.size, i.color);
    return s + price * i.qty;
  }, 0);

  const copyLink = (h) => {
    const url = window.location.origin + window.location.pathname + h;
    navigator.clipboard?.writeText(url).then(
      () => showToast("লিংক কপি হয়েছে"),
      () => showToast(url)
    );
  };

  // ---- routing ----
  const [pathOnly, queryStr] = hash.replace(/^#\/?/, "").split("?");
  const parts = pathOnly.split("/").filter(Boolean);
  const queryId = queryStr ? new URLSearchParams(queryStr).get("id") : null;

  let view = "home";
  let param = null;
  if (parts[0] === "category" && parts[1]) { view = "category"; param = decodeURIComponent(parts[1]); }
  else if (parts[0] === "product" && parts[1]) { view = "product"; param = parts[1]; }
  else if (parts[0] === "checkout") view = "checkout";
  else if (parts[0] === "order-done") { view = "done"; param = queryId; }
  else if (parts[0] === "admin") view = "admin";
  else if (parts[0] === "search") view = "search";
  else if (parts[0] === "track") { view = "track"; param = parts[1] ? decodeURIComponent(parts[1]) : queryId; }
  else if (parts[0] === "account") view = "account";

  if (!loaded) {
    return <div style={{ background: PALETTE.bg, minHeight: "100vh" }} />;
  }

  return (
    <div style={{ background: PALETTE.bg, color: PALETTE.ink, minHeight: "100vh" }} className="font-[Hind_Siliguri]">
      {/* Header */}
      <header className="sticky top-0 z-30" style={{ background: PALETTE.card, borderBottom: `3px solid ${PALETTE.orange}` }}>
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2 cursor-pointer" onClick={() => navigate("#/")}>
            <img src={logo} alt="WiFi Home" className="w-10 h-10 object-contain" />
            <div>
              <h1 style={{ fontFamily: "'Baloo Da 2', sans-serif", color: PALETTE.blue }} className="text-lg font-bold leading-none">
                WiFi <span style={{ color: PALETTE.orange }}>Home</span>
              </h1>
              <p className="text-[9px] tracking-wide" style={{ color: PALETTE.muted }}>ঘরে বসে দ্রুতগতির নির্ভরযোগ্য ইন্টারনেট</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => navigate("#/account")} className="p-2 rounded-full" style={{ background: "#E4EEF8", color: PALETTE.blue }} title={user ? (user.displayName || "অ্যাকাউন্ট") : "লগইন করুন"}>
              <User size={18} />
            </button>
            <button onClick={() => navigate("#/track")} className="p-2 rounded-full" style={{ background: "#E4EEF8", color: PALETTE.blue }} title="অর্ডার ট্র্যাক করুন">
              <ClipboardList size={18} />
            </button>
            <button onClick={() => navigate("#/search")} className="p-2 rounded-full" style={{ background: "#E4EEF8", color: PALETTE.blue }} title="সার্চ">
              <Search size={18} />
            </button>
            <button onClick={() => setCartOpen(true)} className="relative flex items-center gap-2 px-3 py-2 rounded-full" style={{ background: PALETTE.orange, color: "#fff" }}>
              <ShoppingBag size={18} />
              {cartCount > 0 && (
                <span className="absolute -top-2 -right-2 text-xs w-5 h-5 rounded-full flex items-center justify-center font-bold" style={{ background: PALETTE.navy, color: "#fff" }}>
                  {cartCount}
                </span>
              )}
            </button>
          </div>
        </div>
      </header>

      {toast && (
        <div className="fixed top-16 left-1/2 -translate-x-1/2 z-50 px-4 py-2 rounded-full text-sm font-medium shadow-lg" style={{ background: PALETTE.navy, color: "#fff" }}>
          {toast}
        </div>
      )}

      {view === "home" && (
        <>
          <HomeView
            products={products}
            banners={banners}
            categories={categories}
            navigate={navigate}
            onAdd={(p) => addToCart(p, p.sizes[0], p.colors[0])}
            copyLink={copyLink}
          />
        </>
      )}

      {view === "category" && (
        <CategoryView category={param} products={products} navigate={navigate} onAdd={(p) => addToCart(p, p.sizes[0], p.colors[0])} copyLink={copyLink} />
      )}

      {view === "product" && (
        <ProductView productId={param} products={products} categories={categories} navigate={navigate} onAdd={addToCart} copyLink={copyLink} user={user} />
      )}

      {view === "checkout" && (
        <CheckoutView
          cartItems={cartItems}
          subtotal={cartSubtotal}
          navigate={navigate}
          onOrder={async (order) => {
            const next = [order, ...orders];
            await saveOrders(next);
            setCart({});
          }}
        />
      )}

      {view === "done" && <DoneView navigate={navigate} orders={orders} orderId={param} />}

      {view === "search" && (
        <SearchView products={products} navigate={navigate} onAdd={(p) => addToCart(p, p.sizes[0], p.colors[0])} />
      )}

      {view === "track" && (
        <TrackOrderView navigate={navigate} orders={orders} initialId={param} />
      )}

      {view === "account" && (
        <AccountView navigate={navigate} user={user} />
      )}

      {view === "admin" && (
        <AdminView products={products} orders={orders} banners={banners} logo={logo} categories={categories} promoPopup={promoPopup} setPromoPopup={setPromoPopup} saveProducts={saveProducts} saveOrders={saveOrders} saveBanners={saveBanners} saveLogo={saveLogo} saveCategories={saveCategories} navigate={navigate} copyLink={copyLink} />
      )}

      {/* Cart drawer */}
      {cartOpen && (
        <div className="fixed inset-0 z-40 flex justify-end">
          <div className="absolute inset-0 bg-black/40" onClick={() => setCartOpen(false)} />
          <div className="relative w-full max-w-sm h-full flex flex-col" style={{ background: PALETTE.bg }}>
            <div className="flex items-center justify-between p-5 border-b" style={{ borderColor: PALETTE.border, background: PALETTE.card }}>
              <h3 style={{ fontFamily: "'Baloo Da 2', sans-serif" }} className="font-bold text-lg">আপনার কার্ট</h3>
              <button onClick={() => setCartOpen(false)}><X size={20} /></button>
            </div>
            <div className="flex-1 overflow-y-auto p-5 space-y-4">
              {cartItems.length === 0 && <p className="text-sm text-center mt-10" style={{ color: "#8CA0B3" }}>কার্ট খালি — কিছু পছন্দ করুন</p>}
              {cartItems.map((i) => {
                const price = getVariantPrice(i.product, i.size, i.color);
                return (
                  <div key={i.key} className="flex gap-3">
                    <img src={i.product.images && i.product.images.length > 0 ? i.product.images[0] : `https://picsum.photos/seed/${i.product.seed || i.product.id}/100/120`} className="w-14 h-16 object-cover rounded-lg" alt={i.product.title} />
                    <div className="flex-1">
                      <p className="text-sm font-semibold">{i.product.title}</p>
                      <p className="text-[11px]" style={{ color: PALETTE.muted }}>{i.size} • {i.color}</p>
                      <p className="text-xs" style={{ color: PALETTE.orange }}><Taka amount={price} /></p>
                      <div className="flex items-center gap-2 mt-1">
                        <button onClick={() => changeQty(i.key, -1)} className="w-6 h-6 rounded-full border flex items-center justify-center" style={{ borderColor: PALETTE.border }}><Minus size={12} /></button>
                        <span className="text-sm w-4 text-center">{i.qty}</span>
                        <button onClick={() => changeQty(i.key, 1)} className="w-6 h-6 rounded-full border flex items-center justify-center" style={{ borderColor: PALETTE.border }}><Plus size={12} /></button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
            {cartItems.length > 0 && (
              <div className="p-5 border-t" style={{ borderColor: PALETTE.border, background: PALETTE.card }}>
                <div className="flex justify-between font-bold mb-3">
                  <span>সাবটোটাল</span>
                  <span style={{ color: PALETTE.orange }}><Taka amount={cartSubtotal} /></span>
                </div>
                <button
                  onClick={() => { setCartOpen(false); navigate("#/checkout"); }}
                  className="w-full py-3 rounded-full font-semibold"
                  style={{ background: PALETTE.orange, color: "#fff" }}
                >
                  অর্ডার করুন
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      <footer className="mt-6 py-6 text-center" style={{ background: PALETTE.navy, color: "#DCEBFA" }}>
        <div className="flex items-center justify-center gap-4 text-sm mb-2 flex-wrap px-4">
          <span className="flex items-center gap-1"><Facebook size={16} /> facebook.com/WifiHome</span>
          <span className="flex items-center gap-1"><MessageCircle size={16} /> 01835-528501</span>
        </div>
        <p className="text-xs opacity-70">© ২০২৬ WiFi Home — ঢাকার ভেতরে ডেলিভারি ৳৯০, বাইরে ৳১৩০</p>
      </footer>

      <a
        href={`https://wa.me/${WHATSAPP_NUMBER}`}
        target="_blank"
        rel="noopener noreferrer"
        className="fixed bottom-5 right-5 z-40 flex items-center justify-center rounded-full shadow-lg"
        style={{ width: 56, height: 56, background: "#25D366" }}
        title="WhatsApp-এ চ্যাট করুন"
      >
        <style>{`
          @keyframes wapulse {
            0% { box-shadow: 0 0 0 0 rgba(37,211,102,0.6); }
            70% { box-shadow: 0 0 0 12px rgba(37,211,102,0); }
            100% { box-shadow: 0 0 0 0 rgba(37,211,102,0); }
          }
          .wa-pulse { animation: wapulse 2.2s infinite; }
        `}</style>
        <span className="wa-pulse" style={{ position: "absolute", width: 56, height: 56, borderRadius: "50%" }} />
        <MessageCircle size={28} color="#fff" fill="#fff" />
      </a>
    </div>
  );
}

function PromoPopup({ promo, navigate, onDismiss }) {
  if (!promo.enabled) return null;
  
  return (
    <div className="fixed inset-0 flex items-center justify-center z-50" style={{ background: "rgba(0,0,0,0.6)" }}>
      <div className="relative w-80 rounded-xl overflow-hidden shadow-lg" style={{ background: PALETTE.card }}>
        <button
          onClick={onDismiss}
          className="absolute top-2 right-2 z-10 p-1 rounded-full hover:bg-gray-200"
          style={{ background: "rgba(255,255,255,0.8)" }}
        >
          <X size={20} style={{ color: PALETTE.ink }} />
        </button>
        <img src={promo.image} alt="Promo" className="w-full h-48 object-cover" />
        <div className="p-4">
          <p className="text-sm mb-3" style={{ color: PALETTE.muted }}>{promo.text}</p>
          <button
            onClick={() => {
              navigate(`#/category/${slugify(promo.category)}`);
              onDismiss();
            }}
            className="w-full py-2 px-4 rounded-full font-semibold text-white"
            style={{ background: PALETTE.blue }}
          >
            দেখো
          </button>
        </div>
      </div>
    </div>
  );
}

function InfiniteCategoryStrip({ products, categories, navigate }) {
  const [items, setItems] = useState(categories);
  const pausedRef = useRef(false);
  const [phase, setPhase] = useState(0); // 0 = resting, 1 = sliding forward, -1 = sliding backward
  const [instantJump, setInstantJump] = useState(false);
  const dragStartX = useRef(null);
  const draggingRef = useRef(false);

  const CARD_WIDTH = 76;
  const GAP = 16; // matches gap-4
  const STEP = CARD_WIDTH + GAP;

  // keep in sync if the admin adds/removes categories
  useEffect(() => { setItems(categories); }, [categories]);

  const stepForward = () => {
    if (items.length < 2) return;
    setInstantJump(false);
    setPhase(1);
  };
  const stepBackward = () => {
    if (items.length < 2) return;
    setInstantJump(false);
    setPhase(-1);
  };

  useEffect(() => {
    if (items.length === 0) return;
    const timer = setInterval(() => {
      if (pausedRef.current) return;
      stepForward();
    }, 3000);
    return () => clearInterval(timer);
  }, [items.length]);

  useEffect(() => {
    if (phase === 0) return;
    // after the slide animation finishes, actually move the item that just
    // scrolled off into its new position in the line and snap back with no
    // transition — so there's never a visible "end of the list" moment
    const t = setTimeout(() => {
      setInstantJump(true);
      setItems((prev) => {
        if (prev.length < 2) return prev;
        return phase === 1 ? [...prev.slice(1), prev[0]] : [prev[prev.length - 1], ...prev.slice(0, -1)];
      });
      setPhase(0);
    }, 400);
    return () => clearTimeout(t);
  }, [phase]);

  const pause = () => { pausedRef.current = true; };
  const resume = () => { pausedRef.current = false; };

  const onTouchStart = (e) => {
    pause();
    draggingRef.current = true;
    dragStartX.current = e.touches[0].clientX;
  };
  const onTouchEnd = (e) => {
    if (draggingRef.current && dragStartX.current !== null) {
      const delta = e.changedTouches[0].clientX - dragStartX.current;
      if (delta < -30) stepForward();
      else if (delta > 30) stepBackward();
    }
    draggingRef.current = false;
    dragStartX.current = null;
    resume();
  };

  // render one clone of the last item before the real list, and one clone
  // of the first item after it — swiping either direction always reveals
  // something that looks like a real neighboring card
  const extended = items.length > 0 ? [items[items.length - 1], ...items, items[0]] : items;
  const restingIndex = 1;
  const targetIndex = restingIndex + phase;

  return (
    <div
      className="py-4 overflow-hidden"
      style={{ background: PALETTE.card }}
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
      onMouseDown={pause}
      onMouseUp={resume}
      onMouseLeave={resume}
    >
      <div
        className="flex gap-4"
        style={{
          transform: `translateX(-${targetIndex * STEP}px)`,
          transition: instantJump ? "none" : "transform 0.4s ease",
        }}
      >
        {extended.map((cat, i) => {
          const count = products.filter((p) => productCats(p).includes(cat.name)).length;
          const isActive = i === restingIndex;
          return (
            <button
              key={cat.name + i}
              onClick={() => navigate(`#/category/${slugify(cat.name)}`)}
              className="flex flex-col items-center gap-1.5 flex-shrink-0"
              style={{ width: CARD_WIDTH }}
            >
              <div
                className="w-16 h-16 rounded-xl flex items-center justify-center text-2xl shadow-sm overflow-hidden"
                style={{
                  background: cat.color ? `${cat.color}33` : PALETTE.orangeSoft,
                  border: isActive ? "2px solid #E53935" : "2px solid transparent",
                  transition: instantJump ? "none" : "border-color 0.3s ease",
                }}
              >
                {cat.image ? (
                  <img src={cat.image} alt={cat.name} className="w-full h-full object-cover" />
                ) : (
                  cat.icon || "🛍️"
                )}
              </div>
              <span className="text-[11px] text-center leading-tight" style={{ color: PALETTE.ink }}>
                {cat.name}
              </span>
              <span className="text-[10px]" style={{ color: PALETTE.muted }}>
                ({count})
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function BannerCarousel({ banners }) {
  const [idx, setIdx] = useState(0);
  useEffect(() => {
    setIdx(0);
  }, [banners]);
  useEffect(() => {
    if (banners.length <= 1) return;
    const t = setInterval(() => {
      setIdx((i) => (i + 1) % banners.length);
    }, 4000);
    return () => clearInterval(t);
  }, [banners.length]);
  return (
    <section className="relative overflow-hidden" style={{ aspectRatio: "1280/533" }}>
      <style>{`
        @keyframes bannerzoom {
          0% { transform: scale(1); }
          50% { transform: scale(1.08); }
          100% { transform: scale(1); }
        }
        .banner-zoom-img {
          animation: bannerzoom 8s ease-in-out infinite;
        }
        .banner-fade {
          transition: opacity 0.8s ease-in-out;
        }
      `}</style>
      {banners.map((src, i) => (
        <img
          key={i}
          src={src}
          alt="WiFi Home Banner"
          className="w-full h-full object-cover absolute inset-0 banner-fade banner-zoom-img"
          style={{ opacity: i === idx ? 1 : 0 }}
        />
      ))}
    </section>
  );
}

function SearchView({ products, navigate, onAdd }) {
  const [query, setQuery] = useState("");
  const [minPrice, setMinPrice] = useState("");
  const [maxPrice, setMaxPrice] = useState("");
  const q = query.trim().toLowerCase();
  const min = minPrice ? Number(minPrice) : null;
  const max = maxPrice ? Number(maxPrice) : null;
  const hasFilter = q !== "" || min !== null || max !== null;

  const results = hasFilter
    ? products.filter((p) => {
        const matchesText =
          q === "" ||
          p.title.toLowerCase().includes(q) ||
          productCats(p).some((c) => c.toLowerCase().includes(q)) ||
          (p.desc && p.desc.toLowerCase().includes(q));
        const price = p.discount && p.discount > 0 && p.discount < p.price ? p.discount : p.price;
        const matchesMin = min === null || price >= min;
        const matchesMax = max === null || price <= max;
        return matchesText && matchesMin && matchesMax;
      })
    : [];

  return (
    <div className="max-w-5xl mx-auto px-4 py-6">
      <button onClick={() => navigate("#/")} className="flex items-center gap-1 text-sm mb-4 font-medium" style={{ color: PALETTE.blue }}>
        <ArrowLeft size={16} /> হোমে ফিরে যান
      </button>
      <div className="relative mb-3">
        <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2" color={PALETTE.muted} />
        <input
          autoFocus
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="প্রোডাক্টের নাম বা ক্যাটাগরি লিখে সার্চ করো..."
          className="w-full pl-10 pr-4 py-3 rounded-full border text-sm"
          style={{ borderColor: PALETTE.border, background: PALETTE.card }}
        />
      </div>
      <div className="flex items-center gap-2 mb-5">
        <input
          type="number"
          value={minPrice}
          onChange={(e) => setMinPrice(e.target.value)}
          placeholder="সর্বনিম্ন দাম ৳"
          className="flex-1 px-3 py-2 rounded-full border text-sm"
          style={{ borderColor: PALETTE.border, background: PALETTE.card }}
        />
        <span style={{ color: PALETTE.muted }}>—</span>
        <input
          type="number"
          value={maxPrice}
          onChange={(e) => setMaxPrice(e.target.value)}
          placeholder="সর্বোচ্চ দাম ৳"
          className="flex-1 px-3 py-2 rounded-full border text-sm"
          style={{ borderColor: PALETTE.border, background: PALETTE.card }}
        />
      </div>

      {!hasFilter && (
        <p className="text-sm text-center mt-10" style={{ color: PALETTE.muted }}>যা খুঁজছো তা টাইপ করো, অথবা দামের সীমা দাও — যেমন: শাড়ি, পাঞ্জাবি, ইলেকট্রনিক্স</p>
      )}
      {hasFilter && results.length === 0 && (
        <p className="text-sm text-center mt-10" style={{ color: PALETTE.muted }}>এই শর্তে কিছু পাওয়া যায়নি</p>
      )}
      {results.length > 0 && (
        <>
          <p className="text-xs mb-3" style={{ color: PALETTE.muted }}>{results.length}টা প্রোডাক্ট পাওয়া গেছে</p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {results.map((p) => (
              <ProductCard key={p.id} p={p} onOpen={(pp) => navigate(`#/product/${pp.id}`)} onAdd={onAdd} />
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function HomeView({ products, banners, categories, navigate, onAdd, copyLink }) {
  return (
    <>
      <BannerCarousel banners={banners && banners.length > 0 ? banners : [BANNER]} />

      <InfiniteCategoryStrip products={products} categories={categories} navigate={navigate} />

      <div className="max-w-5xl mx-auto px-4 py-6">
        {categories.map((cat) => {
          const items = products.filter((p) => productCats(p).includes(cat.name));
          if (items.length === 0 && !cat.image) return null;
          return (
            <div key={cat.name} className="mb-9">
              {cat.image ? (
                <button
                  onClick={() => navigate(`#/category/${slugify(cat.name)}`)}
                  className="w-full block mb-3 rounded-2xl overflow-hidden relative"
                  style={{ height: 128 }}
                >
                  <img src={cat.image} alt={cat.name} className="w-full h-full object-cover" />
                  <div
                    className="absolute inset-0 flex items-end p-3"
                    style={{ background: "linear-gradient(180deg, transparent 40%, rgba(0,0,0,0.6))" }}
                  >
                    <span style={{ fontFamily: "'Baloo Da 2', sans-serif" }} className="text-white font-bold text-lg text-left">
                      {cat.name} <span className="text-sm font-normal opacity-90">({items.length})</span>
                    </span>
                  </div>
                </button>
              ) : (
                <div className="flex items-center justify-between mb-3">
                  <h3 style={{ fontFamily: "'Baloo Da 2', sans-serif", color: cat.color || PALETTE.navy }} className="text-xl font-bold">
                    {cat.name} <span className="text-sm font-normal" style={{ color: PALETTE.muted }}>({items.length})</span>
                  </h3>
                  <button onClick={() => copyLink(`#/category/${slugify(cat.name)}`)} className="text-xs flex items-center gap-1" style={{ color: PALETTE.blue }}>
                    <Share2 size={13} /> শেয়ার
                  </button>
                </div>
              )}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {items.map((p) => (
                  <ProductCard key={p.id} p={p} onOpen={(pp) => navigate(`#/product/${pp.id}`)} onAdd={onAdd} />
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
}

function CategoryView({ category, products, navigate, onAdd, copyLink }) {
  const items = products.filter((p) => productCats(p).includes(category));
  return (
    <div className="max-w-5xl mx-auto px-4 py-6">
      <button onClick={() => navigate("#/")} className="flex items-center gap-1 text-sm mb-4 font-medium" style={{ color: PALETTE.blue }}>
        <ArrowLeft size={16} /> হোমে ফিরে যান
      </button>
      <div className="flex items-center justify-between mb-4">
        <h2 style={{ fontFamily: "'Baloo Da 2', sans-serif" }} className="text-xl font-bold">{category} <span className="text-sm font-normal" style={{ color: PALETTE.muted }}>({items.length})</span></h2>
        <button onClick={() => copyLink(`#/category/${slugify(category)}`)} className="text-xs flex items-center gap-1 px-3 py-1.5 rounded-full" style={{ background: PALETTE.orangeSoft, color: PALETTE.orange }}>
          <Copy size={13} /> লিংক কপি করুন
        </button>
      </div>
      {items.length === 0 ? (
        <p className="text-sm" style={{ color: PALETTE.muted }}>এই ক্যাটাগরিতে এখনো কোনো প্রোডাক্ট নেই।</p>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {items.map((p) => (
            <ProductCard key={p.id} p={p} onOpen={(pp) => navigate(`#/product/${pp.id}`)} onAdd={onAdd} />
          ))}
        </div>
      )}
    </div>
  );
}

function StarRating({ value, size = 16, interactive = false, onChange }) {
  const stars = [1, 2, 3, 4, 5];
  return (
    <div className="flex items-center gap-0.5">
      {stars.map((n) => (
        <Star
          key={n}
          size={size}
          onClick={interactive ? () => onChange(n) : undefined}
          style={interactive ? { cursor: "pointer" } : undefined}
          fill={n <= Math.round(value) ? "#F5A623" : "none"}
          color={n <= Math.round(value) ? "#F5A623" : "#C9D3DC"}
        />
      ))}
    </div>
  );
}

function ImageCarousel({ images, title, jumpTo }) {
  const [idx, setIdx] = useState(0);
  const touchStartX = useRef(null);
  const touchDeltaX = useRef(0);

  useEffect(() => {
    setIdx(0);
  }, [images]);

  // When the selected color has its own photo, jump the gallery to it and
  // hold there — no auto-slide while a color's photo is being shown. The
  // person can still swipe/click through the rest of the gallery by hand.
  useEffect(() => {
    if (jumpTo) {
      const i = images.indexOf(jumpTo);
      if (i !== -1) setIdx(i);
    }
  }, [jumpTo, images]);

  useEffect(() => {
    if (images.length <= 1) return;
    if (jumpTo) return;
    const t = setInterval(() => {
      setIdx((i) => (i + 1) % images.length);
    }, 3000);
    return () => clearInterval(t);
  }, [images.length, jumpTo]);

  const next = () => setIdx((i) => (i + 1) % images.length);
  const prev = () => setIdx((i) => (i - 1 + images.length) % images.length);

  const onTouchStart = (e) => {
    touchStartX.current = e.touches[0].clientX;
    touchDeltaX.current = 0;
  };
  const onTouchMove = (e) => {
    if (touchStartX.current === null) return;
    touchDeltaX.current = e.touches[0].clientX - touchStartX.current;
  };
  const onTouchEnd = () => {
    if (Math.abs(touchDeltaX.current) > 40) {
      if (touchDeltaX.current < 0) next();
      else prev();
    }
    touchStartX.current = null;
    touchDeltaX.current = 0;
  };

  return (
    <div className="mb-4">
      <div
        className="rounded-2xl overflow-hidden relative"
        style={{ background: PALETTE.card, touchAction: "pan-y" }}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
      >
        <img src={images[idx]} alt={title} className="w-full aspect-[4/5] object-cover select-none" draggable={false} />
      </div>
      {images.length > 1 && (
        <div className="flex justify-center gap-1.5 mt-2">
          {images.map((_, i) => (
            <button
              key={i}
              onClick={() => setIdx(i)}
              className="rounded-full transition-all"
              style={{
                width: i === idx ? 18 : 6,
                height: 6,
                background: i === idx ? PALETTE.orange : PALETTE.border,
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function ProductView({ productId, products, categories, navigate, onAdd, copyLink, user }) {
  const p = products.find((x) => x.id === productId);
  const [size, setSize] = useState(null);
  const [color, setColor] = useState(null);
  const [selectionError, setSelectionError] = useState("");
  if (!p) {
    return (
      <div className="max-w-lg mx-auto px-4 py-16 text-center">
        <p style={{ color: PALETTE.muted }}>প্রোডাক্টটি খুঁজে পাওয়া যায়নি।</p>
        <button onClick={() => navigate("#/")} className="mt-4 text-sm font-semibold" style={{ color: PALETTE.blue }}>হোমে ফিরে যান</button>
      </div>
    );
  }
  const generalImages = p.images && p.images.length > 0 ? p.images : (!p.colorImages || Object.keys(p.colorImages).length === 0 ? [`https://picsum.photos/seed/${p.seed || p.id}/500/600`] : []);
  // All uploaded photos — every color's photo plus the general gallery
  // photos — are shown together in one gallery, no matter which color is
  // currently selected. Duplicates (same URL used twice) are removed.
  const allColorImages = useMemo(
    () => (p.colorImages ? Object.values(p.colorImages) : []),
    [p.colorImages]
  );
  const images = useMemo(() => {
    const combined = [...generalImages, ...allColorImages];
    return combined.filter((img, i) => combined.indexOf(img) === i);
  }, [allColorImages, generalImages]);
  const colorImg = p.colorImages && p.colorImages[color];
  const pCats = productCats(p);
  const relatedProducts = products.filter((x) => x.id !== p.id && productCats(x).some((c) => pCats.includes(c))).slice(0, 8);
  const displayPrice = getVariantPrice(p, size, color);
  const originalPrice = getVariantOriginalPrice(p, size) + ((p.colorAdjust && p.colorAdjust[color]) || 0);
  const isDiscounted = originalPrice > displayPrice;
  const discountPct = isDiscounted ? Math.round(((originalPrice - displayPrice) / originalPrice) * 100) : 0;
  const youtubeId = getYoutubeId(p.videoUrl);
  const catInfo = categories && categories.find((c) => c.name === pCats[0]);
  const catColor = (catInfo && catInfo.color) || PALETTE.orange;

  // Reviews: approved ones for this product, loaded fresh whenever the
  // product changes. New submissions go to "pending" and don't show here
  // until an admin approves them from the admin panel.
  const [reviews, setReviews] = useState([]);
  const [reviewsLoading, setReviewsLoading] = useState(true);
  const [myRating, setMyRating] = useState(0);
  const [myComment, setMyComment] = useState("");
  const [reviewSubmitting, setReviewSubmitting] = useState(false);
  const [reviewMsg, setReviewMsg] = useState("");

  useEffect(() => {
    let cancelled = false;
    setReviewsLoading(true);
    getApprovedReviews(p.id)
      .then((list) => { if (!cancelled) setReviews(list); })
      .catch(() => {})
      .finally(() => { if (!cancelled) setReviewsLoading(false); });
    return () => { cancelled = true; };
  }, [p.id]);

  const avgRating = reviews.length > 0 ? reviews.reduce((s, r) => s + r.rating, 0) / reviews.length : 0;

  const handleSubmitReview = async () => {
    setReviewMsg("");
    if (myRating < 1) {
      setReviewMsg("কতো স্টার দিতে চাও সেটা সিলেক্ট করো");
      return;
    }
    setReviewSubmitting(true);
    try {
      await submitReview({
        productId: p.id,
        userId: user.uid,
        userName: user.displayName || user.email || "কাস্টমার",
        rating: myRating,
        comment: myComment.trim(),
      });
      setMyRating(0);
      setMyComment("");
      setReviewMsg("ধন্যবাদ! রিভিউটা এডমিন চেক করার পর দেখা যাবে।");
    } catch (e) {
      setReviewMsg("রিভিউ জমা দেওয়া যায়নি, আবার চেষ্টা করো।");
    }
    setReviewSubmitting(false);
  };

  return (
    <div className="max-w-lg mx-auto px-4 py-6">
      <button onClick={() => navigate("#/")} className="flex items-center gap-1 text-sm mb-4 font-medium" style={{ color: PALETTE.blue }}>
        <ArrowLeft size={16} /> হোমে ফিরে যান
      </button>

      <ImageCarousel images={images} title={p.title} jumpTo={colorImg} />

      <div className="flex flex-wrap gap-1.5">
        {pCats.map((cn) => {
          const ci = categories && categories.find((c) => c.name === cn);
          const cc = (ci && ci.color) || PALETTE.orange;
          return (
            <span key={cn} className="text-[11px] font-semibold px-2 py-0.5 rounded-full" style={{ background: `${cc}22`, color: cc }}>{cn}</span>
          );
        })}
      </div>
      <h2 style={{ fontFamily: "'Baloo Da 2', sans-serif" }} className="text-xl font-bold mt-2">{p.title}</h2>
      {!reviewsLoading && reviews.length > 0 && (
        <div className="flex items-center gap-1.5 mt-1">
          <StarRating value={avgRating} size={14} />
          <span className="text-xs font-semibold" style={{ color: PALETTE.muted }}>
            {avgRating.toFixed(1)} ({reviews.length}টি রিভিউ)
          </span>
        </div>
      )}
      <div className="mt-1 flex items-center gap-2">
        <span className="font-bold text-lg" style={{ color: PALETTE.blue }}><Taka amount={displayPrice} /></span>
        {isDiscounted && <span className="text-sm line-through" style={{ color: "#A9B8C5" }}><Taka amount={originalPrice} /></span>}
        {isDiscounted && (
          <span className="text-xs font-bold px-2 py-0.5 rounded-full" style={{ background: `${PALETTE.orange}22`, color: PALETTE.orange }}>
            {discountPct}% ছাড়
          </span>
        )}
      </div>

      <div className="mt-5">
        <p className="text-sm font-semibold mb-1">সাইজ</p>
        <div className="flex gap-2 flex-wrap">
          {p.sizes.map((s) => (
            <button key={s} onClick={() => { setSize(s); setSelectionError(""); }} className="px-3 py-1 rounded-full text-sm border" style={size === s ? { background: PALETTE.blue, color: "#fff", borderColor: PALETTE.blue } : { borderColor: PALETTE.border }}>
              {s}
            </button>
          ))}
        </div>
      </div>
      <div className="mt-3">
        <p className="text-sm font-semibold mb-1">কালার</p>
        <div className="flex gap-2 flex-wrap">
          {p.colors.map((c) => (
            <button key={c} onClick={() => { setColor(c); setSelectionError(""); }} className="px-3 py-1 rounded-full text-sm border" style={color === c ? { background: PALETTE.orange, color: "#fff", borderColor: PALETTE.orange } : { borderColor: PALETTE.border }}>
              {c}
            </button>
          ))}
        </div>
      </div>

      <div className="flex gap-2 mt-5">
        <button
          onClick={() => {
            if (p.inStock === false) return;
            if (p.sizes && p.sizes.length > 0 && !size) {
              setSelectionError("অর্ডার করার আগে সাইজ সিলেক্ট করুন");
              return;
            }
            if (p.colors && p.colors.length > 0 && !color) {
              setSelectionError("অর্ডার করার আগে কালার সিলেক্ট করুন");
              return;
            }
            setSelectionError("");
            onAdd(p, size, color);
          }}
          disabled={p.inStock === false}
          className="flex-1 py-3 rounded-full font-semibold"
          style={p.inStock === false ? { background: "#D8C9B8", color: "#7A6A58", cursor: "not-allowed" } : { background: PALETTE.card, color: PALETTE.orange, border: `2px solid ${PALETTE.orange}` }}
        >
          {p.inStock === false ? "স্টক নেই" : "কার্টে দিন"}
        </button>
        <button
          onClick={() => {
            if (p.inStock === false) return;
            if (p.sizes && p.sizes.length > 0 && !size) {
              setSelectionError("অর্ডার করার আগে সাইজ সিলেক্ট করুন");
              return;
            }
            if (p.colors && p.colors.length > 0 && !color) {
              setSelectionError("অর্ডার করার আগে কালার সিলেক্ট করুন");
              return;
            }
            setSelectionError("");
            onAdd(p, size, color);
            navigate("#/checkout");
          }}
          disabled={p.inStock === false}
          className="flex-1 py-3 rounded-full font-semibold"
          style={p.inStock === false ? { background: "#D8C9B8", color: "#7A6A58", cursor: "not-allowed" } : { background: PALETTE.orange, color: "#fff" }}
        >
          {p.inStock === false ? "স্টক নেই" : "এখনই কিনুন"}
        </button>
        <button onClick={() => copyLink(`#/product/${p.id}`)} className="px-4 rounded-full border flex items-center justify-center" style={{ borderColor: PALETTE.border }} title="লিংক শেয়ার করুন">
          <Share2 size={18} color={PALETTE.blue} />
        </button>
      </div>
      {selectionError && (
        <p className="text-xs mt-2 font-medium" style={{ color: "#E2136E" }}>
          {selectionError}
        </p>
      )}
      {p.codEnabled === false && (
        <p className="text-xs mt-2 font-medium" style={{ color: "#E2136E" }}>
          এই প্রোডাক্টে ক্যাশ অন ডেলিভারি নেই — শুধু বিকাশে পেমেন্ট করে অর্ডার করা যাবে।
        </p>
      )}

      {p.desc && (
        <div className="mt-7">
          <h3 style={{ fontFamily: "'Baloo Da 2', sans-serif" }} className="text-base font-bold mb-1">প্রোডাক্ট বিবরণ</h3>
          <p className="text-sm whitespace-pre-line" style={{ color: PALETTE.muted }}>{p.desc}</p>
        </div>
      )}

      {youtubeId && (
        <div className="mt-7">
          <h3 style={{ fontFamily: "'Baloo Da 2', sans-serif" }} className="text-base font-bold mb-2">প্রোডাক্ট ভিডিও</h3>
          <div className="rounded-2xl overflow-hidden" style={{ aspectRatio: "16/9" }}>
            <iframe
              src={`https://www.youtube.com/embed/${youtubeId}`}
              title="Product video"
              className="w-full h-full"
              frameBorder="0"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
          </div>
        </div>
      )}

      <div className="mt-9">
        <h3 style={{ fontFamily: "'Baloo Da 2', sans-serif" }} className="text-base font-bold mb-3">
          কাস্টমার রিভিউ {reviews.length > 0 && `(${reviews.length})`}
        </h3>

        {reviewsLoading && <p className="text-sm" style={{ color: PALETTE.muted }}>লোড হচ্ছে...</p>}
        {!reviewsLoading && reviews.length === 0 && (
          <p className="text-sm mb-4" style={{ color: PALETTE.muted }}>এখনো কোনো রিভিউ নেই — প্রথম রিভিউটা তুমিই দাও!</p>
        )}
        {!reviewsLoading && reviews.length > 0 && (
          <div className="space-y-3 mb-5">
            {reviews.map((r) => (
              <div key={r.id} className="rounded-xl p-3" style={{ background: PALETTE.card, border: `1px solid ${PALETTE.border}` }}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm font-semibold">{r.userName}</span>
                  <StarRating value={r.rating} size={13} />
                </div>
                {r.comment && <p className="text-sm" style={{ color: PALETTE.muted }}>{r.comment}</p>}
              </div>
            ))}
          </div>
        )}

        {user ? (
          <div className="rounded-xl p-4" style={{ background: PALETTE.card, border: `1px solid ${PALETTE.border}` }}>
            <p className="text-sm font-semibold mb-2">তোমার রিভিউ দাও</p>
            <div className="mb-2">
              <StarRating value={myRating} size={22} interactive onChange={setMyRating} />
            </div>
            <textarea
              value={myComment}
              onChange={(e) => setMyComment(e.target.value)}
              placeholder="প্রোডাক্টটা কেমন লাগলো লিখো (ঐচ্ছিক)"
              rows={3}
              className="w-full px-3 py-2 rounded-lg border text-sm mb-2"
              style={{ borderColor: PALETTE.border }}
            />
            {reviewMsg && <p className="text-xs mb-2 font-medium" style={{ color: PALETTE.orange }}>{reviewMsg}</p>}
            <button
              onClick={handleSubmitReview}
              disabled={reviewSubmitting}
              className="px-4 py-2 rounded-full text-sm font-semibold"
              style={{ background: PALETTE.blue, color: "#fff", opacity: reviewSubmitting ? 0.7 : 1 }}
            >
              {reviewSubmitting ? "জমা হচ্ছে..." : "রিভিউ জমা দাও"}
            </button>
          </div>
        ) : (
          <div className="rounded-xl p-4 text-sm text-center" style={{ background: "#E4EEF8", color: PALETTE.blue }}>
            রিভিউ দিতে হলে{" "}
            <button onClick={() => navigate("#/account")} className="font-semibold underline">
              লগইন করো
            </button>
          </div>
        )}
      </div>

      {relatedProducts.length > 0 && (
        <div className="mt-9">
          <h3 style={{ fontFamily: "'Baloo Da 2', sans-serif", color: PALETTE.navy }} className="text-lg font-bold mb-3">
            {pCats[0]}-এ আরও আছে
          </h3>
          <div className="grid grid-cols-2 gap-4">
            {relatedProducts.map((rp) => (
              <ProductCard key={rp.id} p={rp} onOpen={(pp) => navigate(`#/product/${pp.id}`)} onAdd={(pp) => onAdd(pp, pp.sizes[0], pp.colors[0])} />
            ))}
          </div>
        </div>
      )}

    </div>
  );
}

function CheckoutView({ cartItems, subtotal, navigate, onOrder }) {
  const [form, setForm] = useState({ name: "", phone: "", address: "", area: "dhaka", paymentMethod: "cod", trxId: "" });
  const [errors, setErrors] = useState({});
  const deliveryCharge = form.area === "dhaka" ? 90 : 130;
  const total = subtotal + deliveryCharge;

  // If any item in the cart has COD turned off by the admin, cash-on-delivery
  // isn't allowed for this order — the whole order has to go through bKash.
  const codBlockedItems = cartItems.filter((i) => i.product.codEnabled === false);
  const codAllowed = codBlockedItems.length === 0;

  useEffect(() => {
    if (!codAllowed && form.paymentMethod === "cod") {
      setForm((f) => ({ ...f, paymentMethod: "bkash" }));
    }
  }, [codAllowed]);

  const submit = async () => {
    const errs = {};
    if (!form.name.trim()) errs.name = "নাম লিখুন";
    if (!/^0\d{9,10}$/.test(form.phone.trim())) errs.phone = "সঠিক ফোন নম্বর দিন";
    if (!form.address.trim()) errs.address = "ঠিকানা লিখুন";
    if (form.paymentMethod === "bkash" && !form.trxId.trim()) errs.trxId = "পেমেন্টের পর পাওয়া ট্রানজেকশন আইডি লিখুন";
    if (form.paymentMethod === "cod" && !codAllowed) errs.paymentMethod = "এই প্রোডাক্টের জন্য ক্যাশ অন ডেলিভারি নেই, বিকাশে পেমেন্ট করো";
    setErrors(errs);
    if (Object.keys(errs).length) return;
    const orderId = "WH" + Math.floor(100000 + Math.random() * 900000);
    const order = {
      id: orderId,
      name: form.name,
      phone: form.phone,
      address: form.address,
      area: form.area,
      deliveryCharge,
      items: cartItems.map((i) => ({ title: i.product.title, size: i.size, color: i.color, qty: i.qty, price: getVariantPrice(i.product, i.size, i.color) })),
      subtotal,
      total,
      paymentMethod: form.paymentMethod,
      trxId: form.paymentMethod === "bkash" ? form.trxId.trim() : "",
      status: "পেন্ডিং",
      time: new Date().toISOString(),
    };
    await onOrder(order);
    sendOrderEmail(order);
    navigate(`#/order-done?id=${orderId}`);
    window.__lastOrder = order;
  };

  if (cartItems.length === 0) {
    return (
      <div className="max-w-lg mx-auto px-4 py-16 text-center">
        <p style={{ color: PALETTE.muted }}>কার্ট খালি।</p>
        <button onClick={() => navigate("#/")} className="mt-4 text-sm font-semibold" style={{ color: PALETTE.blue }}>শপিং করতে ফিরে যান</button>
      </div>
    );
  }

  return (
    <section className="max-w-lg mx-auto px-4 py-8">
      <button onClick={() => navigate("#/")} className="flex items-center gap-1 text-sm mb-4 font-medium" style={{ color: PALETTE.blue }}>
        <ArrowLeft size={16} /> শপে ফিরে যান
      </button>
      <h2 style={{ fontFamily: "'Baloo Da 2', sans-serif" }} className="text-xl font-bold mb-1">অর্ডার সম্পন্ন করুন</h2>
      <p className="text-sm mb-5" style={{ color: PALETTE.muted }}>ক্যাশ অন ডেলিভারি — ডেলিভারির সময় টাকা দেবেন</p>

      <div className="space-y-4">
        <div>
          <label className="text-sm font-medium">পুরো নাম</label>
          <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="w-full mt-1 px-3 py-2 rounded-lg border bg-white" style={{ borderColor: errors.name ? PALETTE.orange : PALETTE.border }} placeholder="যেমন: করিম হোসেন" />
          {errors.name && <p className="text-xs mt-1" style={{ color: PALETTE.orange }}>{errors.name}</p>}
        </div>
        <div>
          <label className="text-sm font-medium">ফোন নম্বর</label>
          <input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className="w-full mt-1 px-3 py-2 rounded-lg border bg-white" style={{ borderColor: errors.phone ? PALETTE.orange : PALETTE.border }} placeholder="01XXXXXXXXX" />
          {errors.phone && <p className="text-xs mt-1" style={{ color: PALETTE.orange }}>{errors.phone}</p>}
        </div>
        <div>
          <label className="text-sm font-medium">ডেলিভারি ঠিকানা</label>
          <textarea value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} className="w-full mt-1 px-3 py-2 rounded-lg border bg-white" style={{ borderColor: errors.address ? PALETTE.orange : PALETTE.border }} rows={3} placeholder="বাসা/রোড/এলাকা, শহর" />
          {errors.address && <p className="text-xs mt-1" style={{ color: PALETTE.orange }}>{errors.address}</p>}
        </div>
        <div>
          <label className="text-sm font-medium">ডেলিভারি এলাকা</label>
          <div className="flex gap-2 mt-1">
            <button onClick={() => setForm({ ...form, area: "dhaka" })} className="flex-1 py-2 rounded-lg border text-sm font-medium" style={form.area === "dhaka" ? { background: PALETTE.blue, color: "#fff", borderColor: PALETTE.blue } : { borderColor: PALETTE.border }}>
              ঢাকার ভেতরে (৳৯০)
            </button>
            <button onClick={() => setForm({ ...form, area: "outside" })} className="flex-1 py-2 rounded-lg border text-sm font-medium" style={form.area === "outside" ? { background: PALETTE.blue, color: "#fff", borderColor: PALETTE.blue } : { borderColor: PALETTE.border }}>
              ঢাকার বাইরে (৳১৩০)
            </button>
          </div>
        </div>

        <div>
          <label className="text-sm font-medium">পেমেন্ট মাধ্যম</label>
          <div className="flex gap-2 mt-1">
            <button
              onClick={() => codAllowed && setForm({ ...form, paymentMethod: "cod" })}
              disabled={!codAllowed}
              className="flex-1 py-2 rounded-lg border text-sm font-medium"
              style={
                !codAllowed
                  ? { background: "#EDEDED", color: "#A0A0A0", borderColor: PALETTE.border, cursor: "not-allowed" }
                  : form.paymentMethod === "cod"
                  ? { background: PALETTE.blue, color: "#fff", borderColor: PALETTE.blue }
                  : { borderColor: PALETTE.border }
              }
            >
              ক্যাশ অন ডেলিভারি
            </button>
            <button onClick={() => setForm({ ...form, paymentMethod: "bkash" })} className="flex-1 py-2 rounded-lg border text-sm font-medium" style={form.paymentMethod === "bkash" ? { background: "#E2136E", color: "#fff", borderColor: "#E2136E" } : { borderColor: PALETTE.border }}>
              বিকাশে পেমেন্ট
            </button>
          </div>
          {!codAllowed && (
            <p className="text-xs mt-1.5" style={{ color: PALETTE.orange }}>
              তোমার কার্টে থাকা {codBlockedItems.map((i) => `"${i.product.title}"`).join(", ")} প্রোডাক্টের জন্য ক্যাশ অন ডেলিভারি নেই — শুধু বিকাশে পেমেন্ট করে অর্ডার করা যাবে।
            </p>
          )}
        </div>

        {form.paymentMethod === "bkash" && (
          <div className="rounded-xl p-4" style={{ background: "#FDE8F1", border: "1px solid #F4B8D4" }}>
            <p className="text-sm font-semibold mb-2" style={{ color: "#E2136E" }}>বিকাশ দিয়ে পেমেন্ট করার নিয়ম</p>
            <ol className="text-xs space-y-1 mb-3" style={{ color: PALETTE.ink }}>
              <li>১. বিকাশ অ্যাপ খুলে <b>"Payment"</b> অপশনে যাও (Send Money না)</li>
              <li>২. মার্চেন্ট নম্বর দাও: <b>{BKASH_NUMBER}</b> (অথবা নিচের QR কোড স্ক্যান করো)</li>
              <li>৩. মোট টাকা (৳{total.toLocaleString("en-IN")}) পাঠাও</li>
              <li>৪. পেমেন্ট শেষে যেই ট্রানজেকশন আইডি (TrxID) পাবে, সেটা নিচে বসাও</li>
            </ol>
            <img src={BKASH_QR} alt="bKash QR" className="w-32 mx-auto rounded-lg mb-3" />
            <input
              value={form.trxId}
              onChange={(e) => setForm({ ...form, trxId: e.target.value })}
              className="w-full px-3 py-2 rounded-lg border bg-white text-sm"
              style={{ borderColor: errors.trxId ? PALETTE.orange : PALETTE.border }}
              placeholder="ট্রানজেকশন আইডি (TrxID) বসাও"
            />
            {errors.trxId && <p className="text-xs mt-1" style={{ color: PALETTE.orange }}>{errors.trxId}</p>}
          </div>
        )}

        <div className="rounded-xl p-4" style={{ background: PALETTE.orangeSoft }}>
          {cartItems.map((i) => {
            const price = getVariantPrice(i.product, i.size, i.color);
            return (
              <div key={i.key} className="flex justify-between text-sm py-1">
                <span>{i.product.title} ({i.size}/{i.color}) × {i.qty}</span>
                <span><Taka amount={price * i.qty} /></span>
              </div>
            );
          })}
          <div className="flex justify-between text-sm py-1" style={{ color: PALETTE.muted }}>
            <span>ডেলিভারি চার্জ</span>
            <span><Taka amount={deliveryCharge} /></span>
          </div>
          <div className="flex justify-between font-bold pt-2 mt-2 border-t" style={{ borderColor: "#F0CBA0" }}>
            <span>সর্বমোট</span>
            <span style={{ color: PALETTE.orange }}><Taka amount={total} /></span>
          </div>
        </div>

        <button onClick={submit} className="w-full py-3 rounded-full font-semibold" style={{ background: PALETTE.orange, color: "#fff" }}>
          অর্ডার কনফার্ম করুন
        </button>
      </div>
    </section>
  );
}

function DoneView({ navigate, orders, orderId }) {
  const order = (orderId && orders.find((o) => o.id === orderId)) || orders[0];
  return (
    <section className="max-w-md mx-auto px-4 py-20 text-center">
      <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-5" style={{ background: PALETTE.orange }}>
        <Check size={28} color="#fff" />
      </div>
      <h2 style={{ fontFamily: "'Baloo Da 2', sans-serif" }} className="text-2xl font-bold mb-2">ধন্যবাদ{order ? `, ${order.name}` : ""}!</h2>
      {order && (
        <>
          <p className="text-sm mb-1" style={{ color: PALETTE.muted }}>আপনার অর্ডার আইডি</p>
          <p className="font-bold text-lg mb-6" style={{ color: PALETTE.blue }}>{order.id}</p>
          <p className="text-sm mb-6" style={{ color: PALETTE.muted }}>
            {order.paymentMethod === "bkash"
              ? "আমরা আপনার বিকাশ পেমেন্ট যাচাই করে শীঘ্রই ফোন করে নিশ্চিত করবো।"
              : `আমরা শীঘ্রই ${order.phone} নম্বরে ফোন করে নিশ্চিত করবো।`}
          </p>
          <button onClick={() => navigate(`#/track/${order.id}`)} className="px-6 py-2.5 rounded-full font-semibold mb-3 block mx-auto" style={{ background: PALETTE.blue, color: "#fff" }}>
            অর্ডার ট্র্যাক করুন
          </button>
        </>
      )}
      <button onClick={() => navigate("#/")} className="px-6 py-2.5 rounded-full font-semibold" style={{ background: PALETTE.blue, color: "#fff" }}>
        আরও কেনাকাটা করুন
      </button>
    </section>
  );
}

function TrackOrderView({ navigate, orders, initialId }) {
  const [query, setQuery] = useState(initialId || "");
  const [searched, setSearched] = useState(!!initialId);

  const statusOptions = ["পেন্ডিং", "কনফার্ম হয়েছে", "ডেলিভারি হচ্ছে", "ডেলিভার হয়েছে", "বাতিল"];
  const statusColor = {
    "পেন্ডিং": PALETTE.orange,
    "কনফার্ম হয়েছে": PALETTE.blue,
    "ডেলিভারি হচ্ছে": PALETTE.navy,
    "ডেলিভার হয়েছে": "#1E8E5A",
    "বাতিল": "#C0392B",
  };
  const statusStep = { "পেন্ডিং": 0, "কনফার্ম হয়েছে": 1, "ডেলিভারি হচ্ছে": 2, "ডেলিভার হয়েছে": 3, "বাতিল": -1 };

  const found = searched ? orders.find((o) => o.id.trim().toLowerCase() === query.trim().toLowerCase()) : null;
  const status = found ? (found.status || "পেন্ডিং") : null;
  const step = status ? statusStep[status] : 0;

  return (
    <section className="max-w-md mx-auto px-4 py-10">
      <h2 style={{ fontFamily: "'Baloo Da 2', sans-serif" }} className="text-xl font-bold mb-4 text-center">অর্ডার ট্র্যাক করুন</h2>
      <div className="flex gap-2 mb-6">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && setSearched(true)}
          placeholder="অর্ডার আইডি দিন (যেমন: WH123456)"
          className="flex-1 px-3 py-2 rounded-lg border bg-white"
          style={{ borderColor: PALETTE.border }}
        />
        <button onClick={() => setSearched(true)} className="px-4 rounded-lg font-semibold text-sm" style={{ background: PALETTE.blue, color: "#fff" }}>
          খুঁজুন
        </button>
      </div>

      {searched && !found && (
        <p className="text-sm text-center" style={{ color: PALETTE.muted }}>এই আইডি দিয়ে কোনো অর্ডার পাওয়া যায়নি। আইডিটি আবার চেক করুন।</p>
      )}

      {found && (
        <div className="rounded-2xl p-4" style={{ background: PALETTE.card, border: `1px solid ${PALETTE.border}` }}>
          <div className="flex justify-between items-start mb-1">
            <p className="font-bold text-sm" style={{ color: PALETTE.blue }}>{found.id}</p>
            <p className="text-xs" style={{ color: PALETTE.muted }}>{new Date(found.time).toLocaleString("bn-BD")}</p>
          </div>
          <p className="text-sm mb-3">{found.name}</p>

          <div className="mb-4">
            <span className="text-xs font-bold px-3 py-1 rounded-full" style={{ background: statusColor[status] + "22", color: statusColor[status] }}>
              {status}
            </span>
          </div>

          {status !== "বাতিল" && (
            <div className="flex items-center mb-4">
              {statusOptions.slice(0, 4).map((s, i) => (
                <React.Fragment key={s}>
                  <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ background: i <= step ? PALETTE.blue : PALETTE.border }} />
                  {i < 3 && <div className="flex-1 h-0.5" style={{ background: i < step ? PALETTE.blue : PALETTE.border }} />}
                </React.Fragment>
              ))}
            </div>
          )}

          <div className="mt-2 text-xs">
            {found.items.map((it, idx) => (
              <div key={idx} className="flex justify-between">
                <span>{it.title} ({it.size}/{it.color}) × {it.qty}</span>
                <span><Taka amount={it.price * it.qty} /></span>
              </div>
            ))}
          </div>
          <div className="flex justify-between font-bold text-sm mt-2 pt-2 border-t" style={{ borderColor: PALETTE.border }}>
            <span>সর্বমোট</span>
            <span style={{ color: PALETTE.orange }}><Taka amount={found.total} /></span>
          </div>
        </div>
      )}

      <button onClick={() => navigate("#/")} className="mt-6 text-sm font-medium block mx-auto" style={{ color: PALETTE.blue }}>← শপে ফিরে যান</button>
    </section>
  );
}

function AccountView({ navigate, user }) {
  const [mode, setMode] = useState("login"); // "login" | "register"
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const friendlyError = (err) => {
    const code = err && err.code;
    if (code === "auth/email-already-in-use") return "এই ইমেইল দিয়ে আগেই অ্যাকাউন্ট আছে, লগইন করো";
    if (code === "auth/invalid-email") return "সঠিক ইমেইল দাও";
    if (code === "auth/weak-password") return "পাসওয়ার্ড কমপক্ষে ৬ ক্যারেক্টার হতে হবে";
    if (code === "auth/invalid-credential" || code === "auth/wrong-password" || code === "auth/user-not-found") return "ইমেইল অথবা পাসওয়ার্ড ভুল";
    return "কিছু একটা সমস্যা হয়েছে, আবার চেষ্টা করো";
  };

  const submit = async () => {
    setError("");
    if (!email.trim() || !password.trim()) {
      setError("ইমেইল আর পাসওয়ার্ড দাও");
      return;
    }
    setLoading(true);
    try {
      if (mode === "register") {
        await customerSignUp(name.trim(), email.trim(), password);
      } else {
        await customerSignIn(email.trim(), password);
      }
      navigate("#/");
    } catch (err) {
      setError(friendlyError(err));
    }
    setLoading(false);
  };

  if (user) {
    return (
      <section className="max-w-md mx-auto px-4 py-10">
        <div className="rounded-2xl p-6 text-center" style={{ background: PALETTE.card, border: `1px solid ${PALETTE.border}` }}>
          <div className="w-16 h-16 rounded-full mx-auto mb-3 flex items-center justify-center" style={{ background: "#E4EEF8" }}>
            <User size={28} color={PALETTE.blue} />
          </div>
          <p className="font-semibold text-lg">{user.displayName || "কাস্টমার"}</p>
          <p className="text-sm mb-5" style={{ color: PALETTE.muted }}>{user.email}</p>
          <button
            onClick={async () => { await customerSignOut(); navigate("#/"); }}
            className="w-full py-2.5 rounded-full font-semibold flex items-center justify-center gap-2"
            style={{ background: "#FCE4E4", color: "#C0392B" }}
          >
            <LogOut size={16} /> লগ-আউট করুন
          </button>
        </div>
        <button onClick={() => navigate("#/")} className="mt-6 text-sm font-medium block mx-auto" style={{ color: PALETTE.blue }}>← শপে ফিরে যান</button>
      </section>
    );
  }

  return (
    <section className="max-w-md mx-auto px-4 py-10">
      <div className="rounded-2xl p-6" style={{ background: PALETTE.card, border: `1px solid ${PALETTE.border}` }}>
        <div className="flex gap-2 mb-5">
          <button onClick={() => { setMode("login"); setError(""); }} className="flex-1 py-2 rounded-full text-sm font-semibold" style={mode === "login" ? { background: PALETTE.blue, color: "#fff" } : { border: `1px solid ${PALETTE.border}` }}>
            লগইন
          </button>
          <button onClick={() => { setMode("register"); setError(""); }} className="flex-1 py-2 rounded-full text-sm font-semibold" style={mode === "register" ? { background: PALETTE.blue, color: "#fff" } : { border: `1px solid ${PALETTE.border}` }}>
            রেজিস্টার
          </button>
        </div>

        {mode === "register" && (
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="তোমার নাম" className="w-full px-3 py-2 rounded-lg border mb-3" style={{ borderColor: PALETTE.border }} />
        )}
        <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="ইমেইল" type="email" className="w-full px-3 py-2 rounded-lg border mb-3" style={{ borderColor: PALETTE.border }} />
        <input value={password} onChange={(e) => setPassword(e.target.value)} placeholder="পাসওয়ার্ড" type="password" className="w-full px-3 py-2 rounded-lg border mb-3" style={{ borderColor: PALETTE.border }} />

        {error && <p className="text-xs mb-3 font-medium" style={{ color: "#C0392B" }}>{error}</p>}

        <button onClick={submit} disabled={loading} className="w-full py-2.5 rounded-full font-semibold" style={{ background: PALETTE.orange, color: "#fff", opacity: loading ? 0.7 : 1 }}>
          {loading ? "হচ্ছে..." : mode === "login" ? "লগইন করো" : "অ্যাকাউন্ট তৈরি করো"}
        </button>
      </div>
      <button onClick={() => navigate("#/")} className="mt-6 text-sm font-medium block mx-auto" style={{ color: PALETTE.blue }}>← শপে ফিরে যান</button>
    </section>
  );
}

function AdminView({ products, orders, banners, logo, categories, promoPopup, setPromoPopup, saveProducts, saveOrders, saveBanners, saveLogo, saveCategories, navigate, copyLink }) {
  const [authed, setAuthed] = useState(false);
  const [pass, setPass] = useState("");
  const [checking, setChecking] = useState(false);
  const [loginError, setLoginError] = useState(false);
  const [tab, setTab] = useState("products");
  const [pendingReviews, setPendingReviews] = useState([]);
  const [reviewsLoadingAdmin, setReviewsLoadingAdmin] = useState(true);

  useEffect(() => {
    if (!authed) return;
    setReviewsLoadingAdmin(true);
    getPendingReviews()
      .then(setPendingReviews)
      .catch(() => {})
      .finally(() => setReviewsLoadingAdmin(false));
  }, [authed]);

  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyForm());
  const [uploading, setUploading] = useState(false);
  const [colorImages, setColorImages] = useState({}); // { colorName: imageUrl }
  const [sizePriceForm, setSizePriceForm] = useState({}); // { sizeName: { price: "string", discount: "string" } }
  const [colorAdjustForm, setColorAdjustForm] = useState({}); // { colorName: "string number" }
  const [uploadingColor, setUploadingColor] = useState(null);
  const [uploadingBanner, setUploadingBanner] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [catForm, setCatForm] = useState({ name: "", icon: "", color: "#F5821F" });
  const [catEditing, setCatEditing] = useState(null);
  const [uploadingCatImage, setUploadingCatImage] = useState(false);

  function emptyForm() {
    return { title: "", cats: categories[0] ? [categories[0].name] : [], price: "", discount: "", sizes: "", colors: "", desc: "", images: "", videoUrl: "", inStock: true, codEnabled: true };
  }

  const toggleFormCat = (name) => {
    setForm((f) => {
      const has = f.cats.includes(name);
      const cats = has ? f.cats.filter((c) => c !== name) : [...f.cats, name];
      return { ...f, cats };
    });
  };

  const startEdit = (p) => {
    setEditing(p.id);
    setForm({ title: p.title, cats: productCats(p), price: p.price, discount: p.discount || "", sizes: p.sizes.join(", "), colors: p.colors.join(", "), desc: p.desc || "", images: (p.images || []).join(", "), videoUrl: p.videoUrl || "", inStock: p.inStock !== false, codEnabled: p.codEnabled !== false });
    // Restore color→image pairing for editing. New products store this in
    // p.colorImages directly. Old products (saved before this fix) may have
    // had their general images silently replaced by 1:1 color images — for
    // those, recover the pairing positionally so nothing is lost.
    if (p.colorImages && Object.keys(p.colorImages).length > 0) {
      setColorImages(p.colorImages);
    } else if (p.images && p.colors && p.images.length === p.colors.length && p.colors.length > 1) {
      const map = {};
      p.colors.forEach((c, i) => { map[c] = p.images[i]; });
      setColorImages(map);
    } else {
      setColorImages({});
    }
    setSizePriceForm(
      p.sizePricing
        ? Object.fromEntries(
            Object.entries(p.sizePricing).map(([k, v]) => [
              k,
              { price: v.price ? String(v.price) : "", discount: v.discount ? String(v.discount) : "" },
            ])
          )
        : {}
    );
    setColorAdjustForm(p.colorAdjust ? Object.fromEntries(Object.entries(p.colorAdjust).map(([k, v]) => [k, String(v)])) : {});
  };

  const resetForm = () => { setEditing(null); setForm(emptyForm()); setColorImages({}); setSizePriceForm({}); setColorAdjustForm({}); };

  const uploadOneFile = async (file) => {
    const body = new FormData();
    body.append("file", file);
    body.append("upload_preset", CLOUDINARY_UPLOAD_PRESET);
    const res = await fetch(`https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`, {
      method: "POST",
      body,
    });
    const data = await res.json();
    if (data && data.secure_url) return data.secure_url;
    throw new Error("upload failed");
  };

  const handleBannerUpload = async (e) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;
    setUploadingBanner(true);
    try {
      const urls = [];
      for (const file of files) {
        const url = await uploadOneFile(file);
        urls.push(url);
      }
      await saveBanners([...banners, ...urls]);
    } catch (err) {
      alert("ব্যানার আপলোড করা যায়নি, আবার চেষ্টা করো।");
    }
    setUploadingBanner(false);
    e.target.value = "";
  };

  const removeBanner = async (idx) => {
    const next = banners.filter((_, i) => i !== idx);
    await saveBanners(next);
  };

  const handleLogoUpload = async (e) => {
    const file = (e.target.files || [])[0];
    if (!file) return;
    setUploadingLogo(true);
    try {
      const url = await uploadOneFile(file);
      await saveLogo(url);
    } catch (err) {
      alert("লোগো আপলোড করা যায়নি, আবার চেষ্টা করো।");
    }
    setUploadingLogo(false);
    e.target.value = "";
  };

  const startCatEdit = (cat) => {
    setCatEditing(cat.name);
    setCatForm({ name: cat.name, icon: cat.icon || "", color: cat.color || "#F5821F" });
  };

  const resetCatForm = () => { setCatEditing(null); setCatForm({ name: "", icon: "", color: "#F5821F" }); };

  const submitCategory = async () => {
    if (!catForm.name.trim()) return;
    const existing = categories.find((c) => c.name === catEditing);
    const payload = { name: catForm.name.trim(), icon: catForm.icon.trim() || "🛍️", color: catForm.color || "#F5821F", image: existing ? existing.image : "" };
    let next;
    if (catEditing) next = categories.map((c) => (c.name === catEditing ? payload : c));
    else next = [...categories, payload];
    await saveCategories(next);
    resetCatForm();
  };

  const removeCategory = async (name) => {
    await saveCategories(categories.filter((c) => c.name !== name));
  };

  const handleCatImageUpload = async (name, file) => {
    if (!file) return;
    setUploadingCatImage(true);
    try {
      const url = await uploadOneFile(file);
      const next = categories.map((c) => (c.name === name ? { ...c, image: url } : c));
      await saveCategories(next);
    } catch (e) {
      alert("ছবি আপলোড করা যায়নি, আবার চেষ্টা করো।");
    }
    setUploadingCatImage(false);
  };

  const removeCatImage = async (name) => {
    const next = categories.map((c) => (c.name === name ? { ...c, image: "" } : c));
    await saveCategories(next);
  };

  const handleColorFileUpload = async (color, file) => {
    if (!file) return;
    setUploadingColor(color);
    try {
      const url = await uploadOneFile(file);
      setColorImages((m) => ({ ...m, [color]: url }));
    } catch (e) {
      alert("ছবি আপলোড করা যায়নি, আবার চেষ্টা করো।");
    }
    setUploadingColor(null);
  };

  const colorList = form.colors ? form.colors.split(",").map((s) => s.trim()).filter(Boolean) : [];
  const sizeList = form.sizes ? form.sizes.split(",").map((s) => s.trim()).filter(Boolean) : [];

  const handleFileUpload = async (e) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;
    setUploading(true);
    try {
      const uploadedUrls = [];
      for (const file of files) {
        const url = await uploadOneFile(file);
        uploadedUrls.push(url);
      }
      setForm((f) => {
        const existing = f.images ? f.images.split(",").map((s) => s.trim()).filter(Boolean) : [];
        return { ...f, images: [...existing, ...uploadedUrls].join(", ") };
      });
    } catch (err) {
      alert("ছবি আপলোড করা যায়নি, আবার চেষ্টা করো।");
    }
    setUploading(false);
    e.target.value = "";
  };

  const submit = async () => {
    if (!form.title.trim() || !form.price || form.cats.length === 0) return;
    // Warn if a product with the same name already exists, so the same
    // item doesn't accidentally get uploaded twice.
    if (!editing) {
      const dupe = products.find((p) => p.title.trim().toLowerCase() === form.title.trim().toLowerCase());
      if (dupe) {
        const proceed = window.confirm(`"${dupe.title}" নামে একটা প্রোডাক্ট আগে থেকেই আছে। তুমি কি নতুন করে আরেকটা যোগ করতে চাও?`);
        if (!proceed) return;
      }
    }
    const colors = form.colors ? form.colors.split(",").map((s) => s.trim()).filter(Boolean) : ["ডিফল্ট"];
    const sizes = form.sizes ? form.sizes.split(",").map((s) => s.trim()).filter(Boolean) : ["ফ্রি সাইজ"];
    const generalImages = form.images ? form.images.split(",").map((s) => s.trim()).filter(Boolean) : [];
    // Color-specific images and general/gallery images are kept separate now,
    // instead of colorImages silently replacing generalImages when every
    // color had one assigned. Both show up in the product's photo carousel.
    const sizePricing = {};
    sizes.forEach((s) => {
      const entry = sizePriceForm[s];
      if (entry && (entry.price || entry.discount)) {
        const priceNum = Number(entry.price);
        const discountNum = Number(entry.discount);
        sizePricing[s] = {
          price: entry.price && !isNaN(priceNum) ? priceNum : Number(form.price),
          discount: entry.discount && !isNaN(discountNum) ? discountNum : 0,
        };
      }
    });
    const colorAdjust = {};
    colors.forEach((c) => {
      const v = Number(colorAdjustForm[c]);
      if (colorAdjustForm[c] && !isNaN(v)) colorAdjust[c] = v;
    });
    const payload = {
      id: editing || ("p" + Date.now()),
      title: form.title.trim(),
      cats: form.cats,
      cat: form.cats[0] || "",
      price: Number(form.price),
      discount: form.discount ? Number(form.discount) : 0,
      sizes,
      colors,
      desc: form.desc.trim(),
      images: generalImages,
      colorImages: Object.fromEntries(colors.filter((c) => colorImages[c]).map((c) => [c, colorImages[c]])),
      videoUrl: form.videoUrl.trim(),
      inStock: form.inStock !== false,
      codEnabled: form.codEnabled !== false,
      sizePricing,
      colorAdjust,
      seed: "prod" + (editing || Date.now()),
    };
    let next;
    if (editing) next = products.map((p) => (p.id === editing ? payload : p));
    else next = [...products, payload];
    await saveProducts(next);
    resetForm();
  };

  const remove = async (id) => {
    const p = products.find((x) => x.id === id);
    if (!window.confirm(`"${p ? p.title : "এই প্রোডাক্ট"}" সত্যিই ডিলিট করতে চান?`)) return;
    await saveProducts(products.filter((p) => p.id !== id));
    if (editing === id) resetForm();
  };

  if (!authed) {
    const tryLogin = async () => {
      setChecking(true);
      setLoginError(false);
      const ok = await adminSignIn(pass);
      setChecking(false);
      if (ok) setAuthed(true);
      else setLoginError(true);
    };
    return (
      <div className="max-w-sm mx-auto px-4 py-20 text-center">
        <Lock size={32} color={PALETTE.blue} className="mx-auto mb-3" />
        <h2 style={{ fontFamily: "'Baloo Da 2', sans-serif" }} className="text-xl font-bold mb-4">অ্যাডমিন প্যানেল</h2>
        <input
          type="password"
          value={pass}
          onChange={(e) => setPass(e.target.value)}
          placeholder="পাসওয়ার্ড দিন"
          className="w-full px-3 py-2 rounded-lg border bg-white mb-3"
          style={{ borderColor: PALETTE.border }}
        />
        <button
          onClick={tryLogin}
          disabled={checking}
          className="w-full py-2.5 rounded-full font-semibold"
          style={{ background: PALETTE.blue, color: "#fff", opacity: checking ? 0.6 : 1 }}
        >
          {checking ? "যাচাই হচ্ছে..." : "প্রবেশ করুন"}
        </button>
        {loginError && <p className="text-xs mt-3" style={{ color: PALETTE.orange }}>পাসওয়ার্ড ভুল হয়েছে</p>}
        <button onClick={() => navigate("#/")} className="mt-4 text-sm font-medium block mx-auto" style={{ color: PALETTE.blue }}>← হোমে ফিরে যান</button>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-6">
      <button onClick={() => navigate("#/")} className="flex items-center gap-1 text-sm mb-4 font-medium" style={{ color: PALETTE.blue }}>
        <ArrowLeft size={16} /> শপে ফিরে যান
      </button>
      <h2 style={{ fontFamily: "'Baloo Da 2', sans-serif" }} className="text-xl font-bold mb-4">অ্যাডমিন ড্যাশবোর্ড</h2>

      <div className="flex gap-2 mb-5">
        <button onClick={() => setTab("products")} className="px-4 py-1.5 rounded-full text-sm font-semibold" style={tab === "products" ? { background: PALETTE.blue, color: "#fff" } : { background: PALETTE.card, color: PALETTE.blue, border: `1px solid ${PALETTE.border}` }}>প্রোডাক্ট</button>
        <button onClick={() => setTab("orders")} className="px-4 py-1.5 rounded-full text-sm font-semibold flex items-center gap-1" style={tab === "orders" ? { background: PALETTE.blue, color: "#fff" } : { background: PALETTE.card, color: PALETTE.blue, border: `1px solid ${PALETTE.border}` }}>
          <ClipboardList size={14} /> অর্ডার ({orders.length})
        </button>
        <button onClick={() => setTab("banners")} className="px-4 py-1.5 rounded-full text-sm font-semibold" style={tab === "banners" ? { background: PALETTE.blue, color: "#fff" } : { background: PALETTE.card, color: PALETTE.blue, border: `1px solid ${PALETTE.border}` }}>ব্যানার/লোগো</button>
        <button onClick={() => setTab("categories")} className="px-4 py-1.5 rounded-full text-sm font-semibold" style={tab === "categories" ? { background: PALETTE.blue, color: "#fff" } : { background: PALETTE.card, color: PALETTE.blue, border: `1px solid ${PALETTE.border}` }}>ক্যাটাগরি</button>
        <button onClick={() => setTab("reviews")} className="px-4 py-1.5 rounded-full text-sm font-semibold" style={tab === "reviews" ? { background: PALETTE.blue, color: "#fff" } : { background: PALETTE.card, color: PALETTE.blue, border: `1px solid ${PALETTE.border}` }}>রিভিউ{pendingReviews.length > 0 ? ` (${pendingReviews.length})` : ""}</button>
      </div>

      {tab === "reviews" && (
        <div>
          {reviewsLoadingAdmin && <p className="text-sm" style={{ color: PALETTE.muted }}>লোড হচ্ছে...</p>}
          {!reviewsLoadingAdmin && pendingReviews.length === 0 && (
            <p className="text-sm" style={{ color: PALETTE.muted }}>এখন কোনো রিভিউ অনুমোদনের অপেক্ষায় নেই।</p>
          )}
          <div className="space-y-3">
            {pendingReviews.map((r) => {
              const prod = products.find((p) => p.id === r.productId);
              return (
                <div key={r.id} className="rounded-xl p-4" style={{ background: PALETTE.card, border: `1px solid ${PALETTE.border}` }}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-semibold">{prod ? prod.title : "প্রোডাক্ট মুছে ফেলা হয়েছে"}</span>
                    <StarRating value={r.rating} size={14} />
                  </div>
                  <p className="text-xs mb-2" style={{ color: PALETTE.muted }}>{r.userName}</p>
                  {r.comment && <p className="text-sm mb-3">{r.comment}</p>}
                  <div className="flex gap-2">
                    <button
                      onClick={async () => { await approveReview(r.id); setPendingReviews((cur) => cur.filter((x) => x.id !== r.id)); }}
                      className="px-3 py-1.5 rounded-full text-xs font-semibold"
                      style={{ background: "#1E8E5A", color: "#fff" }}
                    >
                      অনুমোদন করো
                    </button>
                    <button
                      onClick={async () => { await rejectReview(r.id); setPendingReviews((cur) => cur.filter((x) => x.id !== r.id)); }}
                      className="px-3 py-1.5 rounded-full text-xs font-semibold"
                      style={{ background: "#FCE4E4", color: "#C0392B" }}
                    >
                      বাতিল করো
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {tab === "products" && (
        <>
          <div className="rounded-2xl p-4 mb-6" style={{ background: PALETTE.card, border: `1px solid ${PALETTE.border}` }}>
            <h3 className="font-semibold mb-3">{editing ? "প্রোডাক্ট এডিট করুন" : "নতুন প্রোডাক্ট যোগ করুন"}</h3>
            <div className="grid grid-cols-2 gap-3">
              <input placeholder="প্রোডাক্ট টাইটেল" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} className="col-span-2 px-3 py-2 rounded-lg border" style={{ borderColor: PALETTE.border }} />
              <div className="col-span-2 px-3 py-2 rounded-lg border" style={{ borderColor: PALETTE.border }}>
                <p className="text-xs font-semibold mb-2" style={{ color: PALETTE.muted }}>ক্যাটাগরি (একাধিক বাছাই করা যাবে)</p>
                <div className="flex flex-wrap gap-2">
                  {categories.map((c) => {
                    const selected = form.cats.includes(c.name);
                    return (
                      <button
                        type="button"
                        key={c.name}
                        onClick={() => toggleFormCat(c.name)}
                        className="px-3 py-1.5 rounded-full text-xs font-semibold border flex items-center gap-1"
                        style={selected ? { background: PALETTE.blue, color: "#fff", borderColor: PALETTE.blue } : { borderColor: PALETTE.border, color: PALETTE.ink }}
                      >
                        {selected && <Check size={12} />}
                        {c.icon || "🛍️"} {c.name}
                      </button>
                    );
                  })}
                </div>
                {form.cats.length === 0 && (
                  <p className="text-xs mt-2" style={{ color: PALETTE.orange }}>অন্তত একটি ক্যাটাগরি বাছাই করো</p>
                )}
              </div>
              <input placeholder="দাম (৳)" type="number" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} className="px-3 py-2 rounded-lg border" style={{ borderColor: PALETTE.border }} />
              <div>
                <input placeholder="ডিসকাউন্ট প্রাইস (৳, না থাকলে খালি)" type="number" value={form.discount} onChange={(e) => setForm({ ...form, discount: e.target.value })} className="w-full px-3 py-2 rounded-lg border" style={{ borderColor: PALETTE.border }} />
                {form.price && form.discount && Number(form.discount) > 0 && Number(form.discount) < Number(form.price) && (
                  <p className="text-xs mt-1 font-semibold" style={{ color: PALETTE.orange }}>
                    {Math.round(((Number(form.price) - Number(form.discount)) / Number(form.price)) * 100)}% ছাড় দেখাবে
                  </p>
                )}
              </div>
              <input placeholder="সাইজ (কমা দিয়ে, যেমন: S, M, L)" value={form.sizes} onChange={(e) => setForm({ ...form, sizes: e.target.value })} className="px-3 py-2 rounded-lg border" style={{ borderColor: PALETTE.border }} />
              <input placeholder="কালার (কমা দিয়ে)" value={form.colors} onChange={(e) => setForm({ ...form, colors: e.target.value })} className="px-3 py-2 rounded-lg border" style={{ borderColor: PALETTE.border }} />

              {sizeList.length > 1 && (
                <div className="col-span-2 rounded-lg p-3" style={{ background: "#E4EEF8" }}>
                  <p className="text-xs font-semibold mb-2" style={{ color: PALETTE.ink }}>সাইজ অনুযায়ী নিজের দাম বসাও (খালি রাখলে উপরের সাধারণ দাম/ডিসকাউন্ট প্রাইসই ব্যবহার হবে)</p>
                  <div className="space-y-2">
                    {sizeList.map((s) => (
                      <div key={s} className="flex items-center gap-2 bg-white rounded-lg px-2 py-1.5">
                        <span className="text-sm flex-shrink-0" style={{ width: 55 }}>{s}</span>
                        <input
                          type="number"
                          placeholder="সেল প্রাইস"
                          value={(sizePriceForm[s] && sizePriceForm[s].price) || ""}
                          onChange={(e) => setSizePriceForm((m) => ({ ...m, [s]: { ...(m[s] || {}), price: e.target.value } }))}
                          className="flex-1 px-2 py-1 rounded border text-sm"
                          style={{ borderColor: PALETTE.border, minWidth: 0 }}
                        />
                        <input
                          type="number"
                          placeholder="স্পেশাল প্রাইস"
                          value={(sizePriceForm[s] && sizePriceForm[s].discount) || ""}
                          onChange={(e) => setSizePriceForm((m) => ({ ...m, [s]: { ...(m[s] || {}), discount: e.target.value } }))}
                          className="flex-1 px-2 py-1 rounded border text-sm"
                          style={{ borderColor: PALETTE.border, minWidth: 0 }}
                        />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {colorList.length > 1 && (
                <div className="col-span-2 rounded-lg p-3" style={{ background: "#E4EEF8" }}>
                  <p className="text-xs font-semibold mb-2" style={{ color: PALETTE.ink }}>কালার অনুযায়ী দাম কম/বেশি (৳, না দিলে ০ ধরা হবে)</p>
                  <div className="grid grid-cols-2 gap-2">
                    {colorList.map((c) => (
                      <div key={c} className="flex items-center gap-2 bg-white rounded-lg px-2 py-1">
                        <span className="text-sm flex-shrink-0" style={{ width: 60 }}>{c}</span>
                        <input
                          type="number"
                          placeholder="0"
                          value={colorAdjustForm[c] || ""}
                          onChange={(e) => setColorAdjustForm((m) => ({ ...m, [c]: e.target.value }))}
                          className="flex-1 px-2 py-1 rounded border text-sm"
                          style={{ borderColor: PALETTE.border }}
                        />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {colorList.length > 1 && (
                <div className="col-span-2 rounded-lg p-3" style={{ background: PALETTE.orangeSoft }}>
                  <p className="text-xs font-semibold mb-2" style={{ color: PALETTE.ink }}>প্রতিটা রঙের জন্য আলাদা ছবি দাও (কাস্টমার রঙ সিলেক্ট করলে এই ছবিটাই দেখাবে)</p>
                  <div className="space-y-2">
                    {colorList.map((c) => (
                      <div key={c} className="flex items-center gap-2 bg-white rounded-lg p-2">
                        {colorImages[c] ? (
                          <img src={colorImages[c]} alt={c} className="w-10 h-10 rounded object-cover flex-shrink-0" />
                        ) : (
                          <div className="w-10 h-10 rounded flex-shrink-0" style={{ background: PALETTE.border }} />
                        )}
                        <span className="text-sm font-medium flex-shrink-0" style={{ width: 70 }}>{c}</span>
                        <input
                          type="file"
                          accept="image/*"
                          onChange={(e) => handleColorFileUpload(c, e.target.files[0])}
                          disabled={uploadingColor === c}
                          className="text-xs flex-1"
                        />
                        {uploadingColor === c && <span className="text-xs" style={{ color: PALETTE.orange }}>আপলোড হচ্ছে...</span>}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="col-span-2">
                <label className="text-xs font-medium block mb-1" style={{ color: PALETTE.muted }}>
                  {colorList.length > 1 ? "সাধারণ ছবি (রঙ অনুযায়ী উপরে দিলে এটা লাগবে না)" : "ফোন থেকে সরাসরি ছবি আপলোড করো (একাধিক বেছে নিতে পারো)"}
                </label>
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={handleFileUpload}
                  disabled={uploading}
                  className="w-full text-sm"
                />
                {uploading && <p className="text-xs mt-1" style={{ color: PALETTE.orange }}>আপলোড হচ্ছে...</p>}
              </div>
              <textarea placeholder="অথবা ছবির লিংক এখানে (একাধিক হলে কমা (,) দিয়ে আলাদা করো)" value={form.images} onChange={(e) => setForm({ ...form, images: e.target.value })} className="col-span-2 px-3 py-2 rounded-lg border" rows={2} style={{ borderColor: PALETTE.border }} />
              <textarea placeholder="বিবরণ" value={form.desc} onChange={(e) => setForm({ ...form, desc: e.target.value })} className="col-span-2 px-3 py-2 rounded-lg border" rows={2} style={{ borderColor: PALETTE.border }} />
              <input placeholder="YouTube ভিডিও লিংক (অপশনাল)" value={form.videoUrl} onChange={(e) => setForm({ ...form, videoUrl: e.target.value })} className="col-span-2 px-3 py-2 rounded-lg border" style={{ borderColor: PALETTE.border }} />

              <div className="col-span-2 flex items-center justify-between rounded-lg p-3" style={{ background: form.inStock ? "#E4F5E9" : "#FCE4E4" }}>
                <span className="text-sm font-semibold" style={{ color: form.inStock ? "#1E8E5A" : "#C0392B" }}>
                  {form.inStock ? "স্টকে আছে (কাস্টমার অর্ডার করতে পারবে)" : "স্টক নেই (প্রোডাক্ট দেখা যাবে, অর্ডার করা যাবে না)"}
                </span>
                <button
                  type="button"
                  onClick={() => setForm({ ...form, inStock: !form.inStock })}
                  className="rounded-full px-3 py-1.5 text-xs font-semibold flex-shrink-0"
                  style={{ background: form.inStock ? "#1E8E5A" : "#C0392B", color: "#fff" }}
                >
                  {form.inStock ? "স্টক আউট করো" : "স্টক ইন করো"}
                </button>
              </div>

              <div className="col-span-2 flex items-center justify-between rounded-lg p-3" style={{ background: form.codEnabled !== false ? "#E4F5E9" : "#FCE4E4" }}>
                <span className="text-sm font-semibold" style={{ color: form.codEnabled !== false ? "#1E8E5A" : "#C0392B" }}>
                  {form.codEnabled !== false ? "ক্যাশ অন ডেলিভারি চালু আছে" : "শুধু বিকাশে পেমেন্ট (COD বন্ধ)"}
                </span>
                <button
                  type="button"
                  onClick={() => setForm({ ...form, codEnabled: !(form.codEnabled !== false) })}
                  className="rounded-full px-3 py-1.5 text-xs font-semibold flex-shrink-0"
                  style={{ background: form.codEnabled !== false ? "#1E8E5A" : "#C0392B", color: "#fff" }}
                >
                  {form.codEnabled !== false ? "COD বন্ধ করো" : "COD চালু করো"}
                </button>
              </div>
            </div>
            <div className="flex gap-2 mt-3">
              <button onClick={submit} className="px-5 py-2 rounded-full font-semibold text-sm" style={{ background: PALETTE.orange, color: "#fff" }}>
                {editing ? "আপডেট করুন" : "যোগ করুন"}
              </button>
              {editing && <button onClick={resetForm} className="px-5 py-2 rounded-full font-semibold text-sm border" style={{ borderColor: PALETTE.border }}>বাতিল</button>}
            </div>
          </div>

          <div className="space-y-2">
            {products.map((p) => {
              const outOfStock = p.inStock === false;
              const toggleStock = async () => {
                await saveProducts(products.map((x) => (x.id === p.id ? { ...x, inStock: !x.inStock } : x)));
              };
              return (
                <div key={p.id} className="flex items-center gap-3 p-3 rounded-xl" style={{ background: PALETTE.card, border: `1px solid ${PALETTE.border}` }}>
                  <img src={p.images && p.images.length > 0 ? p.images[0] : `https://picsum.photos/seed/${p.seed || p.id}/80/100`} className="w-10 h-12 object-cover rounded" alt={p.title} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold truncate">{p.title}</p>
                    <p className="text-xs truncate" style={{ color: PALETTE.muted }}>{productCats(p).join(", ")} • <Taka amount={p.discount || p.price} /></p>
                  </div>
                  <button onClick={toggleStock} className="text-[10px] font-semibold px-2 py-1.5 rounded-full flex-shrink-0" style={{ background: outOfStock ? "#FCE4E4" : "#E4F5E9", color: outOfStock ? "#C0392B" : "#1E8E5A" }}>
                    {outOfStock ? "স্টক নেই" : "স্টকে আছে"}
                  </button>
                  <button onClick={() => copyLink(`#/product/${p.id}`)} className="p-2 rounded-full" style={{ background: PALETTE.orangeSoft }} title="লিংক কপি"><Copy size={14} color={PALETTE.orange} /></button>
                  <button onClick={() => startEdit(p)} className="p-2 rounded-full" style={{ background: "#E4EEF8" }} title="এডিট"><Pencil size={14} color={PALETTE.blue} /></button>
                  <button onClick={() => remove(p.id)} className="p-2 rounded-full" style={{ background: "#FCE4E4" }} title="ডিলিট"><Trash2 size={14} color="#C0392B" /></button>
                </div>
              );
            })}
          </div>
        </>
      )}

      {tab === "orders" && (
        <div className="space-y-3">
          {orders.length === 0 && <p className="text-sm" style={{ color: PALETTE.muted }}>এখনো কোনো অর্ডার আসেনি।</p>}
          {orders.map((o) => {
            const statusOptions = ["পেন্ডিং", "কনফার্ম হয়েছে", "ডেলিভারি হচ্ছে", "ডেলিভার হয়েছে", "বাতিল"];
            const statusColor = {
              "পেন্ডিং": PALETTE.orange,
              "কনফার্ম হয়েছে": PALETTE.blue,
              "ডেলিভারি হচ্ছে": PALETTE.navy,
              "ডেলিভার হয়েছে": "#1E8E5A",
              "বাতিল": "#C0392B",
            }[o.status || "পেন্ডিং"];
            const changeStatus = async (newStatus) => {
              const next = orders.map((x) => (x.id === o.id ? { ...x, status: newStatus } : x));
              await saveOrders(next);
            };
            return (
              <div key={o.id} className="p-4 rounded-xl" style={{ background: PALETTE.card, border: `1px solid ${PALETTE.border}` }}>
                <div className="flex justify-between items-start mb-1">
                  <p className="font-bold text-sm" style={{ color: PALETTE.blue }}>{o.id}</p>
                  <p className="text-xs" style={{ color: PALETTE.muted }}>{new Date(o.time).toLocaleString("bn-BD")}</p>
                </div>
                <p className="text-sm">{o.name} • {o.phone}</p>
                <p className="text-xs" style={{ color: PALETTE.muted }}>{o.address} ({o.area === "dhaka" ? "ঢাকার ভেতরে" : "ঢাকার বাইরে"})</p>
                <p className="text-xs mt-1">
                  {o.paymentMethod === "bkash" ? (
                    <span style={{ color: "#E2136E", fontWeight: 600 }}>বিকাশ পেমেন্ট • TrxID: {o.trxId || "দেওয়া হয়নি"}</span>
                  ) : (
                    <span style={{ color: PALETTE.muted }}>ক্যাশ অন ডেলিভারি</span>
                  )}
                </p>
                <div className="mt-2 text-xs">
                  {o.items.map((it, idx) => (
                    <div key={idx} className="flex justify-between">
                      <span>{it.title} ({it.size}/{it.color}) × {it.qty}</span>
                      <span><Taka amount={it.price * it.qty} /></span>
                    </div>
                  ))}
                </div>
                <div className="flex justify-between font-bold text-sm mt-2 pt-2 border-t" style={{ borderColor: PALETTE.border }}>
                  <span>সর্বমোট</span>
                  <span style={{ color: PALETTE.orange }}><Taka amount={o.total} /></span>
                </div>
                <div className="mt-3">
                  <label className="text-xs font-medium block mb-1" style={{ color: PALETTE.muted }}>অর্ডার স্ট্যাটাস</label>
                  <select
                    value={o.status || "পেন্ডিং"}
                    onChange={(e) => changeStatus(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border text-sm font-semibold"
                    style={{ borderColor: PALETTE.border, color: statusColor }}
                  >
                    {statusOptions.map((s) => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {tab === "banners" && (
        <div>
          <div className="rounded-2xl p-4 mb-5" style={{ background: PALETTE.card, border: `1px solid ${PALETTE.border}` }}>
            <h3 className="font-semibold mb-3">লোগো</h3>
            <div className="flex items-center gap-3 mb-3">
              <img src={logo} alt="বর্তমান লোগো" className="w-16 h-16 object-contain rounded border" style={{ borderColor: PALETTE.border }} />
              <span className="text-xs" style={{ color: PALETTE.muted }}>বর্তমান লোগো</span>
            </div>
            <label className="text-xs font-medium block mb-1" style={{ color: PALETTE.muted }}>নতুন লোগো আপলোড করো (এটা পুরনোটার জায়গায় বসে যাবে)</label>
            <input
              type="file"
              accept="image/*"
              onChange={handleLogoUpload}
              disabled={uploadingLogo}
              className="w-full text-sm"
            />
            {uploadingLogo && <p className="text-xs mt-1" style={{ color: PALETTE.orange }}>আপলোড হচ্ছে...</p>}
          </div>
          <div className="rounded-2xl p-4 mb-5" style={{ background: PALETTE.card, border: `1px solid ${PALETTE.border}` }}>
            <label className="text-xs font-medium block mb-1" style={{ color: PALETTE.muted }}>নতুন ব্যানার ছবি আপলোড করো (একাধিক বেছে নিতে পারো)</label>
            <input
              type="file"
              accept="image/*"
              multiple
              onChange={handleBannerUpload}
              disabled={uploadingBanner}
              className="w-full text-sm"
            />
            {uploadingBanner && <p className="text-xs mt-1" style={{ color: PALETTE.orange }}>আপলোড হচ্ছে...</p>}
          </div>
          <div className="space-y-3">
            {banners.map((b, i) => (
              <div key={i} className="flex items-center gap-3 p-3 rounded-xl" style={{ background: PALETTE.card, border: `1px solid ${PALETTE.border}` }}>
                <img src={b} alt={`banner-${i}`} className="w-24 h-12 object-cover rounded" />
                <span className="text-xs flex-1" style={{ color: PALETTE.muted }}>ব্যানার #{i + 1}</span>
                <button onClick={() => removeBanner(i)} className="p-2 rounded-full" style={{ background: "#FCE4E4" }} title="ডিলিট">
                  <Trash2 size={14} color="#C0392B" />
                </button>
              </div>
            ))}
            {banners.length === 0 && <p className="text-sm" style={{ color: PALETTE.muted }}>কোনো ব্যানার নেই — উপরে থেকে আপলোড করো।</p>}
          </div>
        </div>
      )}

      {tab === "categories" && (
        <div>
          <div className="rounded-2xl p-4 mb-5" style={{ background: PALETTE.card, border: `1px solid ${PALETTE.border}` }}>
            <h3 className="font-semibold mb-3">{catEditing ? "ক্যাটাগরি এডিট করুন" : "নতুন ক্যাটাগরি যোগ করুন"}</h3>
            <div className="grid grid-cols-2 gap-3">
              <input placeholder="ক্যাটাগরির নাম" value={catForm.name} onChange={(e) => setCatForm({ ...catForm, name: e.target.value })} className="col-span-2 px-3 py-2 rounded-lg border" style={{ borderColor: PALETTE.border }} />
              <input placeholder="ইমোজি আইকন (অপশনাল, যেমন: 👕)" value={catForm.icon} onChange={(e) => setCatForm({ ...catForm, icon: e.target.value })} className="col-span-2 px-3 py-2 rounded-lg border" style={{ borderColor: PALETTE.border }} />
              <div className="col-span-2 flex items-center gap-2">
                <label className="text-xs font-medium" style={{ color: PALETTE.muted }}>ক্যাটাগরির রঙ</label>
                <input type="color" value={catForm.color} onChange={(e) => setCatForm({ ...catForm, color: e.target.value })} className="w-10 h-8 rounded border" style={{ borderColor: PALETTE.border }} />
              </div>
            </div>
            <div className="flex gap-2 mt-3">
              <button onClick={submitCategory} className="px-5 py-2 rounded-full font-semibold text-sm" style={{ background: PALETTE.orange, color: "#fff" }}>
                {catEditing ? "আপডেট করুন" : "যোগ করুন"}
              </button>
              {catEditing && <button onClick={resetCatForm} className="px-5 py-2 rounded-full font-semibold text-sm border" style={{ borderColor: PALETTE.border }}>বাতিল</button>}
            </div>
          </div>

          <div className="space-y-2">
            {categories.map((c) => (
              <div key={c.name} className="flex items-center gap-3 p-3 rounded-xl" style={{ background: PALETTE.card, border: `1px solid ${PALETTE.border}` }}>
                <div className="w-10 h-10 rounded-full flex items-center justify-center text-xl overflow-hidden flex-shrink-0" style={{ background: PALETTE.orangeSoft }}>
                  {c.image ? <img src={c.image} alt={c.name} className="w-full h-full object-cover" /> : (c.icon || "🛍️")}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold truncate flex items-center gap-2">
                    <span className="inline-block rounded-full flex-shrink-0" style={{ width: 10, height: 10, background: c.color || PALETTE.orange }} />
                    {c.name}
                  </p>
                  <label className="text-xs" style={{ color: PALETTE.blue }}>
                    ব্যানার ছবি বসাও (হোমপেজে ক্লিকযোগ্য ব্যানার হবে)
                    <input type="file" accept="image/*" className="hidden" onChange={(e) => handleCatImageUpload(c.name, e.target.files[0])} disabled={uploadingCatImage} />
                  </label>
                  {c.image && (
                    <button onClick={() => removeCatImage(c.name)} className="text-xs ml-2" style={{ color: "#C0392B" }}>
                      ব্যানার সরাও
                    </button>
                  )}
                  {uploadingCatImage && <span className="text-xs ml-2" style={{ color: PALETTE.orange }}>আপলোড হচ্ছে...</span>}
                </div>
                <button onClick={() => startCatEdit(c)} className="p-2 rounded-full" style={{ background: "#E4EEF8" }} title="এডিট"><Pencil size={14} color={PALETTE.blue} /></button>
                <button onClick={() => removeCategory(c.name)} className="p-2 rounded-full" style={{ background: "#FCE4E4" }} title="ডিলিট"><Trash2 size={14} color="#C0392B" /></button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
