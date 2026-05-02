// Bengaluru coordinates
const BENGALURU_CENTER = [12.9716, 77.5946];

// Initialize Map
const map = L.map('map', {
    center: BENGALURU_CENTER,
    zoom: 12,
    zoomControl: false // Hide default zoom control to keep UI clean
});

// Add CartoDB Dark Matter tiles
L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a> &copy; <a href="https://carto.com/attributions">CARTO</a>',
    subdomains: 'abcd',
    maxZoom: 20
}).addTo(map);

// State
let potholes = [];
let markersLayer = L.layerGroup().addTo(map);
let heatLayer = null;
let isHeatmapMode = false;

// UI Elements
const drawer = document.getElementById('drawer');
const drawerTaluk = document.getElementById('drawer-taluk');
const drawerLocation = document.getElementById('drawerLocation');
const drawerReportsCount = document.getElementById('drawer-reports-count');
const btnCloseDrawer = document.getElementById('closeDrawer');
const btnRemoveReport = document.getElementById('btnRemoveReport');
const btnToggleHeatmap = document.getElementById('toggleHeatmap');
const toastEl = document.getElementById('toast');

const drawerMlaName = document.getElementById('drawerMlaName');
const drawerMlaPhoto = document.getElementById('drawerMlaPhoto');
const drawerMpName = document.getElementById('drawerMpName');
const drawerMpPhoto = document.getElementById('drawerMpPhoto');

const reportModal = document.getElementById('reportModal');
const btnCancelReport = document.getElementById('btnCancelReport');
const btnConfirmReport = document.getElementById('btnConfirmReport');
const potholeImage = document.getElementById('potholeImage');
const imageCanvas = document.getElementById('imageCanvas');
const drawerImageContainer = document.getElementById('drawerImageContainer');
const btnNextImage = document.getElementById('btnNextImage');
const btnPrevImage = document.getElementById('btnPrevImage');
const imageIndicator = document.getElementById('imageIndicator');
const btnSeenThis = document.getElementById('btnSeenThis');

let currentPotholeId = null;
let pendingReportCoords = null;
let currentImageIndex = 0;
let currentImages = [];

// Utility to show toast message
function showToast(msg, isError = false) {
    toastEl.textContent = msg;
    toastEl.style.backgroundColor = isError ? 'rgba(239, 68, 68, 0.9)' : 'rgba(34, 197, 94, 0.9)';
    toastEl.style.opacity = '1';
    setTimeout(() => {
        toastEl.style.opacity = '0';
    }, 3000);
}

// Fetch Potholes
async function fetchPotholes() {
    try {
        const res = await fetch('/api/potholes');
        if (!res.ok) throw new Error('Failed to fetch data');
        potholes = await res.json();
        renderMap();
    } catch (err) {
        console.error(err);
        showToast('Error loading potholes', true);
    }
}

// Render Map Elements
function renderMap() {
    markersLayer.clearLayers();
    if (heatLayer) {
        map.removeLayer(heatLayer);
        heatLayer = null;
    }

    if (isHeatmapMode) {
        // Render Heatmap
        const heatPoints = potholes.map(p => [p.lat, p.lng, p.reports_count * 0.2]); // intensity based on reports
        heatLayer = L.heatLayer(heatPoints, { radius: 25, blur: 15, maxZoom: 15 }).addTo(map);
    } else {
        // Render Markers
        potholes.forEach(p => {
            const isRed = p.reports_count >= 6;
            const size = isRed ? 36 : 28;
            
            const customIcon = L.divIcon({
                className: `pothole-marker ${isRed ? 'marker-red' : 'marker-grey'}`,
                html: `<span>${p.reports_count}</span>`,
                iconSize: [size, size],
                iconAnchor: [size/2, size/2]
            });

            const marker = L.marker([p.lat, p.lng], { icon: customIcon }).addTo(markersLayer);
            
            marker.on('click', (e) => {
                L.DomEvent.stopPropagation(e);
                openDrawer(p);
            });
        });
    }
}

// Toggle Heatmap
btnToggleHeatmap.addEventListener('click', () => {
    isHeatmapMode = !isHeatmapMode;
    btnToggleHeatmap.textContent = isHeatmapMode ? 'Show Pins' : 'Show Heatmap';
    btnToggleHeatmap.classList.toggle('bg-white/20');
    renderMap();
});

// Map Click -> Report Pothole Modal
map.on('click', async (e) => {
    if (isHeatmapMode) {
        showToast('Switch to Pins mode to report a pothole', true);
        return;
    }

    const { lat, lng } = e.latlng;
    pendingReportCoords = { lat, lng };
    reportModal.classList.remove('hidden');
});

// Modal Logic
btnCancelReport.addEventListener('click', () => {
    reportModal.classList.add('hidden');
    pendingReportCoords = null;
    potholeImage.value = '';
});

// Compress image using canvas
function compressImage(file) {
    return new Promise((resolve) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = event => {
            const img = new Image();
            img.src = event.target.result;
            img.onload = () => {
                const maxWidth = 800;
                let scaleSize = 1;
                if (img.width > maxWidth) {
                    scaleSize = maxWidth / img.width;
                }
                imageCanvas.width = img.width * scaleSize;
                imageCanvas.height = img.height * scaleSize;
                const ctx = imageCanvas.getContext('2d');
                ctx.drawImage(img, 0, 0, imageCanvas.width, imageCanvas.height);
                resolve(imageCanvas.toDataURL('image/jpeg', 0.7)); // 70% quality
            }
        };
    });
}

