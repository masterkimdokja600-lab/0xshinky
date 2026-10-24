# 0xshinky web preview

The site serves the current desktop `index.html` directly at `/products/web/index.html`; the root redirects there. It does not place the desktop app in an iframe. The copied source keeps its game cards, search, transitions, hover trailer preview and footer. Its footer links to the Android preview and signed Android APK.

The original app asks `pywebview.api.get_games()` for its catalog and `get_game_trailer(appid)` for hover trailers. The browser preview fetches games at runtime through `/api/catalog`, using the upstream repository list generated from the current desktop source; the Android APK's bundled offline catalog is not used for the web product. `/api/footage` returns the source's ordered Steam trailer URLs. Launch and install actions stay in preview mode.

Build the synchronized Web/Android bundle and Release APK from the Android workspace:

```powershell
.\gradlew.bat bundlePreviewSite
```

The source folder is auto-detected beside this workspace. Set `0XSHINKY_SOURCE_DIR` or pass `--source-root` only when selecting a different valid source.

To generate just the synchronized preview files:

```powershell
python preview-site/prepare_preview_site.py
```

Run locally with:

```powershell
node preview-site/dev-server.js
```

Open `http://127.0.0.1:4173`. This serves the original source UI, runtime game catalog, and hover-trailer API together. Set `0XSHINKY_PREVIEW_URL` before `build_apk.bat` when the Android game popup should link to the deployed preview site.

Use `preview-site` as the Vercel project root. The Android preview is at `/products/android/index.html`; the APK is at `/downloads/0xshinky-android.apk`.
