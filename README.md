# CardNote
此工具將創建筆記及在圖像化工具中插入筆記的功能整合為一，
藉由滑鼠拖拉施放協助你更快速的在[Obsidian Canvas](https://obsidian.md/canvas) 及 [obsidian-excalidraw-plugin](https://github.com/zsviczian/obsidian-excalidraw-plugin)上建立圖像化的筆記

This tool integrates creating notes and inserting notes into visualized tools. It assists you in quickly building visualized notes on [Obsidian Canvas](https://obsidian.md/canvas)and the [obsidian-excalidraw-plugin](https://github.com/zsviczian/obsidian-excalidraw-plugin) by "Drag and Drop".


> # 如果你對下方步驟熟悉且不會厭煩的話，你不需要使用此插件
> 1. 選擇想要整理的段落，並在編輯器上右鍵開啟工具菜單
> 2. 點選擷取目前內容至其他檔案
> 3. 在 [Obsidian Canvas](https://obsidian.md/canvas) 或 [obsidian-excalidraw-plugin](https://github.com/zsviczian/obsidian-excalidraw-plugin)點選右鍵開啟工具菜單
> 4. 點選插入檔案，將剛剛創建的檔案插入至畫布中

> # You don't need to use this plugin
> ## if you are comforable with flowing steps:
> 1. Right-click to open the tools menu in the editor
> 2. Use Obsidian Note Composer to extract your thoughts into a new note
> 3. Right-click to open the tools in [Obsidian Canvas](https://obsidian.md/canvas) or [obsidian-excalidraw-plugin](https://github.com/zsviczian/obsidian-excalidraw-plugin)
> 4. insert markdown file to canvas.


# Example
## Obsidian Canvas
![ExampleCanvas](src/images/CardNoteCanvas.gif)
## Excalidraw
![ExampleExcalidraw](src/images/CardNoteExcalidraw.gif)

## First time developing plugins?

Quick starting guide for new plugin devs:

- Check if [someone already developed a plugin for what you want](https://obsidian.md/plugins)! There might be an existing plugin similar enough that you can partner up with.
- Make a copy of this repo as a template with the "Use this template" button (login to GitHub if you don't see it).
- Clone your repo to a local development folder. For convenience, you can place this folder in your `.obsidian/plugins/your-plugin-name` folder.
- Install NodeJS, then run `npm i` in the command line under your repo folder.
- Run `npm run dev` to compile your plugin from `main.ts` to `main.js`.
- Make changes to `main.ts` (or create new `.ts` files). Those changes should be automatically compiled into `main.js`.
- Reload Obsidian to load the new version of your plugin.
- Enable plugin in settings window.
- For updates to the Obsidian API run `npm update` in the command line under your repo folder.

## Releasing new releases

- Update your `manifest.json` with your new version number, such as `1.0.1`, and the minimum Obsidian version required for your latest release.
- Update your `versions.json` file with `"new-plugin-version": "minimum-obsidian-version"` so older versions of Obsidian can download an older version of your plugin that's compatible.
- Create new GitHub release using your new version number as the "Tag version". Use the exact version number, don't include a prefix `v`. See here for an example: https://github.com/obsidianmd/obsidian-sample-plugin/releases
- Upload the files `manifest.json`, `main.js`, `styles.css` as binary attachments. Note: The manifest.json file must be in two places, first the root path of your repository and also in the release.
- Publish the release.

> You can simplify the version bump process by running `npm version patch`, `npm version minor` or `npm version major` after updating `minAppVersion` manually in `manifest.json`.
> The command will bump version in `manifest.json` and `package.json`, and add the entry for the new version to `versions.json`

## Adding your plugin to the community plugin list

- Check https://github.com/obsidianmd/obsidian-releases/blob/master/plugin-review.md
- Publish an initial version.
- Make sure you have a `README.md` file in the root of your repo.
- Make a pull request at https://github.com/obsidianmd/obsidian-releases to add your plugin.

