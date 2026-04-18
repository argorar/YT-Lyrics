// ==UserScript==
// @name         YT-Lyrics
// @version      1.0.1
// @description  Karaoke, Search Explorer Lyrics
// @author       argorar
// @match        *://*.youtube.com/*
// @grant        GM_xmlhttpRequest
// @connect      lrclib.net
// @updateURL    https://github.com/argorar/YT-Lyrics/raw/master/YT-Lyrics.user.js
// @downloadURL  https://github.com/argorar/YT-Lyrics/raw/master/YT-Lyrics.user.js
// ==/UserScript==

(function () {
    'use strict';

    console.log("[YT-Lyrics] Init V1.0.0");

    // ======== STATE VARIABLES ========
    let currentRawLyrics = "";
    let currentParsedLyrics = [];
    let isKaraokeMode = false;
    let karaokeIntervalId = null;
    let lastActiveIndex = -1;

    let contentDiv = null;
    let titleSpan = null;
    let lyricsPanel = null;
    let karaokeBtn = null;
    let searchPanelBtn = null;

    // ======== CSP-SAFE SVG MAKER ========
    function createSVG(iconPath, viewBox = "0 0 24 24") {
        const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
        svg.setAttribute("viewBox", viewBox);
        svg.setAttribute("width", "100%");
        svg.setAttribute("height", "100%");
        svg.style.display = "block";
        svg.style.pointerEvents = "none";
        svg.style.fill = "currentColor";

        const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
        path.setAttribute("d", iconPath);
        svg.appendChild(path);
        return svg;
    }

    const icons = {
        music: "M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z",
        karaoke: "M12,14c1.66,0,3-1.34,3-3V5c0-1.66-1.34-3-3-3S9,3.34,9,5v6C9,12.66,10.34,14,12,14z M17,11c0,2.76-2.24,5-5,5s-5-2.24-5-5H5c0,3.53,2.61,6.43,6,6.92V21h2v-3.08c3.39-0.49,6-3.39,6-6.92H17z",
        search: "M15.5 14h-.79l-.28-.27C15.41 12.59 16 11.11 16 9.5 16 5.91 13.09 3 9.5 3S3 5.91 3 9.5 5.91 16 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z",
        close: "M19,6.41L17.59,5L12,10.59L6.41,5L5,6.41L10.59,12L5,17.59L6.41,19L12,13.41L17.59,19L19,17.59L13.41,12L19,6.41z"
    };

    // ======== INJECTED STYLES ========
    const style = document.createElement('style');
    style.textContent = `
        #yt-lyrics-action-btn {
            background-color: var(--yt-spec-button-chip-background-hover, rgba(255, 255, 255, 0.1));
            color: var(--yt-spec-text-primary, #fff);
            border: none;
            border-radius: 18px;
            height: 36px;
            padding: 0 14px 0 12px;
            font-size: 14px;
            font-weight: 500;
            font-family: 'Roboto', 'Inter', sans-serif;
            cursor: pointer;
            display: flex;
            align-items: center;
            gap: 6px;
            margin-left: 8px;
            transition: background 0.2s;
        }
        #yt-lyrics-action-btn:hover {
            background-color: var(--yt-spec-badge-chip-background, rgba(255, 255, 255, 0.2));
        }

        #yt-lyrics-panel {
            position: fixed;
            bottom: 20px;
            right: 20px;
            width: 440px;
            height: clamp(300px, 60%, 550px);
            background: rgba(18, 18, 18, 0.95);
            backdrop-filter: blur(12px);
            color: #fff;
            z-index: 999999;
            border-radius: 16px;
            padding: 20px;
            box-shadow: 0 10px 30px rgba(0,0,0,0.8);
            display: none;
            flex-direction: column;
            font-family: 'Roboto', 'Inter', sans-serif;
            border: 1px solid rgba(255, 255, 255, 0.12);
            opacity: 0;
            transform: translateY(10px);
            transition: opacity 0.2s ease, transform 0.2s ease;
        }
        #yt-lyrics-panel.show {
            display: flex;
            opacity: 1;
            transform: translateY(0);
        }
        #yt-lyrics-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            border-bottom: 1px solid rgba(255, 255, 255, 0.15);
            padding-bottom: 12px;
            margin-bottom: 12px;
        }
        #yt-lyrics-title {
            font-size: 16px;
            font-weight: 600;
            color: #FFF;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
            padding-right: 15px;
            flex: 1;
        }

        /* Top Controls */
        .yt-lyrics-icon-btn {
            background: rgba(255,255,255, 0.1);
            border: none;
            color: #eee;
            cursor: pointer;
            transition: all 0.2s ease;
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 6px;
        }
        .yt-lyrics-icon-btn:hover {
            background: rgba(255,255,255, 0.25);
            color: #fff;
        }
        #yt-lyrics-karaoke-btn, #yt-lyrics-search-top-btn {
            font-size: 13px;
            padding: 6px 10px 6px 10px;
            border-radius: 14px;
            margin-right: 8px;
        }
        #yt-lyrics-karaoke-btn.active-karaoke {
            background: rgba(255, 45, 45, 0.85);
            color: #fff;
            box-shadow: 0 0 10px rgba(255, 45, 45, 0.4);
        }
        #yt-lyrics-close {
            width: 32px;
            height: 32px;
            padding: 6px;
            border-radius: 50%;
        }

        /* Core Content Window */
        #yt-lyrics-content {
            flex: 1;
            overflow-y: auto;
            font-size: 14.5px;
            line-height: 1.8;
            color: #ececec;
            padding: 10px 10px 30px 10px;
            letter-spacing: 0.2px;
        }
        #yt-lyrics-content::-webkit-scrollbar { width: 6px; }
        #yt-lyrics-content::-webkit-scrollbar-thumb {
            background: rgba(255, 255, 255, 0.3);
            border-radius: 3px;
        }
        .lyric-line {
            margin-bottom: 5px;
        }
        .highlighted-timestamp {
            font-size: 11px;
            color: rgba(255, 78, 78, 0.9);
            user-select: none;
            margin-right: 8px;
        }

        /* Search Input */
        .yt-lyrics-manual-input {
            width: 100%;
            box-sizing: border-box;
            padding: 12px;
            border-radius: 10px;
            border: 1px solid rgba(255, 255, 255, 0.2);
            background: rgba(0, 0, 0, 0.5);
            color: #fff;
            font-family: inherit;
            font-size: 14px;
            outline: none;
            transition: border 0.3s;
        }
        .yt-lyrics-manual-input:focus {
            border-color: rgba(255, 255, 255, 0.7);
        }

        /* Search Result Item Card */
        .yt-lyrics-result-item {
            padding: 12px;
            border-radius: 10px;
            background: rgba(255, 255, 255, 0.05);
            border: 1px solid rgba(255, 255, 255, 0.08);
            cursor: pointer;
            transition: background 0.2s, transform 0.1s;
        }
        .yt-lyrics-result-item:hover {
            background: rgba(255, 255, 255, 0.12);
            transform: translateY(-2px);
            border: 1px solid rgba(255, 255, 255, 0.2);
        }

        /* ====== KARAOKE DESIGN ====== */
        #yt-lyrics-panel.karaoke-mode #yt-lyrics-content {
            font-size: 19px;
            font-weight: bold;
            text-align: center;
            line-height: 1.5;
        }
        #yt-lyrics-panel.karaoke-mode .lyric-line {
            margin-bottom: 20px;
            opacity: 0.25;
            transition: opacity 0.3s, transform 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275);
            filter: blur(0.8px);
        }
        #yt-lyrics-panel.karaoke-mode .lyric-line.active {
            opacity: 1;
            transform: scale(1.18);
            color: #ff4e4e;
            filter: blur(0px);
            text-shadow: 0 0 15px rgba(255, 78, 78, 0.35);
        }
    `;
    document.head.appendChild(style);


    // ======== DOM INJECTION ========
    function injectPanel() {
        if (document.getElementById('yt-lyrics-panel')) return;

        lyricsPanel = document.createElement('div');
        lyricsPanel.id = 'yt-lyrics-panel';

        const headerDiv = document.createElement('div');
        headerDiv.id = 'yt-lyrics-header';

        titleSpan = document.createElement('span');
        titleSpan.id = 'yt-lyrics-title';
        titleSpan.textContent = 'Lyrics...';

        const rightControls = document.createElement('div');
        rightControls.style.display = 'flex';
        rightControls.style.alignItems = 'center';

        // Search Trigger Button
        searchPanelBtn = document.createElement('button');
        searchPanelBtn.id = 'yt-lyrics-search-top-btn';
        searchPanelBtn.className = 'yt-lyrics-icon-btn';
        const sIconBox = document.createElement('div');
        sIconBox.style.width = "18px";
        sIconBox.style.height = "18px";
        sIconBox.appendChild(createSVG(icons.search));
        searchPanelBtn.appendChild(sIconBox);

        // Karaoke Trigger Button
        karaokeBtn = document.createElement('button');
        karaokeBtn.id = 'yt-lyrics-karaoke-btn';
        karaokeBtn.className = 'yt-lyrics-icon-btn';
        karaokeBtn.style.display = 'none';
        const karIconBox = document.createElement('div');
        karIconBox.style.width = "18px";
        karIconBox.style.height = "18px";
        karIconBox.appendChild(createSVG(icons.karaoke));
        const karText = document.createElement('span');
        karText.textContent = "Karaoke";
        karaokeBtn.appendChild(karIconBox);
        karaokeBtn.appendChild(karText);

        // Close Button
        const closeBtn = document.createElement('button');
        closeBtn.id = 'yt-lyrics-close';
        closeBtn.className = 'yt-lyrics-icon-btn';
        const closeIconBox = document.createElement('div');
        closeIconBox.style.width = "20px";
        closeIconBox.style.height = "20px";
        closeIconBox.appendChild(createSVG(icons.close));
        closeBtn.appendChild(closeIconBox);

        rightControls.appendChild(searchPanelBtn);
        rightControls.appendChild(karaokeBtn);
        rightControls.appendChild(closeBtn);

        headerDiv.appendChild(titleSpan);
        headerDiv.appendChild(rightControls);

        contentDiv = document.createElement('div');
        contentDiv.id = 'yt-lyrics-content';
        contentDiv.textContent = 'Initializing...';

        lyricsPanel.appendChild(headerDiv);
        lyricsPanel.appendChild(contentDiv);

        document.body.appendChild(lyricsPanel);

        // Events
        closeBtn.addEventListener('click', () => {
            lyricsPanel.classList.remove('show');
            stopKaraokeLoop();
        });

        karaokeBtn.addEventListener('click', () => {
            isKaraokeMode = !isKaraokeMode;
            renderLyricsView();
        });

        searchPanelBtn.addEventListener('click', () => {
            const track = extractTrackInfo() || { title: "", artist: "" };
            const cleanQuery = `${track.title} ${track.artist}`.trim();
            renderManualRescueForm(cleanQuery, false);
        });
    }

    function injectButton() {
        if (document.getElementById('yt-lyrics-action-btn')) return;

        const container = document.querySelector('ytd-menu-renderer #top-level-buttons-computed') ||
            document.querySelector('#actions-inner') ||
            document.querySelector('#actions.ytd-watch-metadata');

        if (!container) return;

        const btn = document.createElement('button');
        btn.id = 'yt-lyrics-action-btn';

        const mainIconBox = document.createElement('div');
        mainIconBox.style.width = "18px";
        mainIconBox.style.height = "18px";
        mainIconBox.appendChild(createSVG(icons.music));

        const labelText = document.createElement('span');
        labelText.textContent = 'Lyrics';

        btn.appendChild(mainIconBox);
        btn.appendChild(labelText);

        const segmentedBtn = container.querySelector('ytd-segmented-like-dislike-button-renderer');
        if (segmentedBtn) {
            let targetChild = segmentedBtn;
            while (targetChild && targetChild.parentNode !== container) {
                targetChild = targetChild.parentNode;
            }
            if (targetChild && targetChild.nextSibling) {
                container.insertBefore(btn, targetChild.nextSibling);
            } else {
                container.appendChild(btn);
            }
        } else {
            container.appendChild(btn);
        }

        btn.addEventListener('click', () => {
            if (!lyricsPanel) injectPanel();

            if (lyricsPanel.classList.contains('show')) {
                lyricsPanel.classList.remove('show');
                stopKaraokeLoop();
            } else {
                lyricsPanel.classList.add('show');
                fetchLyrics();
            }
        });
    }

    setInterval(() => {
        injectPanel();
        injectButton();
    }, 1500);

    // ======== UTILS & COMPONENTS ========

    function createSearchInputBar(defaultQuery) {
        const formContainer = document.createElement('div');
        formContainer.style.display = "flex";
        formContainer.style.gap = "8px";
        formContainer.style.marginBottom = "15px";
        formContainer.style.width = "100%";

        const manualInput = document.createElement('input');
        manualInput.type = "text";
        manualInput.className = "yt-lyrics-manual-input";
        manualInput.style.marginBottom = "0";
        manualInput.style.flex = "1";
        manualInput.placeholder = "Song or Artist";
        manualInput.value = defaultQuery || "";

        const searchBtn = document.createElement('button');
        searchBtn.className = "yt-lyrics-icon-btn";
        searchBtn.style.padding = "0 14px";
        searchBtn.style.borderRadius = "10px";
        searchBtn.style.background = "var(--yt-spec-button-chip-background-hover, rgba(255, 255, 255, 0.15))";

        const boxIconSpan = document.createElement('div');
        boxIconSpan.style.width = "18px";
        boxIconSpan.style.height = "18px";
        boxIconSpan.appendChild(createSVG(icons.search));
        searchBtn.appendChild(boxIconSpan);

        const submitManual = () => {
            const queryRaw = manualInput.value.trim();
            if (queryRaw) fetchLyrics(queryRaw);
        };

        searchBtn.addEventListener('click', submitManual);
        manualInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') submitManual();
        });

        formContainer.appendChild(manualInput);
        formContainer.appendChild(searchBtn);
        return { element: formContainer, input: manualInput };
    }


    function extractTrackInfo() {
        let rawTitle = document.querySelector('h1.style-scope.ytd-watch-metadata yt-formatted-string')?.textContent ||
            document.querySelector('#title h1 yt-formatted-string')?.textContent || "";

        let channelName = document.querySelector('#upload-info .ytd-channel-name a')?.textContent || '';
        if (!rawTitle) return null;

        let cleanTitle = rawTitle.replace(/\s*[\(\[\{][^\)\]\}]*[\)\]\}]/g, '');
        cleanTitle = cleanTitle.replace(/\b(official|oficial|lyric(s)?|audio|video|music)\b/gi, '');
        cleanTitle = cleanTitle.replace(/^-+|-+$/g, '').trim();

        let artist = channelName.replace(/\s+-\s+topic/i, '').replace(/VEVO/i, '').replace(/official|oficial/gi, '');
        artist = artist.replace(/^-+|-+$/g, '').trim();

        let title = cleanTitle;
        const split = cleanTitle.split(/\s+-\s+|—/);
        if (split.length >= 2) {
            artist = split[0].trim();
            title = split[1].trim();
        }

        return { title, artist };
    }

    // Process parsed Track after auto-match or user click
    function processLrcLibResult(trackObj) {
        stopKaraokeLoop();

        const synced = trackObj.syncedLyrics;
        const plain = trackObj.plainLyrics;

        titleSpan.textContent = `${trackObj.trackName} - ${trackObj.artistName}`;

        if (synced) {
            currentRawLyrics = synced;
            isKaraokeMode = true;
            karaokeBtn.style.display = 'flex';
            renderLyricsView();
        } else if (plain) {
            currentRawLyrics = plain;
            isKaraokeMode = false;
            karaokeBtn.style.display = 'none';
            renderLyricsView();
        } else {
            contentDiv.textContent = "Empty: The database has the track but no lyrics were uploaded.";
        }
    }


    // ======== PANEL RENDERING UI ========
    function renderManualRescueForm(autoText, showNoResultsWarning = false) {
        stopKaraokeLoop();
        karaokeBtn.style.display = 'none';
        contentDiv.textContent = '';

        if (showNoResultsWarning) {
            const errorMsg = document.createElement('div');
            errorMsg.textContent = "No exact matches found.";
            errorMsg.style.marginBottom = "5px";

            const hintMsg = document.createElement('div');
            hintMsg.textContent = "Try expanding or simplifying your search text:";
            hintMsg.style.fontSize = "13px";
            hintMsg.style.color = "#aaa";
            hintMsg.style.marginBottom = "15px";

            contentDiv.appendChild(errorMsg);
            contentDiv.appendChild(hintMsg);
        } else {
            const hintMsg = document.createElement('div');
            hintMsg.textContent = "Flexible Search. Enter track details:";
            hintMsg.style.fontSize = "14px";
            hintMsg.style.color = "#ddd";
            hintMsg.style.marginBottom = "12px";
            contentDiv.appendChild(hintMsg);
        }

        const searchComp = createSearchInputBar(autoText);
        contentDiv.appendChild(searchComp.element);
        setTimeout(() => searchComp.input.focus(), 50);
    }

    function renderSearchResults(results, lastQuery) {
        stopKaraokeLoop();
        karaokeBtn.style.display = 'none';
        contentDiv.textContent = '';

        const searchComp = createSearchInputBar(lastQuery);
        contentDiv.appendChild(searchComp.element);

        const resultsTitle = document.createElement('div');
        resultsTitle.textContent = `Search Results (${results.length}):`;
        resultsTitle.style.fontSize = "13px";
        resultsTitle.style.color = "#ccc";
        resultsTitle.style.opacity = "0.7";
        resultsTitle.style.marginBottom = "12px";
        contentDiv.appendChild(resultsTitle);

        const listDiv = document.createElement('div');
        listDiv.style.display = "flex";
        listDiv.style.flexDirection = "column";
        listDiv.style.gap = "8px";

        results.forEach(result => {
            const item = document.createElement('div');
            item.className = "yt-lyrics-result-item";

            const hasSynced = !!result.syncedLyrics;
            const iconStr = hasSynced ? '🎤 Synced (Karaoke)' : '📄 Plain Text';
            const colorStr = hasSynced ? 'rgba(255, 78, 78, 1)' : '#aaa';

            const trackDiv = document.createElement('div');
            trackDiv.style.fontWeight = "bold";
            trackDiv.style.fontSize = "15px";
            trackDiv.style.marginBottom = "4px";
            trackDiv.textContent = result.trackName;

            const detailDiv = document.createElement('div');
            detailDiv.style.fontSize = "13px";
            detailDiv.style.color = "#aaa";
            detailDiv.textContent = `${result.artistName} • Album: ${result.albumName || "Unknown"}`;

            const badgeDiv = document.createElement('div');
            badgeDiv.style.fontSize = "11px";
            badgeDiv.style.marginTop = "8px";
            badgeDiv.style.fontWeight = "bold";
            badgeDiv.style.color = colorStr;
            badgeDiv.textContent = iconStr;

            item.appendChild(trackDiv);
            item.appendChild(detailDiv);
            item.appendChild(badgeDiv);

            item.addEventListener('click', () => {
                processLrcLibResult(result);
            });

            listDiv.appendChild(item);
        });

        contentDiv.appendChild(listDiv);
    }

    function renderLyricsView() {
        contentDiv.textContent = '';
        currentParsedLyrics = [];
        lastActiveIndex = -1;

        if (isKaraokeMode) {
            lyricsPanel.classList.add('karaoke-mode');
            karaokeBtn.classList.add('active-karaoke');
        } else {
            lyricsPanel.classList.remove('karaoke-mode');
            karaokeBtn.classList.remove('active-karaoke');
        }

        const lines = currentRawLyrics.split('\n');
        const timeReg = /^\[(\d{1,3}):(\d{2})\.(\d{1,3})\](.*)/;

        lines.forEach(line => {
            let text = line;
            let time = -1;
            let timeStr = "";

            const match = line.match(timeReg);
            if (match) {
                timeStr = match[0].match(/^\[(.*?)\]/)[1];
                const msStr = match[3].padEnd(3, '0');
                time = parseInt(match[1]) * 60 + parseInt(match[2]) + (parseInt(msStr) / 1000);
                text = match[4].trim();
            } else {
                text = line.trim();
                if (!text) return;
            }

            const div = document.createElement('div');
            div.className = 'lyric-line';

            if (isKaraokeMode) {
                div.textContent = text || '♪♪♪';
            } else {
                if (time >= 0) {
                    const span = document.createElement('span');
                    span.className = 'highlighted-timestamp';
                    span.textContent = timeStr;
                    div.appendChild(span);
                    div.appendChild(document.createTextNode(" "));
                }
                div.appendChild(document.createTextNode(text));
            }

            currentParsedLyrics.push({ time, text, element: div });
            contentDiv.appendChild(div);
        });

        if (isKaraokeMode) startKaraokeLoop();
    }


    function stopKaraokeLoop() {
        if (karaokeIntervalId) {
            clearInterval(karaokeIntervalId);
            karaokeIntervalId = null;
        }
        lastActiveIndex = -1;
    }

    function startKaraokeLoop() {
        stopKaraokeLoop();
        if (!isKaraokeMode || currentParsedLyrics.length === 0) return;

        karaokeIntervalId = setInterval(() => {
            const player = document.getElementById('movie_player');
            if (!player || typeof player.getCurrentTime !== 'function') return;

            const currentTime = player.getCurrentTime();

            let activeIndex = -1;
            for (let i = 0; i < currentParsedLyrics.length; i++) {
                if (currentParsedLyrics[i].time !== -1 && currentParsedLyrics[i].time <= currentTime) {
                    activeIndex = i;
                } else if (currentParsedLyrics[i].time > currentTime) {
                    break;
                }
            }

            if (activeIndex !== -1 && activeIndex !== lastActiveIndex) {
                lastActiveIndex = activeIndex;

                currentParsedLyrics.forEach((line, idx) => {
                    if (idx === activeIndex) {
                        line.element.classList.add('active');
                        line.element.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    } else {
                        line.element.classList.remove('active');
                    }
                });
            }
        }, 180);
    }


    // ======== NETWORK/API LOGIC ========
    function fetchLyrics(manualQueryStr = null) {
        stopKaraokeLoop();
        karaokeBtn.style.display = 'none';
        contentDiv.style.color = '#ccc';

        let url = "";

        if (manualQueryStr) {
            titleSpan.textContent = "Search Active...";
            contentDiv.textContent = "Scanning remote database... ⏳";
            url = `https://lrclib.net/api/search?q=${encodeURIComponent(manualQueryStr)}`;
        } else {
            const track = extractTrackInfo();
            if (!track) {
                contentDiv.textContent = "Error: Could not detect the track title.";
                return;
            }
            titleSpan.textContent = `${track.title} - ${track.artist}`;
            contentDiv.textContent = "Looking for a match... ⏳";
            url = `https://lrclib.net/api/search?track_name=${encodeURIComponent(track.title)}&artist_name=${encodeURIComponent(track.artist)}`;
        }

        GM_xmlhttpRequest({
            method: "GET",
            url: url,
            onload: function (response) {
                contentDiv.style.color = '';
                if (response.status >= 200 && response.status < 300) {
                    try {
                        const results = JSON.parse(response.responseText);

                        if (Array.isArray(results) && results.length > 0) {
                            if (manualQueryStr) {
                                renderSearchResults(results, manualQueryStr);
                            } else {
                                processLrcLibResult(results[0]);
                            }
                        } else {
                            let autoTrack = null;
                            if (!manualQueryStr) {
                                const ext = extractTrackInfo();
                                if (ext) autoTrack = `${ext.title} ${ext.artist}`;
                            }
                            renderManualRescueForm(manualQueryStr ? manualQueryStr : autoTrack, !!manualQueryStr);
                        }
                    } catch (e) {
                        contentDiv.textContent = "❌ Error parsing JSON response.";
                    }
                } else {
                    contentDiv.textContent = `🚫 HTTP Error connecting to LRCLib. Status: [${response.status}]`;
                }
            },
            onerror: function (err) {
                contentDiv.textContent = "🌐 Network error or Cross-Origin blocked.";
            }
        });
    }

    // Escuchar el evento nativo de YouTube que indica que la información del video ya se cargó en el DOM
    document.addEventListener('yt-page-data-updated', function () {
        if (lyricsPanel && lyricsPanel.classList.contains('show')) {
            contentDiv.textContent = "Detecting new track... ⏳";
            fetchLyrics(null);
        }
    });

    // Ocultar el panel y detener el karaoke si el usuario navega fuera de un video (ej. al Home)
    window.addEventListener('yt-navigate-finish', function () {
        if (!location.pathname.startsWith('/watch')) {
            if (lyricsPanel && lyricsPanel.classList.contains('show')) {
                lyricsPanel.classList.remove('show');
                stopKaraokeLoop();
            }
        }
    });

})();
