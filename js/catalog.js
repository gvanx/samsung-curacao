const WA = '59996782619';
const WA_ICON = '<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M17.5 14.4c-.3-.2-1.8-.9-2.1-1-.3-.1-.5-.2-.7.2-.2.3-.8 1-.9 1.2-.2.2-.3.2-.6.1-.3-.2-1.3-.5-2.4-1.5-.9-.8-1.5-1.8-1.7-2.1-.2-.3 0-.5.1-.6.1-.1.3-.3.4-.5.1-.2.2-.3.3-.5.1-.2 0-.4 0-.5 0-.1-.6-1.6-.9-2.2-.2-.6-.5-.5-.7-.5-.2 0-.4 0-.6 0-.2 0-.5.1-.8.4-.3.3-1 1-1 2.4 0 1.4 1 2.8 1.2 3 .2.2 2 3 4.7 4.2 2.7 1.1 2.7.8 3.2.7.5 0 1.8-.7 2-1.4.3-.7.3-1.3.2-1.4-.1-.1-.3-.2-.6-.3M12 2a10 10 0 00-8.8 15l-1.2 4.3 4.4-1.2A10 10 0 1012 2"/></svg>';

function waUrl(message) {
  return `https://wa.me/${WA}?text=${encodeURIComponent(message)}`;
}

async function loadCatalog() {
  const grid = document.getElementById('catalog-grid');
  if (!grid) return;
  try {
    const res = await fetch('data/products.json', { cache: 'no-store' });
    const products = await res.json();
    const featured = products.filter(p => p.featured);
    const rest = products.filter(p => !p.featured);
    const ordered = [...featured, ...rest];

    grid.innerHTML = ordered.map(p => {
      const name = p.name + (p.suffix ? ' ' + p.suffix : '');
      const price = p.price ? `<span class="tile-price">XCG ${p.price.toLocaleString()}</span>` : `<span class="tile-price muted">Message for pricing</span>`;
      const cta = p.landingPage
        ? `<a class="btn btn-ghost tile-cta" href="${p.landingPage}">View details</a>`
        : `<a class="btn btn-ghost tile-cta" target="_blank" rel="noopener" href="${waUrl("Hi, I'm interested in the " + name + ". Is it available?")}">${WA_ICON} WhatsApp</a>`;
      const badge = p.featured ? '<span class="tile-badge">Featured</span>' : '';
      const kingsdayBadge = p.kingsday !== false ? '<span class="tile-kingsday">Kingsday</span>' : '';
      const png = p.image.replace(/\.jpe?g$/i, '.png');
      return `
        <article class="tile ${p.featured ? 'tile-featured' : ''}">
          ${badge}
          ${kingsdayBadge}
          <img src="img/products/${png}" alt="${name}" loading="lazy" data-fallback="img/products/${p.image}" onerror="if(!this.dataset.fell){this.dataset.fell=1;this.src=this.dataset.fallback}else{this.style.visibility='hidden'}">
          <h3 class="tile-name">${name}</h3>
          ${price}
          ${cta}
        </article>`;
    }).join('');
  } catch (e) {
    grid.innerHTML = '<p class="section-note">Catalog is loading. Refresh in a moment, or <a href="https://wa.me/' + WA + '">message us on WhatsApp</a>.</p>';
  }
}

function initReveal() {
  document.documentElement.classList.add('js');
  const observer = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('in');
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.15 });
  document.querySelectorAll('.reveal').forEach((el, i) => {
    el.style.transitionDelay = (i * 80) + 'ms';
    observer.observe(el);
  });
}

document.addEventListener('DOMContentLoaded', () => {
  initReveal();
  loadCatalog();
});
