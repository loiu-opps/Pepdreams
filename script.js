/* ============================================
   Pepdream Labs — Order Flow Script
   ============================================ */

// ---------- Marquee / strip fill ----------
// -50% translateX only loops seamlessly when content width >= 2× viewport.
// Clone items until that condition is met.
(function () {
  function expandTrack(trackEl) {
    if (!trackEl) return;
    const unit = trackEl.innerHTML;
    let guard = 20;
    while (trackEl.scrollWidth < window.innerWidth * 2 && guard-- > 0) {
      trackEl.insertAdjacentHTML('beforeend', unit);
    }
  }
  expandTrack(document.querySelector('.marquee-track'));
  expandTrack(document.querySelector('.strip-track'));
}());

// ---------- Scroll reveal animation ----------
const io = new IntersectionObserver((entries) => {
  entries.forEach(e => {
    if (e.isIntersecting) {
      e.target.classList.add('in');
      io.unobserve(e.target);
    }
  });
}, { threshold: 0.12 });
document.querySelectorAll('.reveal').forEach(el => io.observe(el));

// ---------- Toast notifications ----------
function showToast(msg) {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.classList.add('show');
  setTimeout(() => t.classList.remove('show'), 2400);
}

// ---------- Cart state ----------
let cartItems = [];
const cartCountEl = document.getElementById('cartCount');

function getCartCount() {
  return cartItems.reduce((sum, item) => sum + item.qty, 0);
}

function getCartTotal() {
  return cartItems.reduce((sum, item) => sum + item.price * item.qty, 0);
}

function updateCartBadge() {
  const count = getCartCount();
  cartCountEl.textContent = count;
  cartCountEl.style.display = count > 0 ? 'grid' : 'none';
}

function renderCartDrawer() {
  const itemsEl = document.getElementById('cartItems');
  const footEl  = document.getElementById('cartFoot');

  if (cartItems.length === 0) {
    itemsEl.innerHTML = '<p class="cart-empty">Your bag is empty.</p>';
    footEl.style.display = 'none';
  } else {
    footEl.style.display = 'block';
    itemsEl.innerHTML = cartItems.map((item, idx) => `
      <div class="cart-item">
        <div class="cart-item-thumb">
          <img src="${item.img}" alt="${item.name}"/>
        </div>
        <div class="cart-item-info">
          <div class="cart-item-name">${item.name}</div>
          <div class="cart-item-sub">${item.sub}</div>
          <div class="cart-item-row">
            <div class="cart-qty">
              <button class="cart-qty-btn" data-idx="${idx}" data-delta="-1">−</button>
              <span class="cart-qty-num">${item.qty}</span>
              <button class="cart-qty-btn" data-idx="${idx}" data-delta="1">+</button>
            </div>
            <span class="cart-item-price">₱${(item.price * item.qty).toLocaleString()}</span>
          </div>
        </div>
        <button class="cart-item-delete" data-idx="${idx}" aria-label="Remove item">
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M1 1l10 10M11 1L1 11" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg>
        </button>
      </div>
    `).join('');

    document.getElementById('cartSubtotal').textContent = '₱' + getCartTotal().toLocaleString();

    // Qty buttons
    itemsEl.querySelectorAll('.cart-qty-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const idx   = parseInt(btn.dataset.idx);
        const delta = parseInt(btn.dataset.delta);
        const item  = cartItems[idx];
        if (delta > 0) {
          const stock = stockMap[item.name] ?? Infinity;
          if (item.qty >= stock) { showToast('No more stock available'); return; }
        }
        item.qty += delta;
        if (item.qty <= 0) cartItems.splice(idx, 1);
        renderCartDrawer();
        updateStockUI();
      });
    });

    // Delete buttons
    itemsEl.querySelectorAll('.cart-item-delete').forEach(btn => {
      btn.addEventListener('click', () => {
        cartItems.splice(parseInt(btn.dataset.idx), 1);
        renderCartDrawer();
        updateStockUI();
      });
    });
  }

  updateCartBadge();
}

function openCart() {
  document.getElementById('cartDrawer').classList.add('open');
  document.getElementById('cartBackdrop').classList.add('open');
  document.body.classList.add('modal-open');
}

function closeCart() {
  document.getElementById('cartDrawer').classList.remove('open');
  document.getElementById('cartBackdrop').classList.remove('open');
  document.body.classList.remove('modal-open');
}

renderCartDrawer();

document.getElementById('cartBtn').addEventListener('click', openCart);
document.getElementById('cartDrawerClose').addEventListener('click', closeCart);
document.getElementById('cartBackdrop').addEventListener('click', closeCart);

