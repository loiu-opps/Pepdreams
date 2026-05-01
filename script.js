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
let cartCount = 0;
const cartCountEl = document.getElementById('cartCount');

function updateCart(n) {
  cartCount += n;
  cartCountEl.textContent = cartCount;
  cartCountEl.style.display = cartCount > 0 ? 'grid' : 'none';
}
updateCart(0);

document.getElementById('cartBtn').addEventListener('click', () => {
  if (cartCount === 0) {
    showToast('Cart is empty — start shopping!');
  } else {
    showToast(`${cartCount} item(s) in cart — scroll to order`);
    document.getElementById('order').scrollIntoView({ behavior: 'smooth' });
  }
});

// ---------- Add to cart from product cards ----------
document.querySelectorAll('.product').forEach(product => {
  const addBtn = product.querySelector('.add-btn');
  addBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    const name = product.dataset.name;
    addBtn.textContent = '✓';
    updateCart(1);
    showToast(`${name} added to cart`);

    // Pre-select in form
    const radio = document.querySelector(`input[name="product"][value="${name}"]`);
    if (radio) radio.checked = true;

    setTimeout(() => addBtn.textContent = '+', 1500);
  });
});

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
  closeProdModal();
  const name = document.getElementById('prodModalTitle').textContent;
  const radio = document.querySelector(`input[name="product"][value="${name}"]`);
  if (radio) radio.checked = true;
});

// ---------- Multi-step form ----------
const form = document.getElementById('orderForm');
const steps = form.querySelectorAll('.form-step');
const progressBar = document.getElementById('progressBar');
const progressLabels = form.querySelectorAll('.progress-labels span');
const stepItems = document.querySelectorAll('.step-item');

let currentStep = 1;

function goToStep(n) {
  currentStep = n;

  // Hide all steps, show target
  steps.forEach(s => s.classList.remove('active'));
  const target = form.querySelector(`.form-step[data-step="${n}"]`);
  if (target) target.classList.add('active');

  // Progress bar
  progressBar.classList.remove('step-2', 'step-3');
  if (n === 2) progressBar.classList.add('step-2');
  if (n >= 3) progressBar.classList.add('step-3');

  // Progress labels
  progressLabels.forEach(label => {
    const labelStep = parseInt(label.dataset.label);
    label.classList.toggle('active', labelStep <= n);
  });

  // Sidebar steps
  stepItems.forEach(item => {
    const itemStep = parseInt(item.dataset.step);
    item.classList.remove('active', 'done');
    if (itemStep === n) item.classList.add('active');
    else if (itemStep < n) item.classList.add('done');
  });

  // Scroll form into view
  if (n <= 3) {
    document.getElementById('order').scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
}

// ---------- Validation per step ----------
function validateStep(n) {
  if (n === 1) {
    const product = form.querySelector('input[name="product"]:checked');
    if (!product) {
      showToast('Please select a product');
      return false;
    }
    return true;
  }
  if (n === 2) {
    const fname = document.getElementById('fname').value.trim();
    const lname = document.getElementById('lname').value.trim();
    const email = document.getElementById('email').value.trim();
    const address = document.getElementById('address').value.trim();
    const payment = form.querySelector('input[name="payment"]:checked');

    if (!fname || !lname) { showToast('Please enter your name'); return false; }
    if (!email || !/^\S+@\S+\.\S+$/.test(email)) { showToast('Please enter a valid email'); return false; }
    if (!address) { showToast('Please enter shipping address'); return false; }
    if (!payment) { showToast('Please select a payment method'); return false; }
    return true;
  }
  return true;
}

// ---------- Build summary on Step 3 ----------
function buildSummary() {
  const product = form.querySelector('input[name="product"]:checked');
  const qty = parseInt(document.getElementById('qty').value) || 1;
  const price = parseInt(product.dataset.price) || 0;
  const subtotal = price * qty;

  const fname = document.getElementById('fname').value.trim();
  const lname = document.getElementById('lname').value.trim();
  const email = document.getElementById('email').value.trim();
  const phone = document.getElementById('phone').value.trim();
  const address = document.getElementById('address').value.trim();
  const payment = form.querySelector('input[name="payment"]:checked').value;

  const summary = document.getElementById('summary');
  summary.innerHTML = `
    <div class="summary-row"><span class="lab">Product</span><span class="val">${product.value}</span></div>
    <div class="summary-row"><span class="lab">Quantity</span><span class="val">${qty}</span></div>
    <div class="summary-row"><span class="lab">Customer</span><span class="val">${fname} ${lname}</span></div>
    <div class="summary-row"><span class="lab">Email</span><span class="val">${email}</span></div>
    ${phone ? `<div class="summary-row"><span class="lab">Phone</span><span class="val">${phone}</span></div>` : ''}
    <div class="summary-row"><span class="lab">Ship to</span><span class="val">${address.substring(0, 40)}${address.length > 40 ? '…' : ''}</span></div>
    <div class="summary-row"><span class="lab">Payment</span><span class="val">${payment}</span></div>
    <div class="summary-row total"><span class="lab">Total</span><span class="val">₱${subtotal.toLocaleString()}</span></div>
  `;
}

// ---------- Quantity controls ----------
document.querySelectorAll('.qty-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    const input = document.getElementById('qty');
    let val = parseInt(input.value) || 1;
    if (btn.dataset.action === 'inc' && val < 20) val++;
    if (btn.dataset.action === 'dec' && val > 1) val--;
    input.value = val;
  });
});

