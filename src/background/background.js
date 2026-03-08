// background.js

const MENU_CAPTURE_VISIBLE = 'frame-shot';
const COMMAND_CAPTURE_SELECTION = 'capture-selection';
const RESTRICTED_URL_PREFIXES = [
    'chrome://',
    'chrome-extension://',
    'edge://',
    'about:',
    'view-source:'
];

chrome.runtime.onInstalled.addListener(() => {
    chrome.contextMenus.removeAll(() => {
        chrome.contextMenus.create({
            id: MENU_CAPTURE_VISIBLE,
            title: 'Frame this Shot',
            contexts: ['page']
        });
    });
});

chrome.action.onClicked.addListener((tab) => {
    captureVisibleAndOpenEditor(tab);
});

chrome.contextMenus.onClicked.addListener((info, tab) => {
    if (!tab) return;

    if (info.menuItemId === MENU_CAPTURE_VISIBLE) {
        captureVisibleAndOpenEditor(tab);
    }
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (!message || message.type !== 'OPEN_SHORTCUTS_PAGE') {
        return undefined;
    }

    try {
        chrome.tabs.create({ url: 'chrome://extensions/shortcuts' }, () => {
            if (chrome.runtime.lastError) {
                sendResponse({
                    ok: false,
                    error: chrome.runtime.lastError.message
                });
                return;
            }

            sendResponse({ ok: true });
        });
    } catch (error) {
        sendResponse({
            ok: false,
            error: error && error.message ? error.message : 'Failed to open shortcuts page.'
        });
    }

    return true;
});

chrome.commands.onCommand.addListener(async (command) => {
    if (command !== COMMAND_CAPTURE_SELECTION) return;
    const tab = await getActiveTab();
    if (!tab) return;
    captureSelectionAndOpenEditor(tab);
});

async function captureVisibleAndOpenEditor(tab) {
    if (!isCapturableTab(tab)) return;

    try {
        const screenshot = await captureVisibleTab(tab.windowId);
        await openEditorWithScreenshot(screenshot);
    } catch (error) {
        console.error('Visible capture failed:', error);
    }
}

async function captureSelectionAndOpenEditor(tab) {
    if (!isCapturableTab(tab) || !Number.isInteger(tab.id)) return;

    try {
        const selection = await requestAreaSelection(tab.id);
        if (!selection) return;

        const screenshot = await captureVisibleTab(tab.windowId);
        const cropped = await cropSelectionFromDataUrl(screenshot, selection);
        await openEditorWithScreenshot(cropped);
    } catch (error) {
        console.error('Selection capture failed:', error);
    }
}

function isCapturableTab(tab) {
    if (!tab || !Number.isInteger(tab.windowId)) return false;
    if (typeof tab.url !== 'string') return true;
    return !RESTRICTED_URL_PREFIXES.some((prefix) => tab.url.startsWith(prefix));
}

async function getActiveTab() {
    return new Promise((resolve) => {
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
            resolve((tabs && tabs[0]) || null);
        });
    });
}

async function captureVisibleTab(windowId) {
    return new Promise((resolve, reject) => {
        chrome.tabs.captureVisibleTab(windowId, { format: 'png' }, (dataUrl) => {
            if (chrome.runtime.lastError) {
                reject(new Error(chrome.runtime.lastError.message));
                return;
            }

            if (!dataUrl) {
                reject(new Error('Capture returned no image data.'));
                return;
            }

            resolve(dataUrl);
        });
    });
}

async function executeScript(tabId, func, args) {
    return new Promise((resolve, reject) => {
        chrome.scripting.executeScript({
            target: { tabId },
            func,
            args: args || []
        }, (results) => {
            if (chrome.runtime.lastError) {
                reject(new Error(chrome.runtime.lastError.message));
                return;
            }

            resolve(results || []);
        });
    });
}

