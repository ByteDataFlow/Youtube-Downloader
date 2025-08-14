# 🎵 YouTube Downloader

A **Node.js CLI tool** to download YouTube videos or playlists in **video (up to 4K)** or **audio (MP3)** format selection, and playlist batch settings.

---

## ✨ Features
- 📥 Download **single video** or **entire playlist**
- 🎞 Video download in MP4 up to 4K (if available)
- 🎵 Audio-only MP3 download with **320kbps bitrate**
- 📊 Progress bar showing **downloaded file size in MB**
- 📂 Custom output folder selection
- 🔁 Playlist mode: **set quality and mode once** for all videos
- 🛠 Automatic merging of separate audio/video streams using FFmpeg
- 🚫 Safe filename sanitization

---

## 📦 Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/ByteDataFlow/Youtube-Downloader
   cd Youtube-Downloader

2. **Install dependencies**
    ```bash
    npm install
3. **Make sure FFmpeg is installed**

    Mac: ``` brew install ffmpeg ```

    Windows: ``` Download FFmpeg and add to PATH ```

    Linux: ``` sudo apt install ffmpeg ```

---
## ▶️ Usage

Run the app:
```bash
npm start
```
**Follow the interactive prompts:**

1. Paste the YouTube video or playlist URL.

2. Select Video or Audio Only mode.

3. (If Video) Select quality (e.g., 1080p, 720p, etc.).

4. Choose an output folder.

5. Wait for the download to complete.

---
## 📑 Playlist Mode

**When a playlist is detected:**

- The app will ask settings once for all videos (mode, quality, output folder).

- All videos will be downloaded automatically without further prompts.

---

## ⚙️ Configuration

**You can change:**

- Download mode: Video or Audio

- Quality: Based on available YouTube streams

- Output folder: Default is ./downloads


---
# 🐛 Troubleshooting

Only one input stream is supported error
Occurs when trying to merge more than one video/audio input at once.
Solution: Ensure only one video and one audio stream are passed to FFmpeg.