// ---------- Next/Back navigation ----------
form.querySelectorAll('.next-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    const next = parseInt(btn.dataset.next);
    if (validateStep(currentStep)) {
      if (next === 3) buildSummary();
      goToStep(next);
    }
  });
});

form.querySelectorAll('.back-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    goToStep(parseInt(btn.dataset.back));
  });
});

// ---------- Modal: Terms & Conditions ----------
const modal = document.getElementById('termsModal');
const modalCloseBtn = document.getElementById('modalCloseBtn');
const declineBtn = document.getElementById('declineBtn');
const openTermsBtn = document.getElementById('openTermsBtn');
const agreeCheckbox = document.getElementById('agreeTerms');
const confirmSubmitBtn = document.getElementById('confirmSubmitBtn');

function openModal() {
  agreeCheckbox.checked = false;
  confirmSubmitBtn.disabled = true;
  modal.classList.add('show');
  modal.setAttribute('aria-hidden', 'false');
  document.body.classList.add('modal-open');
}

function closeModal() {
  modal.classList.remove('show');
  modal.setAttribute('aria-hidden', 'true');
  document.body.classList.remove('modal-open');
}

openTermsBtn.addEventListener('click', openModal);
modalCloseBtn.addEventListener('click', closeModal);
declineBtn.addEventListener('click', closeModal);

// Close on overlay click
modal.addEventListener('click', (e) => {
  if (e.target === modal) closeModal();
});

// Close on Escape key
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && modal.classList.contains('show')) closeModal();
});

// Toggle confirm button on checkbox
agreeCheckbox.addEventListener('change', () => {
  confirmSubmitBtn.disabled = !agreeCheckbox.checked;
});

// ---------- Final submit (after agreeing to terms) ----------
confirmSubmitBtn.addEventListener('click', () => {
  if (!agreeCheckbox.checked) return;

  // Generate order reference
  const ref = 'PD-' + Date.now().toString(36).toUpperCase().slice(-6);
  document.getElementById('orderRef').textContent = `REF: ${ref}`;

  closeModal();
  goToStep(4);
  showToast('Order submitted successfully ✓');

  // Reset cart
  cartCount = 0;
  updateCart(0);

  // Here you would typically send the data to your backend:
  // fetch('/api/orders', { method: 'POST', body: JSON.stringify(orderData) })
});

// ---------- New order button (after success) ----------
document.getElementById('newOrderBtn').addEventListener('click', () => {
  form.reset();
  document.getElementById('qty').value = 1;
  goToStep(1);
});

// ---------- Form submit prevention (we handle it manually) ----------
form.addEventListener('submit', (e) => e.preventDefault());

// ---------- WhatsApp button ----------
document.getElementById('waBtn').addEventListener('click', () => {
  // Replace with your actual WhatsApp number
  const phone = '639XXXXXXXXX';
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
    if (document.getElementById('termsTextModal').classList.contains('open')) closeTermsModal();
    if (document.getElementById('privacyModal').classList.contains('open')) closePrivacyModal();
    if (document.getElementById('shippingModal').classList.contains('open')) closeShippingModal();
  }
});