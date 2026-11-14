# 0xshinky product site and web previews

Live website: [0xshinky.vercel.app](https://0xshinky.vercel.app)

The root opens the interactive web preview. Its Products tab links to the dedicated Windows and Android product pages at `/desktop/` and `/android/`. Each product page reads its latest release details from a server endpoint at runtime and links to its full UI preview. `/products/web/index.html` and `/products/android/index.html` are the copied interactive previews.

The original app asks `pywebview.api.get_games()` and `get_all_translations()` for live data. The browser preview fetches both at runtime through `/api/catalog` and `/api/translations`, using the upstream sources and catalog rules generated from the current desktop source. Neither product ships static game or translation catalogs. `/api/footage` fetches Steam details only after a game popup opens. The desktop app and browser preview use the same in-modal media carousel with previous/next controls and selectable thumbnails. Only the selected trailer or screenshot and thumbnails within the visible carousel area load; long descriptions and system requirements are rendered when their sections are expanded. The website explains that installing or playing a game requires the Windows application and links to its product page. Native app controls such as local installation state, build/platform selectors, cache/background settings, and install actions are omitted from the web UI. Product download links use the latest application releases.

`/api/desktop-update` reads the latest Windows executable from the configured GitLab release project. `/api/android-update` reads the latest APK. Set `GITLAB_API_V4_URL`, `GITLAB_DESKTOP_PROJECT_PATH`, and `GITLAB_ANDROID_PROJECT_PATH` in Vercel. The site does not keep release versions or artifact URLs in its static pages.

From the Android workspace, refresh the Web/Android previews from the desktop source:

```powershell
.\gradlew.bat bundlePreviewSite
```

From the standalone `0xshinky-web` folder, regenerate the web preview using the parent desktop checkout:

```powershell
python prepare_preview_site.py --web-only
```

Pass `--source-root` or set `0XSHINKY_SOURCE_DIR` to use another desktop checkout. This command updates `public/products/web` and its generated metadata. The Android workspace handles the Android preview and APK.

Run the site locally with:

```powershell
node dev-server.js
```

Open `http://127.0.0.1:4173`. This serves the original source UI, runtime game catalog, translations, and popup-triggered Steam details API together. Set `0XSHINKY_PREVIEW_URL` before building the Android APK when the game popup should link to the deployed preview site.

Use `preview-site` as the Vercel project root. Product pages are at `/desktop/` and `/android/`; the full previews are at `/products/web/index.html` and `/products/android/index.html`.
