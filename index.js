#!/usr/bin/env node

import fs from "fs";
import path from "path";
import chalk from "chalk";
import inquirer from "inquirer";
import ytdl from "@distube/ytdl-core";
import ytpl from "@distube/ytpl";
import cliProgress from "cli-progress";
import ffmpeg from "fluent-ffmpeg";

console.clear();
console.log(chalk.cyan.bold("🎵 YouTube Downloader \n"));

(async () => {
    // Prompt URL
    const { url } = await inquirer.prompt([
        { name: "url", message: "Paste YouTube video or playlist URL:", type: "input" }
    ]);

    let videos = [];
    let isPlaylist = false;

    // Playlist or single video
    try {
        const playlistId = await ytpl.getPlaylistID(url);
        const playlist = await ytpl(playlistId, { limit: Infinity });
        console.log(chalk.yellow(`📜 Playlist detected: ${playlist.title} (${playlist.items.length} videos)`));
        videos = playlist.items.map(v => v.shortUrl);
        isPlaylist = true;
    } catch {
        videos = [url];
    }

    let globalMode = null;
    let globalFormat = null;
    let globalOutputDir = null;

    // Kalau playlist → tanya pengaturan di awal
    if (isPlaylist) {
        const firstInfo = await ytdl.getInfo(videos[0]);
        const { mode } = await inquirer.prompt([
            {
                name: "mode",
                message: "Choose download mode for ALL videos:",
                type: "list",
                choices: ["Video", "Audio Only"]
            }
        ]);
        globalMode = mode;

        if (mode === "Video") {
            const formats = ytdl.filterFormats(firstInfo.formats, "videoonly")
                .filter(f => f.container === "mp4" && f.hasVideo)
                .sort((a, b) => b.height - a.height);
            const choices = formats.map(f => ({
                name: `${f.qualityLabel} - ${f.container} - ${(f.contentLength / 1024 / 1024).toFixed(2)} MB`,
                value: f
            }));
            globalFormat = (await inquirer.prompt([
                { name: "quality", message: "Select video quality for ALL videos:", type: "list", choices }
            ])).quality;
        }

        const { outputDir } = await inquirer.prompt([
            { name: "outputDir", message: "Output folder:", default: "./downloads" }
        ]);
        globalOutputDir = outputDir;
        if (!fs.existsSync(globalOutputDir)) fs.mkdirSync(globalOutputDir, { recursive: true });
    }

    // Loop videos
    for (const videoUrl of videos) {
        try {
            const info = await ytdl.getInfo(videoUrl);
            const title = info.videoDetails.title;
            const safeTitle = title.replace(/[<>:"/\\|?*]+/g, "");
            const lengthSec = info.videoDetails.lengthSeconds;
            const views = info.videoDetails.viewCount;
            const author = info.videoDetails.author.name;

            console.log(chalk.green(`\n📄 Title: ${title}`));
            console.log(chalk.blue(`⏱ Duration: ${lengthSec} sec`));
            console.log(chalk.magenta(`📺 Channel: ${author}`));
            console.log(chalk.yellow(`👀 Views: ${views}`));

            let mode = globalMode;
            let formatChosen = globalFormat;
            let outputDir = globalOutputDir;

            if (!isPlaylist) {
                const res = await inquirer.prompt([
                    {
                        name: "mode",
                        message: "Choose download mode:",
                        type: "list",
                        choices: ["Video", "Audio Only"]
                    }
                ]);
                mode = res.mode;

                if (mode === "Video") {
                    const formats = ytdl.filterFormats(info.formats, "videoonly")
                        .filter(f => f.container === "mp4" && f.hasVideo)
                        .sort((a, b) => b.height - a.height);
                    const choices = formats.map(f => ({
                        name: `${f.qualityLabel} - ${f.container} - ${(f.contentLength / 1024 / 1024).toFixed(2)} MB`,
                        value: f
                    }));
                    formatChosen = (await inquirer.prompt([
                        { name: "quality", message: "Select video quality:", type: "list", choices }
                    ])).quality;
                }

                const out = await inquirer.prompt([
                    { name: "outputDir", message: "Output folder:", default: "./downloads" }
                ]);
                outputDir = out.outputDir;
                if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });
            }

            const finalPath = path.join(outputDir, `${safeTitle}.${mode === "Audio Only" ? "mp3" : "mp4"}`);

            if (mode === "Video") {
                // Download video
                console.log(chalk.blue(`⬇️ Downloading video: ${safeTitle}`));

                const tempVideoPath = path.join(outputDir, `${safeTitle}_video.tmp.mp4`);
                const tempAudioPath = path.join(outputDir, `${safeTitle}_audio.tmp.mp4`);

                const barVideo = new cliProgress.SingleBar({
                    format: `Video   [{bar}] {percentage}% | {downloaded} MB`,
                    hideCursor: true
                }, cliProgress.Presets.shades_classic);

                const barAudio = new cliProgress.SingleBar({
                    format: `Audio   [{bar}] {percentage}% | {downloaded} MB`,
                    hideCursor: true
                }, cliProgress.Presets.shades_classic);

                await new Promise((resolve, reject) => {
                    const stream = ytdl(videoUrl, { quality: formatChosen.itag, filter: "videoonly" });
                    stream.on("progress", (_, downloaded, total) => {
                        if (!barVideo.isActive) barVideo.start(100, 0, { downloaded: "0.00" });
                        const percent = (downloaded / total) * 100;
                        barVideo.update(percent, { downloaded: (downloaded / 1024 / 1024).toFixed(2) });
                    });
                    stream.on("end", () => { barVideo.stop(); resolve(); });
                    stream.on("error", reject);
                    stream.pipe(fs.createWriteStream(tempVideoPath));
                });

                await new Promise((resolve, reject) => {
                    const stream = ytdl(videoUrl, { quality: "highestaudio" });
                    stream.on("progress", (_, downloaded, total) => {
                        if (!barAudio.isActive) barAudio.start(100, 0, { downloaded: "0.00" });
                        const percent = (downloaded / total) * 100;
                        barAudio.update(percent, { downloaded: (downloaded / 1024 / 1024).toFixed(2) });
                    });
                    stream.on("end", () => { barAudio.stop(); resolve(); });
                    stream.on("error", reject);
                    stream.pipe(fs.createWriteStream(tempAudioPath));
                });

                console.log(chalk.magenta("🎬 Merging video & audio..."));
                await new Promise((resolve, reject) => {
                    ffmpeg()
                        .input(tempVideoPath)
                        .input(tempAudioPath)
                        .videoCodec("copy")
                        .audioCodec("copy")
                        .save(finalPath)
                        .on("end", () => {
                            console.log(chalk.green(`✅ Saved: ${finalPath}`));
                            fs.unlinkSync(tempVideoPath);
                            fs.unlinkSync(tempAudioPath);
                            resolve();
                        })
                        .on("error", reject);
                });
            } else {
                // Audio-only
                const bar = new cliProgress.SingleBar({
                    format: `Audio   [{bar}] {percentage}% | {downloaded} MB`,
                    hideCursor: true
                }, cliProgress.Presets.shades_classic);

                await new Promise((resolve, reject) => {
                    const stream = ytdl(videoUrl, { quality: "highestaudio" });
                    stream.on("progress", (_, downloaded, total) => {
                        if (!bar.isActive) bar.start(100, 0, { downloaded: "0.00" });
                        const percent = (downloaded / total) * 100;
                        bar.update(percent, { downloaded: (downloaded / 1024 / 1024).toFixed(2) });
                    });
                    ffmpeg(stream)
                        .audioBitrate(320)
                        .save(finalPath)
                        .on("end", () => { bar.stop(); console.log(chalk.green(`✅ Saved: ${finalPath}`)); resolve(); })
                        .on("error", reject);
                });
            }
        } catch (err) {
            console.error(chalk.red(`❌ Error: ${err.message}`));
        }
    }
})();