async function requestAreaSelection(tabId) {
    const results = await executeScript(tabId, () => {
        return new Promise((resolve) => {
            const overlayId = 'framedshot-selection-overlay';
            const existing = document.getElementById(overlayId);
            if (existing) existing.remove();

            const overlay = document.createElement('div');
            const box = document.createElement('div');
            const hint = document.createElement('div');

            overlay.id = overlayId;
            overlay.style.position = 'fixed';
            overlay.style.inset = '0';
            overlay.style.zIndex = '2147483647';
            overlay.style.background = 'rgba(8, 10, 18, 0.24)';
            overlay.style.cursor = 'crosshair';
            overlay.style.userSelect = 'none';
            overlay.style.webkitUserSelect = 'none';
            overlay.style.touchAction = 'none';

            box.style.position = 'fixed';
            box.style.border = '2px solid #7c3aed';
            box.style.background = 'rgba(124, 58, 237, 0.12)';
            box.style.boxShadow = '0 0 0 1px rgba(255, 255, 255, 0.22), 0 18px 40px rgba(0, 0, 0, 0.28)';
            box.style.borderRadius = '12px';
            box.style.display = 'none';

            hint.textContent = 'Drag to select an area. Esc to cancel.';
            hint.style.position = 'fixed';
            hint.style.top = '18px';
            hint.style.left = '50%';
            hint.style.transform = 'translateX(-50%)';
            hint.style.padding = '10px 14px';
            hint.style.borderRadius = '999px';
            hint.style.background = 'rgba(15, 17, 25, 0.92)';
            hint.style.border = '1px solid rgba(255, 255, 255, 0.16)';
            hint.style.color = '#F5F7FF';
            hint.style.font = '600 13px/1 -apple-system, BlinkMacSystemFont, Segoe UI, Roboto, sans-serif';
            hint.style.letterSpacing = '0.01em';
            hint.style.pointerEvents = 'none';

            overlay.appendChild(box);
            overlay.appendChild(hint);
            document.documentElement.appendChild(overlay);

            let dragStartX = 0;
            let dragStartY = 0;
            let pointerId = null;
            let isDragging = false;
            let didResolve = false;

            function resolveAfterPaint(result) {
                if (didResolve) return;
                didResolve = true;

                document.removeEventListener('keydown', handleKeyDown, true);
                if (overlay.parentNode) overlay.remove();

                // Wait two frames so Chrome repaints the page without the overlay
                // before background capture runs. This avoids dim tint and border bleed.
                requestAnimationFrame(() => {
                    requestAnimationFrame(() => {
                        resolve(result || null);
                    });
                });
            }

            function updateBox(clientX, clientY) {
                const left = Math.min(dragStartX, clientX);
                const top = Math.min(dragStartY, clientY);
                const width = Math.abs(clientX - dragStartX);
                const height = Math.abs(clientY - dragStartY);

                box.style.display = 'block';
                box.style.left = left + 'px';
                box.style.top = top + 'px';
                box.style.width = width + 'px';
                box.style.height = height + 'px';
            }

            function finishSelection(clientX, clientY) {
                const left = Math.min(dragStartX, clientX);
                const top = Math.min(dragStartY, clientY);
                const width = Math.abs(clientX - dragStartX);
                const height = Math.abs(clientY - dragStartY);

                if (width < 12 || height < 12) {
                    resolveAfterPaint(null);
                    return;
                }

                resolveAfterPaint({
                    x: left,
                    y: top,
                    width,
                    height,
                    viewportWidth: window.innerWidth,
                    viewportHeight: window.innerHeight
                });
            }

            function handlePointerDown(event) {
                if (event.button !== 0) return;

                isDragging = true;
                pointerId = event.pointerId;
                dragStartX = event.clientX;
                dragStartY = event.clientY;
                overlay.setPointerCapture(pointerId);
                updateBox(event.clientX, event.clientY);
                event.preventDefault();
            }

            function handlePointerMove(event) {
                if (!isDragging || event.pointerId !== pointerId) return;
                updateBox(event.clientX, event.clientY);
                event.preventDefault();
            }

            function handlePointerUp(event) {
                if (!isDragging || event.pointerId !== pointerId) return;
                isDragging = false;
                if (overlay.hasPointerCapture(pointerId)) {
                    overlay.releasePointerCapture(pointerId);
                }
                finishSelection(event.clientX, event.clientY);
                event.preventDefault();
            }

            function handlePointerCancel(event) {
                if (!isDragging || event.pointerId !== pointerId) return;
                isDragging = false;
                if (overlay.hasPointerCapture(pointerId)) {
                    overlay.releasePointerCapture(pointerId);
                }
                resolveAfterPaint(null);
            }

            function handleKeyDown(event) {
                if (event.key !== 'Escape') return;
                event.preventDefault();
                resolveAfterPaint(null);
            }

            overlay.addEventListener('pointerdown', handlePointerDown);
            overlay.addEventListener('pointermove', handlePointerMove);
            overlay.addEventListener('pointerup', handlePointerUp);
            overlay.addEventListener('pointercancel', handlePointerCancel);
            document.addEventListener('keydown', handleKeyDown, true);
        });
    });

    return results[0] && results[0].result ? results[0].result : null;
}