// Confirm Report
btnConfirmReport.addEventListener('click', async () => {
    if (!pendingReportCoords) return;
    btnConfirmReport.disabled = true;
    btnConfirmReport.textContent = "Uploading...";
    
    try {
        let image_data = null;
        if (potholeImage.files && potholeImage.files[0]) {
            image_data = await compressImage(potholeImage.files[0]);
        }
        
        const res = await fetch('/api/potholes', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ lat: pendingReportCoords.lat, lng: pendingReportCoords.lng, image_data })
        });

        const data = await res.json();
        
        if (!res.ok) {
            showToast(data.error || 'Failed to report', true);
        } else {
            if (data.status === 'updated') {
                showToast(`Grouped with existing pothole (Total: ${data.reports_count})`);
            } else {
                showToast('New pothole reported successfully!');
            }
            fetchPotholes();
        }
    } catch (err) {
        console.error(err);
        showToast('Network error while reporting', true);
    } finally {
        reportModal.classList.add('hidden');
        pendingReportCoords = null;
        potholeImage.value = '';
        btnConfirmReport.disabled = false;
        btnConfirmReport.textContent = "Report";
    }
});

// Drawer Logic
function updateSliderUI() {
    if (currentImages.length <= 1) {
        btnNextImage.classList.add('hidden');
        btnPrevImage.classList.add('hidden');
        imageIndicator.classList.add('hidden');
    } else {
        btnNextImage.classList.remove('hidden');
        btnPrevImage.classList.remove('hidden');
        imageIndicator.classList.remove('hidden');
        imageIndicator.textContent = `${currentImageIndex + 1}/${currentImages.length}`;
        
        if (currentImageIndex === 0) btnPrevImage.classList.add('hidden');
        if (currentImageIndex === currentImages.length - 1) btnNextImage.classList.add('hidden');
    }
    
    drawerImageContainer.style.transform = `translateX(-${currentImageIndex * 100}%)`;
}

btnNextImage.addEventListener('click', () => {
    if (currentImageIndex < currentImages.length - 1) {
        currentImageIndex++;
        updateSliderUI();
    }
});

btnPrevImage.addEventListener('click', () => {
    if (currentImageIndex > 0) {
        currentImageIndex--;
        updateSliderUI();
    }
});

function openDrawer(pothole) {
    currentPotholeId = pothole.id;
    drawerTaluk.textContent = pothole.taluk || 'Unknown';
    drawerLocation.textContent = 'Reported Location';
    drawerReportsCount.textContent = pothole.reports_count;
    
    drawerMlaName.textContent = pothole.mla || 'Pending Data';
    if (pothole.mla_photo_url) drawerMlaPhoto.src = pothole.mla_photo_url;
    else drawerMlaPhoto.src = 'https://ui-avatars.com/api/?name=P+R&background=random';

    drawerMpName.textContent = pothole.mp || 'Pending Data';
    if (pothole.mp_photo_url) drawerMpPhoto.src = pothole.mp_photo_url;
    else drawerMpPhoto.src = 'https://ui-avatars.com/api/?name=P+R&background=random';
    
    currentImages = pothole.image_data && pothole.image_data.length > 0 
        ? pothole.image_data 
        : ["https://images.unsplash.com/photo-1515162816999-a0c47dc192f7?auto=format&fit=crop&q=80&w=800"];
        
    drawerImageContainer.innerHTML = '';
    currentImages.forEach(imgSrc => {
        const img = document.createElement('img');
        img.src = imgSrc;
        img.className = "w-full h-full object-cover flex-shrink-0";
        drawerImageContainer.appendChild(img);
    });
    
    currentImageIndex = 0;
    updateSliderUI();

    drawer.classList.add('open');
}

btnCloseDrawer.addEventListener('click', () => {
    drawer.classList.remove('open');
    currentPotholeId = null;
});

// Remove Report Logic
btnRemoveReport.addEventListener('click', async () => {
    if (!currentPotholeId) return;
    
    if (confirm("Are you sure you want to remove your report?")) {
        try {
            const res = await fetch(`/api/potholes/${currentPotholeId}`, {
                method: 'DELETE'
            });
            
            const data = await res.json();
            if (!res.ok) {
                showToast(data.detail || 'Failed to remove report', true);
                return;
            }
            
            showToast(data.status === 'deleted' ? 'Report deleted completely' : 'Report count decremented');
            drawer.classList.remove('open');
            currentPotholeId = null;
            
            fetchPotholes();
        } catch (err) {
            console.error(err);
            showToast('Network error while removing', true);
        }
    }
});

// I've seen this Logic (Upvote)
btnSeenThis.addEventListener('click', async () => {
    if (!currentPotholeId) return;
    
    // Optimistic UI update
    btnSeenThis.disabled = true;
    
    try {
        const res = await fetch(`/api/potholes/${currentPotholeId}/upvote`, {
            method: 'POST'
        });
        
        const data = await res.json();
        if (!res.ok) {
            showToast(data.detail || 'Failed to confirm', true);
            return;
        }
        
        showToast('Thanks for confirming!');
        
        // Update local state
        const p = potholes.find(x => x.id === currentPotholeId);
        if (p) {
            p.reports_count = data.reports_count;
            drawerReportsCount.textContent = p.reports_count;
            renderMap();
        }
    } catch (err) {
        console.error(err);
        showToast('Network error while confirming', true);
    } finally {
        btnSeenThis.disabled = false;
    }
});

// Initial Load
fetchPotholes();
