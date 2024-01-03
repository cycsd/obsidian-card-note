# CardNote
此工具藉由滑鼠拖拉施放，將創建筆記及在圖像化工具中插入筆記的功能整合為一，協助你更快速的在[Obsidian Canvas](https://obsidian.md/canvas) 及 [obsidian-excalidraw-plugin](https://github.com/zsviczian/obsidian-excalidraw-plugin)上建立圖像化的筆記

This tool integrates creating notes and inserting notes into visualized tools by "dragging and dropping". It assists you in quickly building visualized notes on [Obsidian Canvas](https://obsidian.md/canvas)and the [obsidian-excalidraw-plugin](https://github.com/zsviczian/obsidian-excalidraw-plugin).


> # 如果你對下方步驟熟悉且還不會厭煩的話，你不需要使用此插件
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
excalidraw



# Obsidian Sample Plugin

This is a sample plugin for Obsidian (https://obsidian.md).

This project uses Typescript to provide type checking and documentation.
The repo depends on the latest plugin API (obsidian.d.ts) in Typescript Definition format, which contains TSDoc comments describing what it does.

**Note:** The Obsidian API is still in early alpha and is subject to change at any time!

This sample plugin demonstrates some of the basic functionality the plugin API can do.
- Adds a ribbon icon, which shows a Notice when clicked.
- Adds a command "Open Sample Modal" which opens a Modal.
- Adds a plugin setting tab to the settings page.
- Registers a global click event and output 'click' to the console.
- Registers a global interval which logs 'setInterval' to the console.

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

## How to use

- Clone this repo.
- Make sure your NodeJS is at least v16 (`node --version`).
- `npm i` or `yarn` to install dependencies.
- `npm run dev` to start compilation in watch mode.

## Manually installing the plugin

- Copy over `main.js`, `styles.css`, `manifest.json` to your vault `VaultFolder/.obsidian/plugins/your-plugin-id/`.

## Improve code quality with eslint (optional)
- [ESLint](https://eslint.org/) is a tool that analyzes your code to quickly find problems. You can run ESLint against your plugin to find common bugs and ways to improve your code. 
- To use eslint with this project, make sure to install eslint from terminal:
  - `npm install -g eslint`
- To use eslint to analyze this project use this command:
  - `eslint main.ts`
  - eslint will then create a report with suggestions for code improvement by file and line number.
- If your source code is in a folder, such as `src`, you can use eslint with this command to analyze all files in that folder:
  - `eslint .\src\`

## Funding URL

You can include funding URLs where people who use your plugin can financially support it.

The simple way is to set the `fundingUrl` field to your link in your `manifest.json` file:

```json
{
    "fundingUrl": "https://buymeacoffee.com"
}
```

If you have multiple URLs, you can also do:

```json
{
    "fundingUrl": {
        "Buy Me a Coffee": "https://buymeacoffee.com",
        "GitHub Sponsor": "https://github.com/sponsors",
        "Patreon": "https://www.patreon.com/"
    }
}
```

## API Documentation

See https://github.com/obsidianmd/obsidian-api