async function cropSelectionFromDataUrl(dataUrl, selection) {
    const bitmap = await dataUrlToImageBitmap(dataUrl);
    const scaleX = bitmap.width / Math.max(1, selection.viewportWidth || bitmap.width);
    const scaleY = bitmap.height / Math.max(1, selection.viewportHeight || bitmap.height);

    const sx = clampInt(Math.round(selection.x * scaleX), 0, bitmap.width - 1);
    const sy = clampInt(Math.round(selection.y * scaleY), 0, bitmap.height - 1);
    const sw = clampInt(Math.round(selection.width * scaleX), 1, bitmap.width - sx);
    const sh = clampInt(Math.round(selection.height * scaleY), 1, bitmap.height - sy);

    const canvas = new OffscreenCanvas(sw, sh);
    const ctx = canvas.getContext('2d');
    if (!ctx) {
        throw new Error('Unable to create crop canvas.');
    }

    ctx.drawImage(bitmap, sx, sy, sw, sh, 0, 0, sw, sh);

    if (typeof bitmap.close === 'function') {
        bitmap.close();
    }

    const blob = await canvas.convertToBlob({ type: 'image/png' });
    return blobToDataUrl(blob);
}

function clampInt(value, min, max) {
    return Math.min(max, Math.max(min, value));
}

async function openEditorWithScreenshot(screenshot) {
    await storageSet({ screenshot });
    await createTab({ url: 'editor/index.html' });
}

async function storageSet(value) {
    return new Promise((resolve, reject) => {
        chrome.storage.local.set(value, () => {
            if (chrome.runtime.lastError) {
                reject(new Error(chrome.runtime.lastError.message));
                return;
            }
            resolve();
        });
    });
}

async function createTab(createProperties) {
    return new Promise((resolve, reject) => {
        chrome.tabs.create(createProperties, (tab) => {
            if (chrome.runtime.lastError) {
                reject(new Error(chrome.runtime.lastError.message));
                return;
            }
            resolve(tab);
        });
    });
}

async function dataUrlToImageBitmap(dataUrl) {
    const response = await fetch(dataUrl);
    const blob = await response.blob();
    return createImageBitmap(blob);
}

async function blobToDataUrl(blob) {
    const buffer = await blob.arrayBuffer();
    const bytes = new Uint8Array(buffer);
    let binary = '';
    const chunkSize = 0x8000;

    for (let i = 0; i < bytes.length; i += chunkSize) {
        const chunk = bytes.subarray(i, i + chunkSize);
        binary += String.fromCharCode(...chunk);
    }

    return 'data:' + (blob.type || 'application/octet-stream') + ';base64,' + btoa(binary);
}
