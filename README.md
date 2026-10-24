# 0xshinky web preview

The site serves the current desktop `index.html` directly at `/products/web/index.html`; the root redirects there. It does not place the desktop app in an iframe. The copied source keeps its game cards, search, transitions, hover trailer preview and footer. Its footer links to the Android preview and signed Android APK.

The original app asks `pywebview.api.get_games()` and `get_all_translations()` for live data. The browser preview fetches both at runtime through `/api/catalog` and `/api/translations`, using the upstream list and catalog rules generated from the current desktop source. Neither product ships static game or translation catalogs. `/api/footage` returns the source's ordered Steam trailer URLs. Launch and install actions stay in preview mode.

From the Android workspace, refresh the Web/Android previews from the desktop source:

```powershell
.\gradlew.bat bundlePreviewSite
```

The source folder is auto-detected beside this workspace. Set `0XSHINKY_SOURCE_DIR` or pass `--source-root` only when selecting a different valid source. When working from this repository directly, run `python prepare_preview_site.py --source-root <desktop-source-folder>`.

To generate just the synchronized preview files:

```powershell
python preview-site/prepare_preview_site.py
```

Run locally with:

```powershell
node preview-site/dev-server.js
```

Open `http://127.0.0.1:4173`. This serves the original source UI, runtime game catalog, translations, and hover-trailer API together. Set `0XSHINKY_PREVIEW_URL` before building the Android APK when the game popup should link to the deployed preview site.

Use `preview-site` as the Vercel project root. The Android preview is at `/products/android/index.html`; the APK link resolves to the latest GitLab release.
