# 0xshinky product site and web previews

The root is a minimal product index with separate Windows and Android pages at `/desktop/` and `/android/`. Each page reads its latest release details from a server endpoint at runtime and links to the full product UI preview. `/products/web/index.html` and `/products/android/index.html` remain the copied, interactive product previews.

The original app asks `pywebview.api.get_games()` and `get_all_translations()` for live data. The browser preview fetches both at runtime through `/api/catalog` and `/api/translations`, using the upstream list and catalog rules generated from the current desktop source. Neither product ships static game or translation catalogs. `/api/footage` returns the source's ordered Steam trailer URLs for games. Launch and install actions stay in preview mode. In the web preview, the fullscreen control and game download actions are hidden; the game dialog links to the Windows app download.

`/api/desktop-update` reads the latest Windows executable from the configured GitLab release project. `/api/android-update` reads the latest APK. Set `GITLAB_API_V4_URL`, `GITLAB_DESKTOP_PROJECT_PATH`, and `GITLAB_ANDROID_PROJECT_PATH` in Vercel. The site does not keep release versions or artifact URLs in its static pages.

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

Use `preview-site` as the Vercel project root. Product pages are at `/desktop/` and `/android/`; the full previews are at `/products/web/index.html` and `/products/android/index.html`.
