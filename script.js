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

document.getElementById('checkoutForm').addEventListener('submit', async (e) => {
  e.preventDefault();

  const email    = document.getElementById('coEmail').value.trim();
  const fname    = document.getElementById('coFname').value.trim();
  const lname    = document.getElementById('coLname').value.trim();
  const address  = document.getElementById('coAddress').value.trim();
  const province = document.getElementById('coProvince').value.trim();
  const city     = document.getElementById('coCity').value.trim();
  const phone    = document.getElementById('coPhone').value.trim();
  const payment  = document.querySelector('input[name="coPayment"]:checked');
  const agreed   = document.getElementById('coAgree').checked;

  const emailErr = validateEmail(email);
  if (emailErr) { showToast(emailErr); return; }
  if (!fname || !lname)  { showToast('Please enter your full name'); return; }
  if (!address || !city) { showToast('Please enter your shipping address'); return; }
  if (!payment)          { showToast('Please select a payment method'); return; }
  if (!agreed) {
    const err = document.getElementById('coAgreeError');
    err.classList.add('visible');
    err.scrollIntoView({ behavior: 'smooth', block: 'center' });
    document.getElementById('coAgree').focus();
    return;
  }

  const ref = generateOrderRef();

  const orderLines = cartItems.map(i =>
    `${i.name} x${i.qty} — ₱${(i.price * i.qty).toLocaleString()}`
  ).join('\n');

  fetch('https://formsubmit.co/ajax/pepdreams67@gmail.com', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
    body: JSON.stringify({
      _subject: `New Order ${ref} — Pepdreams`,
      Reference: ref,
      Name: `${fname} ${lname}`,
      Email: email,
      Phone: phone || 'N/A',
      Address: `${address}, ${city}${province ? ', ' + province : ''}`,
      Payment: payment.value,
      Items: orderLines,
      Total: `₱${getCartTotal().toLocaleString()}`,
    })
  }).catch(() => {});

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

document.getElementById('coPhone').addEventListener('input', (e) => {
  e.target.value = e.target.value.replace(/\D/g, '');
});

document.getElementById('coAgree').addEventListener('change', () => {
  if (document.getElementById('coAgree').checked) {
    document.getElementById('coAgreeError').classList.remove('visible');
  }
});

document.getElementById('coNewOrderBtn').addEventListener('click', () => {
  closeCheckout();
  document.getElementById('checkoutForm').reset();
  resetCitySelect();
  document.getElementById('coFormState').style.display   = 'grid';
  document.getElementById('coSuccessState').style.display = 'none';
});

// ---------- Philippine Province / City Data ----------
const PH_DATA = {
  "Metro Manila": ["Caloocan","Las Piñas","Makati","Malabon","Mandaluyong","Manila","Marikina","Muntinlupa","Navotas","Parañaque","Pasay","Pasig","Pateros","Quezon City","San Juan","Taguig","Valenzuela"],
  "Abra": ["Bangued","Boliney","Bucay","Bucloc","Daguioman","Danglas","Dolores","La Paz","Lacub","Lagangilang","Lagayan","Langiden","Licuan-Baay","Luba","Malibcong","Manabo","Peñarrubia","Pidigan","Pilar","Sallapadan","San Isidro","San Juan","San Quintin","Tayum","Tineg","Tubo","Villaviciosa"],
  "Agusan del Norte": ["Butuan","Cabadbaran","Carmen","Jabonga","Kitcharao","Las Nieves","Magallanes","Nasipit","Remedios T. Romualdez","Santiago","Tubay"],
  "Agusan del Sur": ["Bayugan","Bunawan","Esperanza","La Paz","Loreto","Prosperidad","Rosario","San Francisco","San Luis","Santa Josefa","Sibagat","Talacogon","Trento","Veruela"],
  "Aklan": ["Altavas","Balete","Banga","Batan","Buruanga","Ibajay","Kalibo","Lezo","Libacao","Madalag","Makato","Malay","Malinao","Nabas","New Washington","Numancia","Tangalan"],
  "Albay": ["Bacacay","Camalig","Daraga","Guinobatan","Jovellar","Legazpi","Libon","Ligao","Malilipot","Malinao","Manito","Oas","Pio Duran","Polangui","Rapu-Rapu","Santo Domingo","Tabaco","Tiwi"],
  "Antique": ["Anini-y","Barbaza","Belison","Bugasong","Caluya","Culasi","Hamtic","Laua-an","Libertad","Pandan","Patnongon","San Jose de Buenavista","San Remigio","Sebaste","Sibalom","Tibiao","Tobias Fornier","Valderrama"],
  "Apayao": ["Calanasan","Conner","Flora","Kabugao","Luna","Pudtol","Santa Marcela"],
  "Aurora": ["Baler","Casiguran","Dilasag","Dinalungan","Dingalan","Dipaculao","Maria Aurora","San Luis"],
  "Basilan": ["Akbar","Al-Barka","Hadji Mohammad Ajul","Hadji Muhtamad","Isabela City","Lamitan","Lantawan","Maluso","Sumisip","Tipo-Tipo","Tuburan","Ungkaya Pukan"],
  "Bataan": ["Abucay","Bagac","Balanga","Dinalupihan","Hermosa","Limay","Mariveles","Morong","Orani","Orion","Pilar","Samal"],
  "Batanes": ["Basco","Itbayat","Ivana","Mahatao","Sabtang","Uyugan"],
  "Batangas": ["Agoncillo","Alitagtag","Balayan","Balete","Batangas City","Bauan","Calaca","Calatagan","Cuenca","Ibaan","Laurel","Lemery","Lian","Lipa","Lobo","Mabini","Malvar","Mataasnakahoy","Nasugbu","Padre Garcia","Rosario","San Jose","San Juan","San Luis","San Nicolas","San Pascual","Santa Teresita","Santo Tomas","Taal","Talisay","Tanauan","Taysan","Tingloy","Tuy"],
  "Benguet": ["Atok","Baguio","Bakun","Bokod","Buguias","Itogon","Kabayan","Kibungan","La Trinidad","Mankayan","Sablan","Tuba","Tublay"],
  "Biliran": ["Almeria","Biliran","Cabucgayan","Caibiran","Culaba","Kawayan","Maripipi","Naval"],
  "Bohol": ["Alburquerque","Alicia","Anda","Antequera","Baclayon","Balilihan","Batuan","Bien Unido","Bilar","Buenavista","Calape","Candijay","Carmen","Catigbian","Clarin","Corella","Cortes","Dagohoy","Danao","Dauis","Dimiao","Duero","Garcia Hernandez","Guindulman","Inabanga","Jagna","Lila","Loay","Loboc","Loon","Mabini","Maribojoc","Panglao","Pilar","Sagbayan","San Isidro","San Miguel","Sevilla","Sierra Bullones","Sikatuna","Tagbilaran","Talibon","Trinidad","Tubigon","Ubay","Valencia"],
  "Bukidnon": ["Baungon","Cabanglasan","Damulog","Dangcagan","Don Carlos","Impasug-ong","Kadingilan","Kalilangan","Kibawe","Kitaotao","Lantapan","Libona","Malitbog","Malaybalay","Manolo Fortich","Maramag","Pangantucan","Quezon","San Fernando","Sumilao","Talakag","Valencia"],
  "Bulacan": ["Angat","Balagtas","Baliuag","Bocaue","Bulakan","Bustos","Calumpit","Doña Remedios Trinidad","Guiguinto","Hagonoy","Malolos","Marilao","Meycauayan","Norzagaray","Obando","Pandi","Paombong","Plaridel","Pulilan","San Ildefonso","San Jose del Monte","San Miguel","San Rafael","Santa Maria"],
  "Cagayan": ["Abulug","Alcala","Allacapan","Amulung","Aparri","Baggao","Ballesteros","Buguey","Calayan","Camalaniugan","Claveria","Enrile","Gattaran","Gonzaga","Iguig","Lal-lo","Lasam","Pamplona","Peñablanca","Piat","Rizal","Sanchez-Mira","Santa Ana","Santa Praxedes","Santa Teresita","Santo Niño","Solana","Tuao","Tuguegarao"],
  "Camarines Norte": ["Basud","Capalonga","Daet","Jose Panganiban","Labo","Mercedes","Paracale","San Lorenzo Ruiz","San Vicente","Santa Elena","Talisay","Vinzons"],
  "Camarines Sur": ["Baao","Balatan","Bato","Bombon","Buhi","Bula","Cabusao","Calabanga","Camaligan","Canaman","Caramoan","Del Gallego","Gainza","Garchitorena","Goa","Iriga","Lagonoy","Libmanan","Lupi","Magarao","Milaor","Minalabac","Nabua","Naga","Ocampo","Pamplona","Pasacao","Pili","Presentacion","Ragay","Sagñay","San Fernando","San Jose","Sipocot","Siruma","Tigaon","Tinambac"],
  "Camiguin": ["Catarman","Guinsiliban","Mahinog","Mambajao","Sagay"],
  "Capiz": ["Cuartero","Dao","Dumalag","Dumarao","Ivisan","Jamindan","Maayon","Mambusao","Panay","Panitan","Pilar","Pontevedra","President Roxas","Roxas","Sapi-an","Sigma","Tapaz"],
  "Catanduanes": ["Bagamanoc","Baras","Bato","Caramoran","Gigmoto","Pandan","Panganiban","San Andres","San Miguel","Viga","Virac"],
  "Cavite": ["Alfonso","Amadeo","Bacoor","Carmona","Cavite City","Dasmariñas","General Emilio Aguinaldo","General Mariano Alvarez","General Trias","Imus","Indang","Kawit","Magallanes","Maragondon","Mendez","Naic","Noveleta","Rosario","Silang","Tagaytay","Tanza","Ternate","Trece Martires"],
  "Cebu": ["Alcantara","Alcoy","Alegria","Aloguinsan","Argao","Asturias","Badian","Balamban","Bantayan","Barili","Bogo","Boljoon","Borbon","Carcar","Carmen","Catmon","Cebu City","Compostela","Consolacion","Cordova","Daanbantayan","Dalaguete","Danao","Dumanjug","Ginatilan","Lapu-Lapu","Liloan","Madridejos","Malabuyoc","Mandaue","Medellin","Minglanilla","Moalboal","Naga","Oslob","Pilar","Pinamungajan","Poro","Ronda","Samboan","San Fernando","San Francisco","San Remigio","Santa Fe","Santander","Sibonga","Sogod","Tabogon","Tabuelan","Talisay","Toledo","Tuburan","Tudela"],
  "Cotabato": ["Alamada","Aleosan","Antipas","Arakan","Banisilan","Carmen","Kabacan","Kidapawan","Libungan","Magpet","Makilala","Matalam","Midsayap","Mlang","Pigcawayan","Pikit","President Roxas","Tulunan"],
  "Davao de Oro": ["Compostela","Laak","Mabini","Maco","Maragusan","Mawab","Monkayo","Montevista","Nabunturan","New Bataan","Pantukan"],
  "Davao del Norte": ["Asuncion","Braulio E. Dujali","Carmen","Island Garden City of Samal","Kapalong","New Corella","Panabo","San Isidro","Santo Tomas","Tagum","Talaingod"],
  "Davao del Sur": ["Bansalan","Davao City","Digos","Hagonoy","Kiblawan","Magsaysay","Malalag","Matanao","Padada","Santa Cruz","Sulop"],
  "Davao Occidental": ["Don Marcelino","Jose Abad Santos","Malita","Santa Maria","Sarangani"],
  "Davao Oriental": ["Baganga","Banaybanay","Boston","Caraga","Cateel","Governor Generoso","Lupon","Manay","Mati","San Isidro","Tarragona"],
  "Dinagat Islands": ["Basilisa","Cagdianao","Dinagat","Libjo","Loreto","San Jose","Tubajon"],
  "Eastern Samar": ["Arteche","Balangiga","Balangkayan","Borongan","Can-avid","Dolores","General MacArthur","Giporlos","Guiuan","Hernani","Jipapad","Lawaan","Llorente","Maslog","Maydolong","Mercedes","Oras","Quinapondan","Salcedo","San Julian","San Policarpo","Sulat","Taft"],
  "Guimaras": ["Buenavista","Jordan","Nueva Valencia","San Lorenzo","Sibunag"],
  "Ifugao": ["Aguinaldo","Alfonso Lista","Asipulo","Banaue","Hingyon","Hungduan","Kiangan","Lagawe","Lamut","Mayoyao","Tinoc"],
  "Ilocos Norte": ["Adams","Bacarra","Badoc","Bangui","Banna","Batac","Burgos","Carasi","Currimao","Dingras","Dumalneg","Laoag","Marcos","Nueva Era","Pagudpud","Paoay","Pasuquin","Piddig","Pinili","San Nicolas","Sarrat","Solsona","Vintar"],
  "Ilocos Sur": ["Alilem","Banayoyo","Bantay","Burgos","Cabugao","Candon","Caoayan","Cervantes","Galimuyod","Gregorio del Pilar","Lidlidda","Magsingal","Nagbukel","Narvacan","Quirino","Salcedo","San Emilio","San Esteban","San Ildefonso","San Juan","San Vicente","Santa","Santa Catalina","Santa Cruz","Santa Lucia","Santa Maria","Santiago","Santo Domingo","Sigay","Sinait","Sugpon","Suyo","Tagudin","Vigan"],
  "Iloilo": ["Ajuy","Alimodian","Anilao","Badiangan","Balasan","Banate","Barotac Nuevo","Barotac Viejo","Batad","Bingawan","Cabatuan","Calinog","Carles","Concepcion","Dingle","Dueñas","Dumangas","Estancia","Guimbal","Igbaras","Iloilo City","Janiuay","Lambunao","Leganes","Lemery","Leon","Maasin","Miagao","Mina","New Lucena","Oton","Passi","Pavia","Pototan","San Dionisio","San Enrique","San Joaquin","San Miguel","San Rafael","Santa Barbara","Sara","Tigbauan","Tubungan","Zarraga"],
  "Isabela": ["Alicia","Angadanan","Aurora","Benito Soliven","Burgos","Cabagan","Cabatuan","Cauayan","Cordon","Delfin Albano","Dinapigue","Divilacan","Echague","Gamu","Ilagan","Jones","Luna","Maconacon","Mallig","Naguilian","Palanan","Quezon","Quirino","Ramon","Reina Mercedes","Roxas","San Agustin","San Guillermo","San Isidro","San Manuel","San Mariano","San Mateo","San Pablo","Santa Maria","Santiago","Santo Tomas","Tumauini"],
  "Kalinga": ["Balbalan","Lubuagan","Pasil","Pinukpuk","Rizal","Tabuk","Tanudan","Tinglayan"],
  "La Union": ["Agoo","Aringay","Bacnotan","Bagulin","Balaoan","Bangar","Bauang","Burgos","Caba","Luna","Naguilian","Pugo","Rosario","San Fernando","San Gabriel","San Juan","Santo Tomas","Santol","Sudipen","Tubao"],
  "Laguna": ["Alaminos","Bay","Biñan","Cabuyao","Calamba","Calauan","Cavinti","Famy","Kalayaan","Liliw","Los Baños","Luisiana","Lumban","Mabitac","Magdalena","Majayjay","Nagcarlan","Paete","Pagsanjan","Pakil","Pangil","Pila","Rizal","San Pablo","San Pedro","Santa Cruz","Santa Maria","Santa Rosa","Siniloan","Victoria"],
  "Lanao del Norte": ["Bacolod","Baloi","Baroy","Iligan","Kapatagan","Kauswagan","Kolambugan","Lala","Linamon","Maigo","Matungao","Munai","Nunungan","Pantao Ragat","Pantar","Poona Piagapo","Salvador","Sapad","Sultan Naga Dimaporo","Tagoloan","Tangcal","Tubod"],
  "Lanao del Sur": ["Bacolod-Kalawi","Balabagan","Balindong","Bayang","Binidayan","Buadiposo-Buntong","Bubong","Bumbaran","Butig","Calanogas","Ditsaan-Ramain","Ganassi","Kapai","Kapatagan","Lumba-Bayabao","Lumbaca-Unayan","Lumbatan","Lumbayanague","Madalum","Madamba","Maguing","Malabang","Marantao","Marawi","Marogong","Masiu","Mulondo","Pagayawan","Piagapo","Picong","Poona Bayabao","Pualas","Saguiaran","Sultan Dumalondong","Sultan Gumander","Tagoloan II","Tamparan","Taraka","Tubaran","Tugaya","Wao"],
  "Leyte": ["Abuyog","Alangalang","Albuera","Babatngon","Barugo","Bato","Baybay","Burauen","Calubian","Capoocan","Carigara","Dagami","Dulag","Hilongos","Hindang","Inopacan","Isabel","Jaro","Javier","Julita","Kananga","La Paz","Leyte","MacArthur","Mahaplag","Matag-ob","Matalom","Mayorga","Merida","Ormoc","Palo","Palompon","Pastrana","San Isidro","San Miguel","Santa Fe","Silago","Tabango","Tacloban","Tanauan","Tolosa","Tunga","Villaba"],
  "Maguindanao del Norte": ["Barira","Buldon","Cotabato City","Datu Blah T. Sinsuat","Datu Odin Sinsuat","Kabuntalan","Matanog","Northern Kabuntalan","Parang","Sultan Kudarat","Sultan Mastura","Upi"],
  "Maguindanao del Sur": ["Buluan","Datu Abdullah Sangki","Datu Anggal Midtimbang","Datu Hoffer Ampatuan","Datu Montawal","Datu Piang","Datu Salibo","Datu Saudi-Ampatuan","Datu Unsay","General Salipada K. Pendatun","Guindulungan","Mamasapano","Mangudadatu","Pagalungan","Paglat","Pandag","Raja Buayan","Shariff Aguak","Shariff Saydona Mustapha","South Upi","Sultan sa Barongis","Talayan","Talitay"],
  "Marinduque": ["Boac","Buenavista","Gasan","Mogpog","Santa Cruz","Torrijos"],
  "Masbate": ["Aroroy","Baleno","Balud","Batuan","Cataingan","Cawayan","Claveria","Dimasalang","Esperanza","Mandaon","Masbate City","Milagros","Mobo","Monreal","Palanas","Pio V. Corpuz","Placer","San Fernando","San Jacinto","San Pascual","Uson"],
  "Misamis Occidental": ["Aloran","Baliangao","Bonifacio","Calamba","Clarin","Concepcion","Don Victoriano Chiongbian","Jimenez","Lopez Jaena","Oroquieta","Ozamiz","Panaon","Plaridel","Sapang Dalaga","Sinacaban","Tangub","Tudela"],
  "Misamis Oriental": ["Alubijid","Balingasag","Balingoan","Binuangan","Cagayan de Oro","Claveria","El Salvador","Gingoog","Gitagum","Initao","Jasaan","Kinoguitan","Lagonglong","Laguindingan","Libertad","Lugait","Magsaysay","Manticao","Medina","Naawan","Opol","Salay","Sugbongcogon","Tagoloan","Talisayan","Villanueva"],
  "Mountain Province": ["Barlig","Bauko","Besao","Bontoc","Natonin","Paracelis","Sabangan","Sadanga","Sagada","Tadian"],
  "Negros Occidental": ["Bacolod","Bago","Binalbagan","Cadiz","Calatrava","Candoni","Cauayan","Escalante","Himamaylan","Hinigaran","Hinoba-an","Ilog","Isabela","Kabankalan","La Carlota","La Castellana","Manapla","Moises Padilla","Murcia","Pontevedra","Pulupandan","Sagay","San Carlos","San Enrique","Silay","Sipalay","Talisay","Toboso","Valladolid","Victorias"],
  "Negros Oriental": ["Amlan","Ayungon","Bacong","Bais","Basay","Bayawan","Bindoy","Canlaon","Dauin","Dumaguete","Guihulngan","Jimalalud","La Libertad","Mabinay","Manjuyod","Pamplona","San Jose","Santa Catalina","Siaton","Sibulan","Tanjay","Tayasan","Valencia","Vallehermoso","Zamboanguita"],
  "Northern Samar": ["Allen","Biri","Bobon","Capul","Catarman","Catubig","Gamay","Laoang","Lapinig","Las Navas","Lavezares","Lope de Vega","Mapanas","Mondragon","Palapag","Pambujan","Rosario","San Antonio","San Isidro","San Jose","San Roque","San Vicente","Silvino Lobos","Victoria"],
  "Nueva Ecija": ["Aliaga","Bongabon","Cabanatuan","Cabiao","Carranglan","Cuyapo","Gabaldon","Gapan","General Mamerto Natividad","General Tinio","Guimba","Jaen","Laur","Licab","Llanera","Lupao","Muñoz","Nampicuan","Palayan","Pantabangan","Peñaranda","Quezon","Rizal","San Antonio","San Isidro","San Jose","San Leonardo","Santa Rosa","Santo Domingo","Talavera","Talugtug","Zaragoza"],
  "Nueva Vizcaya": ["Alfonso Castañeda","Ambaguio","Aritao","Bagabag","Bambang","Bayombong","Diadi","Dupax del Norte","Dupax del Sur","Kasibu","Kayapa","Quezon","Santa Fe","Solano","Villaverde"],
  "Occidental Mindoro": ["Abra de Ilog","Calintaan","Looc","Lubang","Magsaysay","Mamburao","Paluan","Rizal","Sablayan","San Jose","Santa Cruz"],
  "Oriental Mindoro": ["Baco","Bansud","Bongabong","Bulalacao","Calapan","Gloria","Mansalay","Naujan","Pinamalayan","Pola","Puerto Galera","Roxas","San Teodoro","Socorro","Victoria"],
  "Palawan": ["Aborlan","Agutaya","Araceli","Balabac","Bataraza","Brooke's Point","Cagayancillo","Coron","Culion","Cuyo","Dumaran","El Nido","Espanola","Kalayaan","Linapacan","Magsaysay","Narra","Puerto Princesa","Quezon","Rizal","Roxas","San Vicente","Taytay"],
  "Pampanga": ["Angeles","Apalit","Arayat","Bacolor","Candaba","Floridablanca","Guagua","Lubao","Mabalacat","Macabebe","Magalang","Masantol","Mexico","Minalin","Porac","San Fernando","San Luis","San Simon","Santa Ana","Santa Rita","Santo Tomas","Sasmuan"],
  "Pangasinan": ["Agno","Aguilar","Alaminos","Alcala","Anda","Asingan","Balungao","Bani","Basista","Bautista","Bayambang","Binalonan","Binmaley","Bolinao","Bugallon","Burgos","Calasiao","Dagupan","Dasol","Infanta","Labrador","Laoac","Lingayen","Mabini","Malasiqui","Manaoag","Mangaldan","Mangatarem","Mapandan","Natividad","Pozzorubio","Rosales","San Carlos","San Fabian","San Jacinto","San Manuel","San Nicolas","San Quintin","Santa Barbara","Santa Maria","Santo Tomas","Sison","Sual","Tayug","Umingan","Urbiztondo","Urdaneta","Villasis"],
  "Quezon": ["Agdangan","Alabat","Atimonan","Buenavista","Burdeos","Calauag","Candelaria","Catanauan","Dolores","General Luna","General Nakar","Guinayangan","Gumaca","Infanta","Jomalig","Lopez","Lucban","Lucena","Macalelon","Mauban","Mulanay","Padre Burgos","Pagbilao","Panukulan","Patnanungan","Perez","Pitogo","Plaridel","Polillo","Quezon","Real","Sampaloc","San Andres","San Antonio","San Francisco","San Narciso","Sariaya","Tagkawayan","Tayabas","Tiaong","Unisan"],
  "Quirino": ["Aglipay","Cabarroguis","Diffun","Maddela","Nagtipunan","Saguday"],
  "Rizal": ["Angono","Antipolo","Baras","Binangonan","Cainta","Cardona","Jala-Jala","Morong","Pililla","Rodriguez","San Mateo","Tanay","Taytay","Teresa"],
  "Romblon": ["Alcantara","Banton","Cajidiocan","Calatrava","Concepcion","Corcuera","Ferrol","Looc","Magdiwang","Odiongan","Romblon","San Agustin","San Andres","San Fernando","San Jose","Santa Fe","Santa Maria"],
  "Samar": ["Basey","Calbayog","Calbiga","Catbalogan","Daram","Gandara","Hinabangan","Jiabong","Marabut","Matuguinao","Motiong","Pagsanghan","Paranas","Pinabacdao","San Jorge","San Jose de Buan","San Sebastian","Santa Margarita","Santa Rita","Santo Niño","Tagapul-an","Talalora","Tarangnan","Villareal","Zumarraga"],
  "Sarangani": ["Alabel","Glan","Kiamba","Maasim","Maitum","Malapatan","Malungon"],
  "Siquijor": ["Enrique Villanueva","Larena","Lazi","Maria","San Juan","Siquijor"],
  "Sorsogon": ["Barcelona","Bulan","Bulusan","Casiguran","Castilla","Donsol","Gubat","Irosin","Juban","Magallanes","Matnog","Pilar","Prieto Diaz","Santa Magdalena","Sorsogon City"],
  "South Cotabato": ["Banga","General Santos","Koronadal","Lake Sebu","Norala","Polomolok","Santo Niño","Surallah","T'boli","Tampakan","Tantangan","Tupi"],
  "Southern Leyte": ["Anahawan","Bontoc","Hinunangan","Hinundayan","Libagon","Liloan","Limasawa","Maasin","Macrohon","Malitbog","Padre Burgos","Pintuyan","Saint Bernard","San Francisco","San Juan","San Ricardo","Silago","Sogod","Tomas Oppus"],
  "Sultan Kudarat": ["Bagumbayan","Columbio","Esperanza","Isulan","Kalamansig","Lebak","Lutayan","Lambayong","Palimbang","President Quirino","Senator Ninoy Aquino","Tacurong"],
  "Sulu": ["Hadji Panglima Tahil","Indanan","Jolo","Kalingalan Caluang","Lugus","Luuk","Maimbung","Old Panamao","Omar","Pandami","Panglima Estino","Pangutaran","Parang","Pata","Patikul","Siasi","Talipao","Tapul","Tongkil"],
  "Surigao del Norte": ["Alegria","Bacuag","Burgos","Claver","Dapa","Del Carmen","General Luna","Gigaquit","Mainit","Malimono","Pilar","Placer","San Benito","San Francisco","San Isidro","Santa Monica","Sison","Socorro","Surigao City","Tagana-an","Tubod"],
  "Surigao del Sur": ["Barobo","Bayabas","Bislig","Cagwait","Cantilan","Carmen","Carrascal","Cortes","Hinatuan","Lanuza","Lianga","Lingig","Madrid","Marihatag","San Agustin","San Miguel","Tagbina","Tago","Tandag"],
  "Tarlac": ["Anao","Bamban","Camiling","Capas","Concepcion","Gerona","La Paz","Mayantoc","Moncada","Paniqui","Pura","Ramos","San Clemente","San Jose","San Manuel","Santa Ignacia","Tarlac City","Victoria"],
  "Tawi-Tawi": ["Bongao","Languyan","Mapun","Panglima Sugala","Sapa-Sapa","Sibutu","Simunul","Sitangkai","South Ubian","Tandubas","Turtle Islands"],
  "Zambales": ["Botolan","Cabangan","Candelaria","Castillejos","Iba","Masinloc","Olongapo","Palauig","San Antonio","San Felipe","San Marcelino","San Narciso","Santa Cruz","Subic"],
  "Zamboanga del Norte": ["Baliguian","Dapitan","Dipolog","Godod","Gutalac","Jose Dalman","Kalawit","Katipunan","La Libertad","Labason","Leon B. Postigo","Liloy","Manukan","Mutia","Piñan","Polanco","President Manuel A. Roxas","Rizal","Salug","San Miguel","San Pablo","Sergio Osmeña Sr.","Siayan","Sibuco","Sibutad","Sindangan","Siocon","Sirawai","Tampilisan"],
  "Zamboanga del Sur": ["Aurora","Bayog","Dimataling","Dinas","Dumalinao","Dumingag","Guipos","Josefina","Kumalarang","Labangan","Lakewood","Lapuyan","Mahayag","Margosatubig","Midsalip","Molave","Pagadian","Pitogo","Ramon Magsaysay","San Miguel","San Pablo","Tabina","Tambulig","Tigbao","Tukuran","Tungawan","Zamboanga City"],
  "Zamboanga Sibugay": ["Alicia","Buug","Diplahan","Imelda","Ipil","Kabasalan","Mabuhay","Malangas","Naga","Olutanga","Payao","Roseller Lim","Siay","Talusan","Titay","Tungawan"]
};

(function initProvinceCity() {
  const provSel = document.getElementById('coProvince');
  const citySel = document.getElementById('coCity');

  Object.keys(PH_DATA).sort().forEach(prov => {
    const opt = document.createElement('option');
    opt.value = prov;
    opt.textContent = prov;
    provSel.appendChild(opt);
  });

  provSel.addEventListener('change', () => {
    const cities = PH_DATA[provSel.value] || [];
    citySel.innerHTML = '<option value="" disabled selected>City / Municipality</option>';
    cities.slice().sort().forEach(city => {
      const opt = document.createElement('option');
      opt.value = city;
      opt.textContent = city;
      citySel.appendChild(opt);
    });
    citySel.disabled = false;
    provSel.classList.add('co-sel-filled');
  });

  citySel.addEventListener('change', () => {
    citySel.classList.add('co-sel-filled');
  });
})();

function resetCitySelect() {
  const citySel = document.getElementById('coCity');
  citySel.innerHTML = '<option value="" disabled selected>City / Municipality</option>';
  citySel.disabled = true;
  citySel.classList.remove('co-sel-filled');
  document.getElementById('coProvince').classList.remove('co-sel-filled');
}

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

// ---------- Shared Email Validation ----------
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
  const formatRe = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
  if (!formatRe.test(email)) return 'Please enter a valid email address.';

  const [local, domain] = email.toLowerCase().split('@');

  if (DISPOSABLE_DOMAINS.has(domain)) return 'Disposable email addresses are not accepted.';

  if (domain === 'gmail.com') {
    const gmailLocal = local.replace(/\./g, '');
    if (gmailLocal.length < 6 || gmailLocal.length > 30)
      return 'That Gmail address doesn\'t look valid (must be 6–30 characters).';
    if (!/^[a-z0-9.]+$/.test(local))
      return 'That Gmail address contains invalid characters.';
    if (/\.\./.test(local) || local.startsWith('.') || local.endsWith('.'))
      return 'That Gmail address doesn\'t look valid.';
  }

  return null;
}

function generateOrderRef() {
  const ts   = Date.now().toString(36).toUpperCase();
  const rand = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `PD-${ts}${rand}`;
}

// ---------- Contact Form ----------
(function(){
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
