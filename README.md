# winamp-video-maker

<img src="public/images/logo.png" alt="Semy Elite logo for winamp-video-maker" width="240" />

Turn audio into Winamp-style videos with classic skins, animated visualizers, custom backgrounds, and flexible export settings.

Created by **Festus-Olaleye Oluwafisayomi Oluwaseunfunmi and Semy Elite**.

## What it does

- Play your audio through classic Winamp skins, including Sony, Windows XP, Windows 98, and Netscape.
- Add multiple tracks, rename them, and scrub through your playlist on a timeline.
- Choose portrait, landscape, square, or custom frames and adjust the player size.
- Use a colour, image, or transparent background and preview fullscreen.
- Export your playlist as one video, each track separately, or selected tracks at 30/60 fps and 720p through 4K.
- Download MP4 for colour/image backgrounds or transparent WebM on supported browsers. Rendering happens locally in browser workers.
- Restore your saved tracks and editor settings after a reload; switch between dark and light themes.

## Make a video

1. Pick a template and add your audio through **Add tracks** or the dropzone.
2. Set the frame, player size, and background. Use playback and the timeline to preview.
3. Name your video in the header, select **Export**, and choose tracks, resolution, and frame rate.
4. Wait for the download. You can cancel from the progress notice.

Shortcuts: **K** play/pause, **J** previous track, **L** next track, **F** fullscreen. The help button shows the shortcuts and app credits.

Export requires browser support for WebCodecs; transparent WebM additionally requires VP9 alpha and Opus encoding. Available codecs and resolutions depend on your browser and device.

## Local development

Use **pnpm 11.10.0** and Node.js 22.22.1 or a newer Vite-compatible version. Install pnpm using its [installation instructions](https://pnpm.io/installation).

```sh
pnpm install
pnpm dev
```

Open **http://localhost:3000**. The dev server exits if port 3000 is occupied.

```sh
pnpm build
pnpm lint
pnpm preview
```

The build writes static files to `dist`. Keep `pnpm-lock.yaml` committed. Package-manager metadata and an install guard reject other package managers during normal installation; explicitly disabling their checks or scripts can bypass those guards.

## Link previews and deployment

Copy `.env.example` to `.env.local`, set `VITE_SITE_URL` to the public app URL, then run `pnpm build`. Serve `dist` at the site's root over HTTPS.

The build includes the name, description, author credits, and logo in HTML metadata so social and messaging apps can read them without running JavaScript. Setting the public URL adds absolute image and canonical URLs. Without it, local builds work, but public link previews are not ready until deployment. Platforms may cache previews or choose their own presentation.

The editor loads separately from the app shell; export code loads when you export. Webamp ships a large prebuilt module, so its chunk can still exceed Vite's 500 kB warning threshold.

## Contact

- [TikTok — @semyelite](https://www.tiktok.com/@semyelite)
- [Instagram — @omo.its.semy](https://www.instagram.com/omo.its.semy)
- [LinkedIn — Olaleye Fisayo](https://www.linkedin.com/in/olaleyefisayo/)
- [GitHub — OlaleyeFisayo](https://github.com/OlaleyeFisayo)
- [X — @semyelite](https://x.com/semyelite)
