# YT-Lyrics

YT-Lyrics is a Tampermonkey script that seamlessly enhances your YouTube experience by fetching and displaying song lyrics directly on the page. It connects to the LRCLib API to provide both plain text and synchronized karaoke-style lyrics!

## Features

- **Automated Lyrics Fetching**: Automatically extracts track info from the YouTube page and fetches the matching lyrics.
- **Karaoke Mode**: Synchronizes lyrics with the current video playback timestamp when time-synced lyrics are available.
- **Search Explorer**: If automatic matching fails, you can manually search for songs or artists and pick the correct track from a list of results.

## Installation

1. Make sure you have a user script manager installed in your browser, such as [Tampermonkey](https://www.tampermonkey.net/) or [Violentmonkey](https://violentmonkey.github.io/).
2. Click here to install the script: [YT-Lyrics.user.js](https://github.com/argorar/YT-Lyrics/raw/master/YT-Lyrics.user.js)
   *(If you are copying the code manually, add it as a new script in your Tampermonkey dashboard).*

## How to Use

1. Navigate to any music video on YouTube.
2. Under the video player, near the channel info or action buttons, click the new **Lyrics** button (with a music note icon).
3. The lyrics panel will open and immediately search for a match based on the video title and uploader.
4. If synchronized lyrics are found, a **Karaoke** button will appear at the top. Click it to toggle auto-scrolling synced lyrics that follow the song in real time!
5. If the wrong song is pulled up or no song is matched, click the **Search** icon at the top of the lyrics panel to open the manual search tool.