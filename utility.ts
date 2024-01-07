import CardNote from "main";
import { TFile, TFolder, normalizePath } from "obsidian";

export function throttle<T extends unknown[], V>(
	cb: (...args: [...T]) => V,
	secondTimeout = 0,
	resetTimer?: boolean
) {
	let timer = false;
	let result: V;
	return (...args: [...T]) => {
		if (!timer) {
			timer = true;
			setTimeout(() => {
				timer = false;
			}, 1000 * secondTimeout);
			result = cb(...args);
		}
		return result;
	};
}

export const LineBreak = "\n";
export const MarkdownFileExtension = ".md";

export type Break = undefined;
export type FileInfo = {
	fileName: string,
	folderPath: string,
	extension: string,
}
export type NameFile<T> = {
	create: () => T,
	update: (prev: T) => T,
	provide: (arg: T, unapprove: TFile | TFolder | undefined, errorMessage?: string) => Promise<FileInfo | Break>,
}
export function isBreak(name: any): name is Break {
	return name === undefined;
}
export function createFullPath(file: FileInfo) {
	const fileName = `${file.fileName}${file.extension}`;
	return file.folderPath.length === 0
		? fileName
		: `${file.folderPath}/${fileName}`;
}
export async function checkFileName<T>(plugin: CardNote, config: NameFile<T>): Promise<FileInfo | Break> {
	let state = config.create();
	let folder;
	let errorMessage: string | undefined;
	while (true) {
		try {
			const file = await config.provide(state, folder, errorMessage);
			if (isBreak(file)) {
				return file;
			}
			if (file.fileName.length === 0) {
				throw new Error("File Name can not be empty!");
			}
			if (file.fileName.endsWith(" ")) {
				throw new Error("File Name can not end with white space!");
			}
			const filePathUncheck = createFullPath(file)
			const normalFilePath = normalizePath(filePathUncheck);
			plugin.app.vault.checkPath(normalFilePath)
			if (await plugin.app.vault.adapter.exists(normalFilePath)) {
				throw new Error("File Exist!");
			}
			return file;

		} catch (error) {
			state = config.update(state);
			errorMessage = error.message;
			continue;
		}

	}
}
export async function createDefaultFileName(plugin: CardNote, content: string) {
	const folderPath = plugin.settings.defaultFolder;
	const createRandomFileName = () => {
		return checkFileName(plugin, {
			create: () => {
				return { name: "NewNote", count: 0 };
			},
			update: (prev) => ({ name: prev.name, count: prev.count + 1 }),
			provide: (arg) => Promise.resolve({
				folderPath,
				fileName: `${arg.name}${arg.count}`,
				extension: MarkdownFileExtension,
			}),
		})
	}
	return await createRandomFileName() as FileInfo;
}

export const HEADING = /^(?<header>#{1,6}\s)(?<title>.*)/;
export type Heading = {
	type: 'heading'
	headingSymbol: string,
	title: string,
}
export const LIST = /^(?<list>[-*]\s|(?:\d.)+\s)(?<text>.*)/
export type List = {
	type: 'list',
	listSymbol: string,
	title: string,
}
export type Text = {
	type: 'text'
	title: string
}
export type TextWithSymbol = {
	type: 'heading' | 'list',
	symbol: string,
	title: string,
}
export type MarkdownSyntax = TextWithSymbol | Text;
export function markdownParser(content: string): MarkdownSyntax {
	const headingMatch = HEADING.exec(content);
	if (headingMatch?.groups) {
		return {
			type: 'heading',
			symbol: headingMatch.groups.header.trim(),
			title: headingMatch.groups.title,
		}
	}
	const listMatch = LIST.exec(content);
	if (listMatch?.groups) {
		return {
			type: 'list',
			symbol: listMatch.groups.list.trim(),
			title: listMatch.groups.text,
		}
	}
	return { type: 'text', title: content }
}
