/* editor.js - FramedShot v1.3 (Free Edition) */

// --- 1. SELECT ELEMENTS ---
const canvas = document.getElementById('editorCanvas');
const ctx = canvas.getContext('2d');

// Inputs
const paddingInput = document.getElementById('paddingRange');
const shadowInput = document.getElementById('shadowRange');
const radiusInput = document.getElementById('radiusRange');
const angleInput = document.getElementById('angleRange');
const imageSizeInput = document.getElementById('imageSizeRange');
const colorStart = document.getElementById('colorStart');
const colorEnd = document.getElementById('colorEnd');
const saveSettingsCheck = document.getElementById('saveSettingsCheck');

// Value displays
const paddingValue = document.getElementById('paddingValue');
const shadowValue = document.getElementById('shadowValue');
const radiusValue = document.getElementById('radiusValue');
const angleValue = document.getElementById('angleValue');
const imageSizeValue = document.getElementById('imageSizeValue');

// Buttons
const downloadBtn = document.getElementById('downloadBtn');
const copyBtn = document.getElementById('copyBtn');
const resetBtn = document.getElementById('resetBtn');
const donateBtn = document.getElementById('donateBtn');
const ratioSelect = document.getElementById('ratioSelect');
const styleBtns = document.querySelectorAll('.toggle-btn[data-group="style"]');
const bgTypeBtns = document.querySelectorAll('.toggle-btn[data-group="bgType"]');
const presetBtns = document.querySelectorAll('.preset-btn');

// Sidebar elements
const sidebar = document.getElementById('sidebar');
const sidebarToggle = document.getElementById('sidebarToggle');
const closeSidebar = document.getElementById('closeSidebar');

// Gradient/Solid controls
const gradientControls = document.getElementById('gradientControls');
const angleControl = document.getElementById('angleControl');
const colorEndWrapper = document.getElementById('colorEndWrapper');
const presetRow = document.getElementById('presetRow');

// Crop Elements
const startCropBtn = document.getElementById('startCropBtn');
const cropModal = document.getElementById('cropModal');
const cropTarget = document.getElementById('cropTarget');
const applyCropBtn = document.getElementById('applyCropBtn');
const cancelCropBtn = document.getElementById('cancelCropBtn');

// --- 2. APP STATE ---
let state = {
    originalImageSrc: null,
    currentImage: new Image(),
    padding: parseInt(paddingInput.value),
    shadow: parseInt(shadowInput.value),
    radius: parseInt(radiusInput.value),
    angle: parseInt(angleInput.value),
    imageSize: parseInt(imageSizeInput.value),
    gradientStart: colorStart.value,
    gradientEnd: colorEnd.value,
    gradientStyle: 'linear',
    bgType: 'gradient',
    aspectRatio: 'auto'
};

let cropper = null;

// --- 3. INITIALIZATION ---
chrome.storage.local.get(['screenshot', 'savedState', 'shouldSave'], (result) => {
    // Handle Saved Settings
    if (result.shouldSave && result.savedState) {
        saveSettingsCheck.checked = true;

        // Restore State
        state.padding = result.savedState.padding ?? state.padding;
        state.shadow = result.savedState.shadow ?? state.shadow;
        state.radius = result.savedState.radius ?? state.radius;
        state.angle = result.savedState.angle ?? state.angle;
        state.imageSize = result.savedState.imageSize ?? state.imageSize;
        state.gradientStart = result.savedState.gradientStart ?? state.gradientStart;
        state.gradientEnd = result.savedState.gradientEnd ?? state.gradientEnd;
        state.gradientStyle = result.savedState.gradientStyle ?? state.gradientStyle;
        state.bgType = result.savedState.bgType ?? state.bgType;
        state.aspectRatio = result.savedState.aspectRatio ?? state.aspectRatio;

        // Update Inputs
        paddingInput.value = state.padding;
        shadowInput.value = state.shadow;
        radiusInput.value = state.radius;
        angleInput.value = state.angle;
        imageSizeInput.value = state.imageSize;
        colorStart.value = state.gradientStart;
        colorEnd.value = state.gradientEnd;

        // Update Toggle Buttons and Select
        if (ratioSelect) ratioSelect.value = state.aspectRatio;
        updateActiveBtn(styleBtns, state.gradientStyle);
        updateActiveBtn(bgTypeBtns, state.bgType);
        
        // Update UI visibility
        updateBgTypeUI();
    }

    // Update value displays
    updateValueDisplays();

    // Load Image
    if (result.screenshot) {
        state.originalImageSrc = result.screenshot;
        loadImage(result.screenshot);
    }
});

