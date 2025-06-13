// Import fungsi yang diperlukan dari SDK Firebase
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.15.0/firebase-app.js";
import { getFirestore, collection, addDoc, getDocs, query, orderBy } from "https://www.gstatic.com/firebasejs/9.15.0/firebase-firestore.js";
import { getStorage, ref, uploadBytes, getDownloadURL } from "https://www.gstatic.com/firebasejs/9.15.0/firebase-storage.js";

// =============================================
// =========      KONFIGURASI UTAMA      =======
// =============================================
const firebaseConfig = {
    // (PENTING) GANTI DENGAN KONFIGURASI FIREBASE ANDA SENDIRI.
    // LIHAT PANDUAN UNTUK CARA MENDAPATKANNYA.
    apiKey: "AIzaSy...",
    authDomain: "nama-proyek-anda.firebaseapp.com",
    projectId: "nama-proyek-anda",
    storageBucket: "nama-proyek-anda.appspot.com",
    messagingSenderId: "...",
    appId: "..."
};
const ADMIN_PASSWORD = "monggo123";
const WHATSAPP_NUMBER = '6281211862924';

// Inisialisasi Firebase
let app, db, storage;
try {
     app = initializeApp(firebaseConfig);
     db = getFirestore(app);
     storage = getStorage(app);
} catch(e) {
    console.error("Firebase Gagal Dinisialisasi. Periksa kembali firebaseConfig Anda.", e);
    // Tampilkan pesan error jika konfigurasi salah
    document.body.innerHTML = `<div class="h-screen w-screen flex items-center justify-center bg-red-100 text-red-700 p-4"><p><strong>Error:</strong> Aplikasi gagal terhubung ke server. Pastikan firebaseConfig di file <strong>script.js</strong> sudah diisi dengan benar.</p></div>`;
}

// =============================================
// =========       LOGIKA ROUTING        =======
// =============================================
function handleRouting() {
    const mainContainer = document.querySelector('body');
    const userAppContainer = document.getElementById('user-app');
    const adminAppContainer = document.getElementById('admin-app');
    
    if (window.location.hash === '#admin') {
        mainContainer.style.backgroundColor = '#f1f5f9'; // bg-slate-100
        userAppContainer.classList.add('hidden');
        adminAppContainer.classList.remove('hidden');
        initAdminApp();
    } else {
        mainContainer.style.backgroundColor = '#0a0a0a'; // bg-black
        adminAppContainer.classList.add('hidden');
        userAppContainer.classList.remove('hidden');
        initUserApp();
    }
}

// =============================================
// =========   LOGIKA APLIKASI ADMIN     =======
// =============================================
function initAdminApp() {
    if (!db) return; // Jangan jalankan jika firebase gagal
    
    const passwordGate = document.getElementById('password-gate');
    const passwordForm = document.getElementById('password-form');
    const adminContent = document.getElementById('admin-content');
    
    const showAdminContent = () => {
        passwordGate.classList.add('hidden');
        adminContent.classList.remove('hidden');
    };

    if (sessionStorage.getItem('adminAuthenticated') === 'true') {
        showAdminContent();
    }

    // Pastikan listener hanya ditambahkan sekali
    if (!passwordForm.dataset.listenerAttached) {
        passwordForm.dataset.listenerAttached = 'true';
        passwordForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const passwordInput = document.getElementById('password');
            const passwordError = document.getElementById('password-error');
            if (passwordInput.value === ADMIN_PASSWORD) {
                sessionStorage.setItem('adminAuthenticated', 'true');
                passwordError.classList.add('hidden');
                showAdminContent();
            } else {
                passwordError.classList.remove('hidden');
            }
        });
    }

    const addProductForm = document.getElementById('add-product-form');
    if (!addProductForm.dataset.listenerAttached) {
        addProductForm.dataset.listenerAttached = 'true';
        addProductForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const submitBtn = document.getElementById('submit-btn');
            const successMessage = document.getElementById('success-message');
            const errorMessage = document.getElementById('error-message');
            submitBtn.disabled = true;
            successMessage.classList.add('hidden');
            errorMessage.classList.add('hidden');
            
            const imageFiles = addProductForm.images.files;
            if (imageFiles.length === 0) { alert("Mohon pilih setidaknya satu gambar produk."); submitBtn.disabled = false; return; }
            
            try {
                submitBtn.textContent = Mengunggah ${imageFiles.length} gambar...;
                const uploadTasks = Array.from(imageFiles).map(file => { const fileName = products/${Date.now()}-${file.name}; const storageRef = ref(storage, fileName); return uploadBytes(storageRef, file); });
                const uploadResults = await Promise.all(uploadTasks);
                
                submitBtn.textContent = 'Mendapatkan URL gambar...';
                const urlTasks = uploadResults.map(snapshot => getDownloadURL(snapshot.ref));
                const imageUrls = await Promise.all(urlTasks);
                
                submitBtn.textContent = 'Menyimpan data produk...';
                await addDoc(collection(db, "products"), { name: addProductForm.name.value, price: parseInt(addProductForm.price.value, 10), description: addProductForm.description.value, videoUrl: addProductForm.videoUrl.value, shopeeLink: addProductForm.shopeeLink.value, images: imageUrls, createdAt: new Date() });
                
                successMessage.classList.remove('hidden');
                addProductForm.reset();
                setTimeout(() => successMessage.classList.add('hidden'), 4000);
            } catch (error) {
                errorMessage.textContent = Gagal menyimpan produk: ${error.message};
                errorMessage.classList.remove('hidden');
            } finally {
                submitBtn.disabled = false;
                submitBtn.textContent = 'Simpan Produk';
            }
        });
    }
}

