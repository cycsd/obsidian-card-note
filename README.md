<h1 align="center">
	CardNote
</h1>

<p align="center">
  <a href="https://github.com/cycsd/obsidian-card-note/stargazers"><img src="https://img.shields.io/github/stars/cycsd/obsidian-card-note?colorA=363a4f&colorB=e0ac00&style=for-the-badge" alt="GitHub star count"></a>
  <a href="https://github.com/cycsd/obsidian-card-note/issues"><img src="https://img.shields.io/github/issues/cycsd/obsidian-card-note?colorA=363a4f&colorB=e93147&style=for-the-badge" alt="Open issues on GitHub"></a>
  <a href="https://github.com/cycsd/obsidian-card-note/contributors"><img src="https://img.shields.io/github/contributors/cycsd/obsidian-card-note?colorA=363a4f&colorB=08b94e&style=for-the-badge" alt="List of contributors"></a>
  <br/>
	<a href="https://obsidian.md/plugins?id=card-note"><img src="https://img.shields.io/badge/dynamic/json?logo=obsidian&color=%23483699&style=for-the-badge&label=downloads&query=%24%5B%22card-note%22%5D.downloads&url=https%3A%2F%2Fraw.githubusercontent.com%2Fobsidianmd%2Fobsidian-releases%2Fmaster%2Fcommunity-plugin-stats.json" alt="Obsidian download count"/></a>
	<a href="./LICENSE"><img src="https://img.shields.io/static/v1.svg?style=for-the-badge&label=License&message=MIT&colorA=363a4f&colorB=b7bdf8" alt="MIT license"/></a>
  <br/><br/>
  <strong>⚡ Turn thoughts into connected visual notes.</strong>
</p>

CardNote helps you extract ideas from the editor and turn them into linked notes on [Obsidian Canvas](https://obsidian.md/canvas) or [Excalidraw](https://github.com/zsviczian/obsidian-excalidraw-plugin).

Drag a block, drop it onto your board, and keep thinking without breaking your flow.

![Drag a thought from the editor to Canvas](src/images/cardnote.gif)

## Why CardNote?

- **Capture ideas without breaking your flow**: Drag a heading, paragraph, list, or selected text directly from the editor.
- **Build visual notes faster**: Create a new note from the content you want to keep and place it on Canvas or Excalidraw.
- **Keep context connected**: Automatically draw a link between the source card and the extracted note.
- **Explore notes side by side**: Open the selected Canvas file node in a split view with Auto Preview.
- **Browse your vault visually**: Search notes with the built-in Cards View.

## Get Started

1. Install CardNote from Obsidian Community Plugins.
2. Open a note in the editor and find the drag symbol beside a block.
3. Drag the block onto an Obsidian Canvas or Excalidraw.
4. CardNote creates a linked note and connects it to the source.



## Features

### Obsidian Canvas

Create notes from editor content, place them on Canvas, and automatically connect them with configurable arrows and labels.

![Drag a block to Obsidian Canvas](src/images/CardNoteCanvas.gif)

### Excalidraw

Use the same drag-and-drop workflow while sketching and organizing ideas in Excalidraw.

![Drag a block to Excalidraw](src/images/CardNoteExcalidraw.gif)

### Cards View

Search and browse your notes in a visual card layout.

![Browse notes in Cards View](src/images/CardNoteSearchView.gif)

## Commands

| Command | Description |
| --- | --- |
| Enable/Disable Auto Link | Automatically connect the extracted note to the source card on Canvas. |
| Arrow to * | Choose an arrow pointing from the source, to the target, in both directions, or no arrow. |
| Set Default Label| Add a label to automatically created links. |
| Show/Hide Drag Symbol | Show or hide the editor drag handle. |
| Enable/Disable Auto Preview | Open the selected Canvas file node in a split view. |

## Requirements

- Obsidian 1.13.7 or later
- Obsidian Canvas for Canvas workflows
- The Excalidraw community plugin for Excalidraw workflows

## Support CardNote

[![Support CardNote on Ko-fi](https://ko-fi.com/img/githubbutton_sm.svg)](https://ko-fi.com/B0B37J4BG)

## License

[MIT](./LICENSE)