document.getElementById('cartCheckoutBtn').addEventListener('click', () => {
  closeCart();
  document.getElementById('order').scrollIntoView({ behavior: 'smooth' });
  if (cartItems[0]) {
    const radio = document.querySelector(`input[name="product"][value="${cartItems[0].name}"]`);
    if (radio) radio.checked = true;
  }
});

// ---------- Stock map ----------
const stockMap = {};
document.querySelectorAll('.product').forEach(p => {
  if (p.dataset.stock) stockMap[p.dataset.name] = parseInt(p.dataset.stock);
});

function getCartQty(name) {
  const item = cartItems.find(i => i.name === name);
  return item ? item.qty : 0;
}

function updateStockUI() {
  document.querySelectorAll('.product').forEach(product => {
    const name   = product.dataset.name;
    const stock  = stockMap[name] ?? Infinity;
    const inCart = getCartQty(name);
    const addBtn = product.querySelector('.add-btn');

    if (inCart >= stock) {
      addBtn.disabled = true;
      addBtn.textContent = '–';
    } else {
      addBtn.disabled = false;
      if (addBtn.textContent === '–') addBtn.textContent = '+';
    }
  });
}

// ---------- Add to cart from product cards ----------
document.querySelectorAll('.product').forEach(product => {
  const addBtn = product.querySelector('.add-btn');
  addBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    const name  = product.dataset.name;
    const price = parseInt(product.dataset.price);
    const img   = product.dataset.img || '';
    const sub   = product.querySelector('.sub')?.textContent || '';
    const stock = stockMap[name] ?? Infinity;

    if (getCartQty(name) >= stock) {
      showToast('No more stock available');
      return;
    }

    const existing = cartItems.findIndex(i => i.name === name);
    if (existing >= 0) {
      cartItems[existing].qty += 1;
    } else {
      cartItems.push({ name, price, img, sub, qty: 1 });
    }

    renderCartDrawer();
    updateStockUI();
    openCart();

    addBtn.textContent = '✓';
    setTimeout(() => { if (!addBtn.disabled) addBtn.textContent = '+'; else addBtn.textContent = '–'; }, 1500);
  });
});
updateStockUI();

// ---------- Product detail modal ----------
const prodModal   = document.getElementById('prodModal');
const prodClose   = document.getElementById('prodModalClose');

function openProdModal(card) {
  document.getElementById('prodModalImg').src    = card.dataset.img || '';
  document.getElementById('prodModalImg').alt    = card.dataset.name;
  document.getElementById('prodModalTitle').textContent = card.dataset.name;
  const paras = (card.dataset.desc || '').split('||').filter(Boolean);
  document.getElementById('prodModalDesc').innerHTML = paras.map(p => `<p>${p}</p>`).join('');
  document.getElementById('prodModalPrice').textContent = '₱' + parseInt(card.dataset.price).toLocaleString();

  const specs = (card.dataset.specs || '').split('|').filter(Boolean);
  const ul = document.getElementById('prodModalSpecs');
  ul.innerHTML = specs.map(s => `<li>${s}</li>`).join('');

  prodModal.classList.add('show');
  prodModal.setAttribute('aria-hidden', 'false');
  document.body.classList.add('modal-open');
}

function closeProdModal() {
  prodModal.classList.remove('show');
  prodModal.setAttribute('aria-hidden', 'true');
  document.body.classList.remove('modal-open');
}

document.querySelectorAll('.view-btn').forEach(btn => {
  btn.addEventListener('click', (e) => {
    e.stopPropagation();
    openProdModal(btn.closest('.product'));
  });
});

prodClose.addEventListener('click', closeProdModal);
prodModal.addEventListener('click', (e) => { if (e.target === prodModal) closeProdModal(); });

document.getElementById('prodModalOrder').addEventListener('click', () => {
  const name  = document.getElementById('prodModalTitle').textContent;
  const stock = stockMap[name] ?? Infinity;

  if (getCartQty(name) >= stock) {
    showToast('No more stock available');
    return;
  }

  const img   = document.getElementById('prodModalImg').src;
  const price = parseInt(document.getElementById('prodModalPrice').textContent.replace(/[^\d]/g, ''));
  const sub   = document.querySelector('.product[data-name="' + name + '"] .sub')?.textContent || '';

  const existing = cartItems.findIndex(i => i.name === name);
  if (existing >= 0) {
    cartItems[existing].qty += 1;
  } else {
    cartItems.push({ name, price, img, sub, qty: 1 });
  }
  renderCartDrawer();
  updateStockUI();
  closeProdModal();
  setTimeout(openCheckout, 80);
});