// =============================================
// =========   LOGIKA APLIKASI PENGGUNA  =======
// =============================================
function initUserApp() {
    const productListContainer = document.getElementById('product-list');
    if (!db) { 
        if(productListContainer) productListContainer.innerHTML = "<p class='text-center text-red-500'>Aplikasi gagal terhubung. Cek konfigurasi Firebase Anda dan refresh halaman.</p>";
        return;
    }

    let products = [];
    let carouselStates = {};
    
    const landingPage = document.getElementById('landing-page');
    const catalogPage = document.getElementById('catalog-page');
    const loginForm = document.getElementById('login-form');
    
    const fetchProducts = async () => {
        try {
            const q = query(collection(db, "products"), orderBy("createdAt", "desc"));
            const querySnapshot = await getDocs(q);
            products = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        } catch (error) {
            console.error("Error fetching products: ", error);
            productListContainer.innerHTML = "<p class='text-center text-red-500'>Gagal memuat produk. Cek koneksi internet atau konfigurasi Firebase.</p>";
        }
    };
    
    const showCatalog = async (userName) => {
        document.getElementById('welcome-message').textContent = Halo, ${userName}!;
        landingPage.classList.add('hidden');
        catalogPage.classList.remove('hidden');
        if (products.length === 0) { 
            productListContainer.innerHTML = "<p class='text-center text-slate-500'>Memuat produk...</p>";
            await fetchProducts();
        }
        renderProducts(products);
    };

    const showLandingPage = () => {
        landingPage.classList.remove('hidden');
        catalogPage.classList.add('hidden');
        document.getElementById('login-name').value = '';
    };
    
    if (!loginForm.dataset.listenerAttached) {
        loginForm.dataset.listenerAttached = 'true';
        loginForm.addEventListener('submit', (e) => { e.preventDefault(); const userName = document.getElementById('login-name').value.trim(); if (userName) { localStorage.setItem('userName', userName); showCatalog(userName); } });
    }
    const logoutBtn = document.getElementById('logout-btn');
    if (logoutBtn && !logoutBtn.dataset.listenerAttached) {
         logoutBtn.dataset.listenerAttached = 'true';
         logoutBtn.addEventListener('click', () => { localStorage.removeItem('userName'); showLandingPage(); });
    }
    
    const renderProducts = (productsToRender) => {
        productListContainer.innerHTML = '';
        document.getElementById('no-results').classList.toggle('hidden', productsToRender.length > 0);
        productsToRender.forEach(product => {
            if (!carouselStates[product.id]) carouselStates[product.id] = { currentIndex: 0 };
            const imagesHtml = product.images.map(img => <div class="card-carousel-slide"><img src="${img}" alt="${product.name}" class="w-full h-64 object-cover"></div>).join('');
            const formatRupiah = (number) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(number);
            const productCard = `<div class="product-card bg-white rounded-xl shadow-md border border-slate-200 overflow-hidden flex flex-col group transition-shadow duration-300 hover:shadow-xl" data-product-id="${product.id}"><div class="card-carousel-container w-full overflow-hidden"><div class="card-carousel-track" style="width: ${product.images.length * 100}%">${imagesHtml}</div>${product.images.length > 1 ? <button class="carousel-btn left" data-direction="-1">&#10094;</button><button class="carousel-btn right" data-direction="1">&#10095;</button> : ''}<button class="detail-btn absolute top-2 right-2 bg-black bg-opacity-40 text-white p-2 rounded-full opacity-0 group-hover:opacity-100 transition-opacity" title="Lihat Detail Foto"><svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7"></path></svg></button></div><div class="p-5 flex flex-col flex-grow"><h3 class="text-lg font-bold text-slate-800">${product.name}</h3><p class="text-slate-600 mt-2 text-sm flex-grow">${product.description}</p><div class="mt-4 pt-4 border-t border-slate-200"><p class="text-2xl font-extrabold text-indigo-600">${formatRupiah(product.price)}</p></div></div><div class="p-5 pt-0 mt-auto"><div class="space-y-2"><div class="grid grid-cols-2 gap-2"><button class="action-btn watch-video-btn w-full bg-slate-700 text-white font-semibold py-2 px-3 rounded-lg hover:bg-slate-800 text-sm transition-transform duration-200 hover:-translate-y-0.5">Lihat Video</button><a href="${product.shopeeLink}" target="_blank" class="action-btn w-full bg-orange-500 text-white font-semibold py-2 px-3 rounded-lg hover:bg-orange-600 flex items-center justify-center text-sm transition-transform duration-200 hover:-translate-y-0.5"><svg class="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 24 24"><path d="M19.98 10.98a2.5 2.5 0 0 0-2.22-1.48H6.24a2.5 2.5 0 0 0-2.22 1.48L3 15.5v1.5c0 .83.67 1.5 1.5 1.5h15c.83 0 1.5-.67 1.5-1.5v-1.5l-1.02-4.52zM8.5 16c-.83 0-1.5-.67-1.5-1.5S7.67 13 8.5 13s1.5.67 1.5 1.5S9.33 16 8.5 16zm7 0c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5zm1.5-7.5H7.13l.96-4.28c.1-.44.5-.72.95-.72h5.92c.45 0 .85.28.95.72l.96 4.28z"></path></svg>Shopee</a></div><button class="action-btn buy-btn w-full bg-gradient-to-r from-green-500 to-green-600 text-white font-bold py-2.5 px-4 rounded-lg hover:from-green-600 hover:to-green-700 shadow-md hover:shadow-lg transition-all duration-300 transform hover:-translate-y-0.5">Pesan via WhatsApp</button></div></div></div>`;
            productListContainer.innerHTML += productCard;
        });
        initAnimations();
    };
    
    document.getElementById('search-bar').addEventListener('input', (e) => { const query = e.target.value.toLowerCase(); const filtered = products.filter(p => p.name.toLowerCase().includes(query) || p.description.toLowerCase().includes(query)); renderProducts(filtered); });
    productListContainer.addEventListener('click', (e) => { const button = e.target.closest('button, a'); if (!button) return; const card = button.closest('.product-card'); if (!card) return; const productId = card.dataset.productId; const product = products.find(p => p.id == productId); if (button.classList.contains('carousel-btn')) { const track = card.querySelector('.card-carousel-track'); const direction = parseInt(button.dataset.direction, 10); const numImages = product.images.length; let { currentIndex } = carouselStates[productId]; currentIndex = (currentIndex + direction + numImages) % numImages; carouselStates[productId].currentIndex = currentIndex; track.style.transform = translateX(-${(currentIndex / numImages) * 100}%); } else if (button.classList.contains('detail-btn')) { const { currentIndex } = carouselStates[productId]; document.getElementById('detail-image-src').src = product.images[currentIndex]; document.getElementById('image-detail-modal').classList.remove('hidden'); } else if (button.classList.contains('action-btn')) { if (button.classList.contains('watch-video-btn')) { document.getElementById('video-container').innerHTML = <iframe src="${product.videoUrl}?autoplay=1&modestbranding=1&rel=0" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe>; document.getElementById('video-modal').classList.remove('hidden'); } else if (button.classList.contains('buy-btn')) { document.getElementById('modal-product-name').textContent = product.name; document.getElementById('modal-product-price').textContent = new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(product.price); document.getElementById('product-id-input').value = product.id; document.getElementById('order-form').reset(); if (localStorage.getItem('userName')) document.getElementById('customer-name').value = localStorage.getItem('userName'); document.getElementById('order-modal').classList.remove('hidden'); } } });
    document.getElementById('order-form').addEventListener('submit', (e) => { e.preventDefault(); const productId = document.getElementById('product-id-input').value; const product = products.find(p => p.id == productId); const customerName = document.getElementById('customer-name').value; const customerAddress = document.getElementById('customer-address').value; const customerNote = document.getElementById('pesancustomer').value.trim(); let message = Halo, saya ingin memesan:\n\n*Produk:* ${product.name}\n*Harga:* ${new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(product.price)}\n\n*Nama Penerima:* ${customerName}\n*Alamat Pengiriman:* ${customerAddress}; if (customerNote) { message += \n*Catatan:* ${customerNote}; } message += \n\nTerima kasih!; window.open(https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}, '_blank'); document.getElementById('order-modal').classList.add('hidden'); });
    document.querySelectorAll('#user-app .modal').forEach(modal => { modal.addEventListener('click', (e) => { if (e.target === modal || e.target.closest('.close-modal-btn')) modal.classList.add('hidden'); }); });
    const initAnimations = () => { const observer = new IntersectionObserver((entries, obs) => { entries.forEach(entry => { if (entry.isIntersecting) { entry.target.classList.add('is-visible'); obs.unobserve(entry.target); } }); }, { threshold: 0.1 }); document.querySelectorAll('.product-card:not(.is-visible)').forEach(card => observer.observe(card)); };

    // Initial check
    const savedUser = localStorage.getItem('userName');
    if (savedUser) { showCatalog(savedUser); } else { showLandingPage(); }
}

// --- INISIALISASI UTAMA ---
window.addEventListener('hashchange', handleRouting);
handleRouting(); // Jalankan saat halaman pertama kali dimuat