function loadImage(src) {
    state.currentImage.onload = () => {
        draw();
    };
    state.currentImage.src = src;
}

function updateValueDisplays() {
    if (paddingValue) paddingValue.textContent = state.padding + 'px';
    if (shadowValue) shadowValue.textContent = state.shadow;
    if (radiusValue) radiusValue.textContent = state.radius + 'px';
    if (angleValue) angleValue.textContent = state.angle + '°';
    if (imageSizeValue) imageSizeValue.textContent = state.imageSize + '%';
}

function updateBgTypeUI() {
    const isGradient = state.bgType === 'gradient';
    
    if (gradientControls) gradientControls.style.display = isGradient ? 'block' : 'none';
    if (angleControl) angleControl.style.display = (isGradient && state.gradientStyle === 'linear') ? 'block' : 'none';
    if (colorEndWrapper) colorEndWrapper.style.display = isGradient ? 'flex' : 'none';
    if (presetRow) presetRow.style.display = isGradient ? 'flex' : 'none';
}

// --- 4. EVENT LISTENERS ---

// Sliders
paddingInput.addEventListener('input', (e) => { 
    state.padding = parseInt(e.target.value); 
    updateValueDisplays();
    draw(); 
});
shadowInput.addEventListener('input', (e) => { 
    state.shadow = parseInt(e.target.value); 
    updateValueDisplays();
    draw(); 
});
radiusInput.addEventListener('input', (e) => { 
    state.radius = parseInt(e.target.value); 
    updateValueDisplays();
    draw(); 
});
angleInput.addEventListener('input', (e) => { 
    state.angle = parseInt(e.target.value); 
    updateValueDisplays();
    draw(); 
});

// Colors
colorStart.addEventListener('input', (e) => { state.gradientStart = e.target.value; draw(); });
colorEnd.addEventListener('input', (e) => { state.gradientEnd = e.target.value; draw(); });

// Presets
presetBtns.forEach(btn => {
    btn.addEventListener('click', (e) => {
        const s = e.target.getAttribute('data-start');
        const end = e.target.getAttribute('data-end');
        
        state.gradientStart = s;
        state.gradientEnd = end;
        
        colorStart.value = s;
        colorEnd.value = end;
        
        draw();
    });
});

// Settings Checkbox
saveSettingsCheck.addEventListener('change', () => {
    saveState();
});

// Background Type Toggle (Gradient/Solid)
bgTypeBtns.forEach(btn => btn.addEventListener('click', (e) => {
    updateActiveBtn(bgTypeBtns, null);
    e.target.classList.add('active');
    state.bgType = e.target.getAttribute('data-value');
    updateBgTypeUI();
    draw();
}));

// Aspect Ratio Select
ratioSelect.addEventListener('change', (e) => {
    state.aspectRatio = e.target.value;
    draw();
});

// Image Size Slider
imageSizeInput.addEventListener('input', (e) => {
    state.imageSize = parseInt(e.target.value);
    updateValueDisplays();
    draw();
});

// Style Toggle Buttons
styleBtns.forEach(btn => btn.addEventListener('click', (e) => {
    updateActiveBtn(styleBtns, null);
    e.target.classList.add('active');
    state.gradientStyle = e.target.getAttribute('data-value');
    updateBgTypeUI();
    draw();
}));

// Helper to update button UI
function updateActiveBtn(nodeList, valueOrNull) {
    nodeList.forEach(btn => {
        btn.classList.remove('active');
        if (valueOrNull && btn.getAttribute('data-value') === valueOrNull) {
            btn.classList.add('active');
        }
    });
}

// --- 5. SIDEBAR TOGGLE (Responsive) ---
function toggleSidebar() {
    sidebar.classList.toggle('collapsed');
    const icon = sidebarToggle.querySelector('.toggle-icon');
    if (sidebar.classList.contains('collapsed')) {
        icon.textContent = '▶';
    } else {
        icon.textContent = '◀';
    }
}

sidebarToggle.addEventListener('click', toggleSidebar);
closeSidebar.addEventListener('click', toggleSidebar);