// ---------- Checkout Overlay ----------
function openCheckout() {
  if (cartItems.length === 0) {
    showToast('Your bag is empty — add a product first!');
    return;
  }
  renderCheckoutSummary();
  document.getElementById('checkoutOverlay').classList.add('open');
  document.getElementById('checkoutOverlay').setAttribute('aria-hidden', 'false');
  document.body.classList.add('modal-open');
  document.getElementById('checkoutOverlay').scrollTop = 0;
}

function closeCheckout() {
  document.getElementById('checkoutOverlay').classList.remove('open');
  document.getElementById('checkoutOverlay').setAttribute('aria-hidden', 'true');
  document.body.classList.remove('modal-open');
}

function renderCheckoutSummary() {
  const total = getCartTotal();
  document.getElementById('coItems').innerHTML = cartItems.map(item => `
    <div class="co-item">
      <div class="co-item-thumb-wrap">
        <div class="co-item-thumb"><img src="${item.img}" alt="${item.name}"/></div>
        <span class="co-item-qty-badge">${item.qty}</span>
      </div>
      <div style="flex:1;min-width:0">
        <div class="co-item-name">${item.name}</div>
        <div class="co-item-sub">${item.sub}</div>
      </div>
      <span class="co-item-price">₱${(item.price * item.qty).toLocaleString()}</span>
    </div>
  `).join('');
  document.getElementById('coSubtotal').textContent = '₱' + total.toLocaleString();
  document.getElementById('coTotal').textContent    = '₱' + total.toLocaleString();
}

document.getElementById('checkoutClose').addEventListener('click', closeCheckout);

document.getElementById('cartCheckoutBtn').addEventListener('click', () => {
  closeCart();
  setTimeout(openCheckout, 80);
});

document.getElementById('checkoutForm').addEventListener('submit', (e) => {
  e.preventDefault();

  const email   = document.getElementById('coEmail').value.trim();
  const fname   = document.getElementById('coFname').value.trim();
  const lname   = document.getElementById('coLname').value.trim();
  const address = document.getElementById('coAddress').value.trim();
  const city    = document.getElementById('coCity').value.trim();
  const payment = document.querySelector('input[name="coPayment"]:checked');
  const agreed  = document.getElementById('coAgree').checked;

  if (!email || !/^\S+@\S+\.\S+$/.test(email)) { showToast('Please enter a valid email'); return; }
  if (!fname || !lname)  { showToast('Please enter your full name'); return; }
  if (!address || !city) { showToast('Please enter your shipping address'); return; }
  if (!payment)          { showToast('Please select a payment method'); return; }
  if (!agreed)           { showToast('Please agree to the Terms & Conditions'); return; }

  const ref = 'PD-' + Date.now().toString(36).toUpperCase().slice(-6);

  document.getElementById('coFormState').style.display   = 'none';
  document.getElementById('coSuccessState').style.display = 'block';
  document.getElementById('coSuccessText').textContent =
    `Thank you, ${fname}! We'll reach out to ${email} within 24 hours with payment instructions.`;
  document.getElementById('coSuccessRef').textContent = `REF: ${ref}`;

  document.getElementById('checkoutOverlay').scrollTop = 0;

  cartItems = [];
  renderCartDrawer();
  showToast('Order placed successfully ✓');
});

document.getElementById('coNewOrderBtn').addEventListener('click', () => {
  closeCheckout();
  document.getElementById('checkoutForm').reset();
  document.getElementById('coFormState').style.display   = 'grid';
  document.getElementById('coSuccessState').style.display = 'none';
});

document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && document.getElementById('checkoutOverlay').classList.contains('open')) {
    closeCheckout();
  }
});

// ---------- WhatsApp button ----------
document.getElementById('waBtn').addEventListener('click', () => {
  // Replace with your actual WhatsApp number
  const phone = '639272348087';
  const message = encodeURIComponent("Hi Pepdream Labs! I'd like to inquire about your products.");
  window.open(`https://wa.me/${phone}?text=${message}`, '_blank');
});
// ---------- Policy & Shipping modals ----------
function openTermsModal() {
  document.getElementById('termsTextModal').classList.add('open');
  document.getElementById('termsBackdrop').classList.add('open');
  document.body.style.overflow = 'hidden';
}
function closeTermsModal() {
  document.getElementById('termsTextModal').classList.remove('open');
  document.getElementById('termsBackdrop').classList.remove('open');
  document.body.style.overflow = '';
}
function openAboutModal() {
  document.getElementById('aboutModal').classList.add('open');
  document.getElementById('aboutBackdrop').classList.add('open');
  document.body.style.overflow = 'hidden';
}
function closeAboutModal() {
  document.getElementById('aboutModal').classList.remove('open');
  document.getElementById('aboutBackdrop').classList.remove('open');
  document.body.style.overflow = '';
}
function openPrivacyModal() {
  document.getElementById('privacyModal').classList.add('open');
  document.getElementById('privacyBackdrop').classList.add('open');
  document.body.style.overflow = 'hidden';
}
function closePrivacyModal() {
  document.getElementById('privacyModal').classList.remove('open');
  document.getElementById('privacyBackdrop').classList.remove('open');
  document.body.style.overflow = '';
}
function openShippingModal() {
  document.getElementById('shippingModal').classList.add('open');
  document.getElementById('shippingBackdrop').classList.add('open');
  document.body.style.overflow = 'hidden';
}
function closeShippingModal() {
  document.getElementById('shippingModal').classList.remove('open');
  document.getElementById('shippingBackdrop').classList.remove('open');
  document.body.style.overflow = '';
}

