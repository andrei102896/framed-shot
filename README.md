# Framed Shot

Framed Shot is a browser extension for framing and exporting screenshots.

## Project Structure

- `manifest.json`: Extension manifest (root entrypoint for Chrome)
- `src/background/background.js`: Background service worker (capture + stitching)
- `src/editor/editor.html`: Editor shell
- `src/editor/editor.js`: Editor state/bootstrap
- `src/editor/editor.css`: Editor stylesheet entrypoint (imports style modules)
- `src/editor/styles/`: Editor style modules (`tokens`, `layout`, `controls`, `markup`, `footer`, `modal`, `responsive`)
- `src/editor/helpers/`: Editor helper modules (`aspect`, `canvas`, `preset`, `section`, `controls`, `annotations`, `export`, `shortcuts`, `footer-actions`, `ui`)
- `src/editor/vendor/`: Third-party editor vendor files (`cropper.js`, `cropper.css`)
- `assets/icons/`: Extension icons
- `landing/`: Landing page

## Run Locally

1. Open Chrome and go to `chrome://extensions`.
2. Enable Developer mode.
3. Click **Load unpacked** and select this folder.

## Linting

1. Install dependencies: `npm install`
2. Run lint: `npm run lint`
3. Auto-fix lint issues: `npm run lint:fix`
