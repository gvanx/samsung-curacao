(() => {
  'use strict';
  const WA = '59996782619';
  const scriptUrl = document.currentScript?.src || new URL('/js/catalog.js', location.href).href;
  const siteRoot = new URL('../', scriptUrl);
  const sourceModule = import(new URL('catalog-source.mjs', scriptUrl).href);
  const featuredNames = ['Galaxy S26 Ultra', 'Galaxy A57 5G', 'Galaxy A37 5G'];
  const fullName = p => [p.name, p.suffix].filter(Boolean).join(' ');
  const formatPrice = value => Number.isFinite(Number(value)) && Number(value) > 0 ? `XCG ${Number(value).toLocaleString('en-US')}` : 'Ask for current price';
  const family = p => p.subcategory === 'tablet' || /\bTab\b/i.test(p.name) ? 'tablet' : /\bGalaxy S/i.test(p.name) ? 's' : 'a';
  const waUrl = name => `https://wa.me/${WA}?text=${encodeURIComponent(`Hi Connections! I'm interested in the ${name}. Please confirm the price, storage, colors and availability.`)}`;
  function element(tag, className, text) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
  }
  function setProductImage(image, product, onError) {
    const source = typeof product.image === 'string' ? product.image : '';
    image.alt = fullName(product);
    const fail = () => { image.hidden = true; onError?.(); };
    image.addEventListener('error', fail, { once: true });
    if (source.startsWith('https://connectionscuracao.net/img/')) image.src = source;
    else if (/^[a-z0-9][a-z0-9_.-]*\.(?:png|jpe?g|webp|avif)$/i.test(source)) image.src = new URL(`img/products/${source}`, siteRoot).href;
    else fail();
  }
  function productTile(p) {
    const name = fullName(p);
    const article = element('article', 'tile');
    const featured = featuredNames.includes(p.name);
    if (featured) article.classList.add('tile-featured');
    const visual = element('div', 'tile-visual');
    const image = element('img');
    image.loading = 'lazy'; image.decoding = 'async'; image.width = 400; image.height = 400;
    const fallback = element('span', 'tile-image-fallback', name);
    fallback.hidden = true;
    setProductImage(image, p, () => { fallback.hidden = false; });
    visual.append(image, fallback);
    if (featured) visual.append(element('span', 'tile-badge', 'Featured'));
    const label = family(p) === 'tablet' ? 'Galaxy Tab' : family(p) === 's' ? 'Galaxy S series' : 'Everyday Galaxy';
    article.append(visual, element('p', 'tile-meta', label), element('h3', 'tile-name', name), element('p', 'tile-price', formatPrice(p.price)));
    const actions = element('div', 'tile-actions');
    const landing = /^\/a(?:27|37|57)\/?$/.test(p.landingPage || '') ? p.landingPage : null;
    if (landing) {
      const details = element('a', 'btn btn-ghost tile-cta', 'Explore model');
      details.href = landing; details.setAttribute('aria-label', `Explore ${name}`); actions.append(details);
    }
    const whatsapp = element('a', `btn ${landing ? 'btn-ghost' : 'btn-primary'} tile-cta`, 'Ask on WhatsApp');
    whatsapp.href = waUrl(name); whatsapp.target = '_blank'; whatsapp.rel = 'noopener noreferrer';
    whatsapp.setAttribute('aria-label', `Ask about ${name} on WhatsApp`);
    actions.append(whatsapp); article.append(actions);
    return article;
  }
  function hydrateFeatures(products) {
    const byName = new Map(products.map(p => [fullName(p), p]));
    document.querySelectorAll('[data-price-for]').forEach(node => {
      const p = byName.get(node.dataset.priceFor);
      node.textContent = formatPrice(p?.price);
    });
    document.querySelectorAll('[data-image-for]').forEach(image => {
      const p = byName.get(image.dataset.imageFor);
      if (p && image.tagName === 'IMG') setProductImage(image, p, () => image.insertAdjacentElement('afterend', element('span', 'product-image-fallback', fullName(p))));
    });
  }
  function renderCatalog(initialProducts, grid) {
    let products = initialProducts;
    const search = document.getElementById('catalog-search');
    const sort = document.getElementById('catalog-sort');
    const count = document.getElementById('catalog-count');
    const reset = document.getElementById('catalog-reset');
    const empty = document.getElementById('catalog-empty');
    const filters = [...document.querySelectorAll('[data-filter]')];
    let activeFilter = filters.find(b => b.getAttribute('aria-pressed') === 'true')?.dataset.filter || 'all';
    function update() {
      const query = (search?.value || '').trim().toLocaleLowerCase();
      const visible = products.filter(p => (activeFilter === 'all' || family(p) === activeFilter) && fullName(p).toLocaleLowerCase().includes(query));
      const order = sort?.value || 'featured';
      const rank = p => { const i = featuredNames.indexOf(p.name); return i < 0 ? featuredNames.length : i; };
      visible.sort(order === 'price-asc' ? (a, b) => Number(a.price) - Number(b.price) : order === 'price-desc' ? (a, b) => Number(b.price) - Number(a.price) : (a, b) => rank(a) - rank(b));
      grid.replaceChildren(...visible.map(productTile));
      if (count) count.textContent = `${visible.length} ${visible.length === 1 ? 'model' : 'models'}`;
      if (empty) empty.hidden = visible.length > 0;
      if (reset) reset.hidden = visible.length > 0;
      if (!visible.length && !empty) grid.append(element('p', 'catalog-empty-message', 'No models match your search. Try another model or reset the filters.'));
      filters.forEach(button => {
        const selected = button.dataset.filter === activeFilter;
        button.setAttribute('aria-pressed', String(selected)); button.classList.toggle('active', selected); button.classList.toggle('is-active', selected);
      });
    }
    filters.forEach(button => button.addEventListener('click', () => { activeFilter = button.dataset.filter; update(); }));
    search?.addEventListener('input', update); sort?.addEventListener('change', update);
    reset?.addEventListener('click', () => { activeFilter = 'all'; if (search) search.value = ''; if (sort) sort.value = 'featured'; update(); search?.focus(); });
    const setProducts = next => {
      products = next;
      if (sort) sort.disabled = products.every(product => product.price === null);
      update();
    };
    setProducts(products);
    return setProducts;
  }
  let setCatalogProducts;
  let lastProducts = [];
  let refreshing = false;
  let lastAttempt = 0;
  async function loadCatalog() {
    if (refreshing) return;
    refreshing = true;
    lastAttempt = Date.now();
    const grid = document.getElementById('catalog-grid');
    const status = document.getElementById('catalog-sync-status');
    const showProducts = products => {
      hydrateFeatures(products);
      if (grid) {
        if (setCatalogProducts) setCatalogProducts(products);
        else setCatalogProducts = renderCatalog(products, grid);
      }
    };
    try {
      const source = await sourceModule;
      const result = await source.loadCatalog({ siteRoot });
      lastProducts = result.products;
      showProducts(result.products);
      document.documentElement.dataset.catalogSource = result.live ? 'connections' : 'unavailable';
      if (status) status.textContent = result.live
        ? 'Prices update automatically from Connections.'
        : 'Current prices are unavailable. Ask our team for the latest price.';
    } catch (error) {
      hydrateFeatures([]);
      document.documentElement.dataset.catalogSource = 'unavailable';
      if (status) status.textContent = 'Current prices are unavailable. Ask our team for the latest price.';
      if (lastProducts.length) {
        showProducts(lastProducts.map(product => ({ ...product, price: null })));
      } else if (grid) {
        const message = element('div', 'catalog-error');
        message.append(element('p', 'section-note', 'We couldn’t load the catalog. Our team can help you find your Galaxy and confirm current prices.'));
        const link = element('a', 'btn btn-primary', 'Ask on WhatsApp');
        link.href = `https://wa.me/${WA}`; link.target = '_blank'; link.rel = 'noopener noreferrer'; message.append(link); grid.replaceChildren(message);
      }
      if (!lastProducts.length) {
        const count = document.getElementById('catalog-count'); if (count) count.textContent = 'Contact us for the current collection';
        const empty = document.getElementById('catalog-empty'); if (empty) empty.hidden = true;
      }
    } finally {
      refreshing = false;
    }
  }
  function initReveal() {
    const nodes = document.querySelectorAll('.reveal');
    if (!('IntersectionObserver' in window) || window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) { nodes.forEach(n => n.classList.add('in')); return; }
    document.documentElement.classList.add('js');
    const observer = new IntersectionObserver(entries => entries.forEach(entry => { if (entry.isIntersecting) { entry.target.classList.add('in'); observer.unobserve(entry.target); } }), { threshold: 0.08 });
    nodes.forEach(node => observer.observe(node));
  }
  window.initReveal = initReveal;
  function init() {
    initReveal();
    loadCatalog();
    // Keep long-lived tabs current without recreating filter event listeners.
    sourceModule.then(({ REFRESH_INTERVAL_MS }) => {
      setInterval(() => { if (!document.hidden) loadCatalog(); }, REFRESH_INTERVAL_MS);
    }).catch(() => { /* The load handler already shows the no-price fallback. */ });
    const refreshOnReturn = () => {
      if (!document.hidden && Date.now() - lastAttempt > 30 * 1000) loadCatalog();
    };
    window.addEventListener('focus', refreshOnReturn);
    window.addEventListener('online', () => loadCatalog());
    document.addEventListener('visibilitychange', refreshOnReturn);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, { once: true }); else init();
})();