// Close policy/shipping modals on Escape
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    if (document.getElementById('aboutModal').classList.contains('open')) closeAboutModal();
    if (document.getElementById('termsTextModal').classList.contains('open')) closeTermsModal();
    if (document.getElementById('privacyModal').classList.contains('open')) closePrivacyModal();
    if (document.getElementById('shippingModal').classList.contains('open')) closeShippingModal();
  }
});

// ---------- Contact Form ----------
(function(){
  const DISPOSABLE_DOMAINS = new Set([
    'mailinator.com','guerrillamail.com','temp-mail.org','throwam.com',
    'trashmail.com','yopmail.com','sharklasers.com','guerrillamailblock.com',
    'grr.la','guerrillamail.info','guerrillamail.biz','guerrillamail.de',
    'guerrillamail.net','guerrillamail.org','spam4.me','tempmail.com',
    'tempr.email','dispostable.com','mailnull.com','spamgourmet.com',
    'trashmail.at','trashmail.io','trashmail.me','trashmail.net',
    'fakeinbox.com','maildrop.cc','discard.email','mailnesia.com',
    'mailnull.com','spamoff.de','getnada.com','nada.email',
    'mohmal.com','throwam.com','spamex.com','mailexpire.com',
    'tempinbox.com','getairmail.com','filzmail.com','mailboxy.fun',
    'inboxbear.com','tempail.com','mytemp.email','emailondeck.com',
  ]);

  function validateEmail(email) {
    // Basic format check
    const formatRe = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
    if (!formatRe.test(email)) return 'Please enter a valid email address.';

    const [local, domain] = email.toLowerCase().split('@');

    // Block disposable domains
    if (DISPOSABLE_DOMAINS.has(domain)) return 'Disposable email addresses are not accepted.';

    // Gmail-specific rules
    if (domain === 'gmail.com') {
      const gmailLocal = local.replace(/\./g, ''); // dots are ignored by Gmail
      if (gmailLocal.length < 6 || gmailLocal.length > 30)
        return 'That Gmail address doesn\'t look valid (must be 6–30 characters).';
      if (!/^[a-z0-9.]+$/.test(local))
        return 'That Gmail address contains invalid characters.';
      if (/\.\./.test(local) || local.startsWith('.') || local.endsWith('.'))
        return 'That Gmail address doesn\'t look valid.';
    }

    return null; // valid
  }

  const form = document.getElementById('contactForm');
  if (!form) return;

  const emailInput = document.getElementById('cfEmail');
  let errorEl = document.getElementById('cfEmailError');
  if (!errorEl) {
    errorEl = document.createElement('span');
    errorEl.id = 'cfEmailError';
    errorEl.style.cssText = 'color:#e07070;font-size:12px;margin-top:4px;display:none';
    emailInput.parentElement.appendChild(errorEl);
  }

  function showError(msg) {
    errorEl.textContent = msg;
    errorEl.style.display = msg ? 'block' : 'none';
    emailInput.style.borderColor = msg ? '#e07070' : '';
  }

  emailInput.addEventListener('input', () => {
    if (errorEl.style.display !== 'none') showError('');
  });

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = emailInput.value.trim();
    const message = document.getElementById('cfMessage').value.trim();

    const emailErr = validateEmail(email);
    if (emailErr) { showError(emailErr); emailInput.focus(); return; }
    if (!message) return;

    showError('');
    const btn = form.querySelector('.cf-submit');
    btn.disabled = true;
    btn.textContent = 'Sending…';

    await fetch('https://formsubmit.co/ajax/pepdreams67@gmail.com', {
      method: 'POST',
      headers: {'Content-Type':'application/json','Accept':'application/json'},
      body: JSON.stringify({
        name: (document.getElementById('cfName').value + ' ' + document.getElementById('cfLname').value).trim(),
        email,
        message,
        _subject: 'New message from Pepdream Labs website'
      })
    }).catch(()=>{});

    form.style.display = 'none';
    document.getElementById('cfSuccess').style.display = 'flex';
  });
})();