// --- 6. CROP LOGIC ---
startCropBtn.addEventListener('click', () => {
    cropModal.style.display = 'flex';
    cropTarget.src = state.currentImage.src; 

    if (cropper) cropper.destroy();
    
    cropper = new Cropper(cropTarget, {
        viewMode: 1,
        dragMode: 'move',
        autoCropArea: 0.9,
        background: false,
    });
});

cancelCropBtn.addEventListener('click', () => {
    cropModal.style.display = 'none';
    if (cropper) cropper.destroy();
});

applyCropBtn.addEventListener('click', () => {
    if (!cropper) return;
    const canvasData = cropper.getCroppedCanvas();
    loadImage(canvasData.toDataURL());
    cropModal.style.display = 'none';
    cropper.destroy();
    cropper = null;
});

// --- 7. RESET BUTTON ---
resetBtn.addEventListener('click', () => {
    if (state.originalImageSrc) {
        loadImage(state.originalImageSrc);
    }
});

// --- 8. DONATE BOX ---
const donateBox = document.getElementById('donateBox');
const closeDonateBtn = document.getElementById('closeDonateBtn');

const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

// Check if donate box should be shown
chrome.storage.local.get(['hasDonated', 'donateDismissedAt'], (result) => {
    if (!donateBox) return;
    
    // If user donated, permanently hide
    if (result.hasDonated) {
        donateBox.style.display = 'none';
        return;
    }
    
    // If user dismissed, check if 7 days have passed
    if (result.donateDismissedAt) {
        const elapsed = Date.now() - result.donateDismissedAt;
        if (elapsed < SEVEN_DAYS_MS) {
            donateBox.style.display = 'none';
        }
        // If 7 days passed, box stays visible (default)
    }
});

// Close donate box (hide for 7 days)
closeDonateBtn.addEventListener('click', () => {
    donateBox.style.display = 'none';
    chrome.storage.local.set({ donateDismissedAt: Date.now() });
});

// Open Gumroad and mark as donated (permanently hide)
donateBtn.addEventListener('click', () => {
    chrome.storage.local.set({ hasDonated: true });
    donateBox.style.display = 'none';
    window.open('https://gumroad.com/l/framedshot', '_blank');
});

// --- 9. KEYBOARD SHORTCUTS ---
document.addEventListener('keydown', (e) => {
    // Ctrl+S or Cmd+S - Download
    if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        downloadBtn.click();
    }
    
    // Ctrl+C or Cmd+C - Copy (when not in input)
    if ((e.ctrlKey || e.metaKey) && e.key === 'c' && document.activeElement.tagName !== 'INPUT') {
        e.preventDefault();
        copyBtn.click();
    }
    
    // Escape - Close modals
    if (e.key === 'Escape') {
        if (cropModal.style.display !== 'none') {
            cropModal.style.display = 'none';
            if (cropper) cropper.destroy();
        }
    }
    
    // Tab - Toggle sidebar (on mobile)
    if (e.key === 'Tab' && window.innerWidth <= 768) {
        e.preventDefault();
        toggleSidebar();
    }
});

// --- 10. EXPORT LOGIC ---

// Download
downloadBtn.addEventListener('click', () => {
    const originalText = downloadBtn.innerHTML;
    downloadBtn.innerHTML = '<span>⏳</span> Exporting...';
    downloadBtn.disabled = true;

    setTimeout(() => {
        const exportCanvas = document.createElement('canvas');
        drawToContext(exportCanvas);

        const link = document.createElement('a');
        link.download = `framedshot-${Date.now()}.png`;
        link.href = exportCanvas.toDataURL('image/png');
        link.click();

        downloadBtn.innerHTML = originalText;
        downloadBtn.disabled = false;
    }, 100);
});

// Copy to Clipboard
copyBtn.addEventListener('click', async () => {
    const originalText = copyBtn.innerHTML;
    copyBtn.innerHTML = '<span>⏳</span> Copying...';
    copyBtn.disabled = true;

    try {
        const exportCanvas = document.createElement('canvas');
        drawToContext(exportCanvas);
        
        const blob = await new Promise(resolve => exportCanvas.toBlob(resolve, 'image/png'));
        await navigator.clipboard.write([
            new ClipboardItem({ 'image/png': blob })
        ]);
        
        copyBtn.innerHTML = '<span>✓</span> Copied!';
        setTimeout(() => {
            copyBtn.innerHTML = originalText;
            copyBtn.disabled = false;
        }, 1500);
    } catch (err) {
        console.error('Copy failed:', err);
        copyBtn.innerHTML = '<span>✗</span> Failed';
        setTimeout(() => {
            copyBtn.innerHTML = originalText;
            copyBtn.disabled = false;
        }, 1500);
    }
});

// --- 11. DRAWING ENGINE ---
function draw() {
    saveState();
    drawToContext(canvas);
}

function saveState() {
    if (saveSettingsCheck.checked) {
        const preferences = {
            padding: state.padding,
            shadow: state.shadow,
            radius: state.radius,
            angle: state.angle,
            imageSize: state.imageSize,
            gradientStart: state.gradientStart,
            gradientEnd: state.gradientEnd,
            gradientStyle: state.gradientStyle,
            bgType: state.bgType,
            aspectRatio: state.aspectRatio
        };
        chrome.storage.local.set({ savedState: preferences, shouldSave: true });
    } else {
        chrome.storage.local.set({ shouldSave: false });
    }
}

function drawToContext(targetCanvas) {
    const ctx = targetCanvas.getContext('2d');
    const img = state.currentImage;
    
    if (!img.src) return;

    // A. Calculations - apply imageSize scaling to the image
    const imageScale = state.imageSize / 100;
    const imgW = img.naturalWidth * imageScale;
    const imgH = img.naturalHeight * imageScale;
    const p = state.padding;
    const r = state.radius;

    let canvasW = imgW + (p * 2);
    let canvasH = imgH + (p * 2);

    // Aspect Ratio Logic
    if (state.aspectRatio !== 'auto') {
        const ratio = parseFloat(state.aspectRatio);
        const currentRatio = canvasW / canvasH;
        if (currentRatio > ratio) {
            canvasH = canvasW / ratio;
        } else {
            canvasW = canvasH * ratio;
        }
    }

    targetCanvas.width = canvasW;
    targetCanvas.height = canvasH;

    // B. Draw Background
    if (state.bgType === 'solid') {
        // Solid color background
        ctx.fillStyle = state.gradientStart;
        ctx.fillRect(0, 0, canvasW, canvasH);
    } else {
        // Gradient background
        let grad;
        if (state.gradientStyle === 'radial') {
            const maxDim = Math.max(canvasW, canvasH);
            grad = ctx.createRadialGradient(
                canvasW / 2, canvasH / 2, 0,
                canvasW / 2, canvasH / 2, maxDim * 0.75
            );
        } else {
            // Linear with angle
            const angleRad = (state.angle - 90) * Math.PI / 180;
            const centerX = canvasW / 2;
            const centerY = canvasH / 2;
            const length = Math.sqrt(canvasW * canvasW + canvasH * canvasH) / 2;
            
            const x1 = centerX - Math.cos(angleRad) * length;
            const y1 = centerY - Math.sin(angleRad) * length;
            const x2 = centerX + Math.cos(angleRad) * length;
            const y2 = centerY + Math.sin(angleRad) * length;
            
            grad = ctx.createLinearGradient(x1, y1, x2, y2);
        }
        
        grad.addColorStop(0, state.gradientStart);
        grad.addColorStop(1, state.gradientEnd);
        
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, canvasW, canvasH);
    }

    // Center Image
    const drawX = (canvasW - imgW) / 2;
    const drawY = (canvasH - imgH) / 2;

    // C. Draw Shadow
    ctx.save();
    ctx.shadowColor = "rgba(0, 0, 0, 0.75)";
    ctx.shadowBlur = state.shadow * 2.5;
    ctx.shadowOffsetY = state.shadow * 1.2;
    ctx.fillStyle = "#000";
    roundRect(ctx, drawX, drawY, imgW, imgH, r);
    ctx.fill();
    ctx.restore();

    // D. Draw Image (Clipped)
    ctx.save();
    roundRect(ctx, drawX, drawY, imgW, imgH, r);
    ctx.clip();
    ctx.drawImage(img, drawX, drawY, imgW, imgH);
    ctx.restore();

    // No watermark - it's free!
}

// Utility: Rounded Rect Path
function roundRect(ctx, x, y, w, h, r) {
    if (w < 2 * r) r = w / 2;
    if (h < 2 * r) r = h / 2;
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
}
