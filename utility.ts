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
export type CheckConfig<T, R = T, R2 = R> = {
	create: () => T,
	update: (prev: T) => T,
	provide: (arg: T, unapprove: R | undefined, errorMessage?: string) => Promise<R | Break>,
	check: (value: R) => Promise<R2 | Error>,
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
export async function checkFileName1(plugin: CardNote, file: FileInfo) {
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
}
export async function ReCheck<T, R = T, R2 = R>(config: CheckConfig<T, R, R2>): Promise<R2 | Break> {
	// let state = config.create();
	// let folder;
	let errorMessage: string | undefined;
	let args = config.create();
	let result: Awaited<R> | undefined;
	// eslint-disable-next-line no-constant-condition
	while (true) {
		try {
			result = await config.provide(args, result, errorMessage);
			// eslint-disable-next-line @typescript-eslint/no-non-null-assertion
			if (isBreak(result)) {
				return result;
			}
			// eslint-disable-next-line @typescript-eslint/no-non-null-assertion
			const validResult = await config.check(result!);
			if (validResult instanceof Error) {
				throw validResult;
			}
			else {
				return validResult;
			}
// const file = await config.provide(state, folder, errorMessage);
// if (isBreak(file)) {
// 	return file;
// }
// const e = config.check(file);
// if (e instanceof Error)
// if (file.fileName.length === 0) {
// 	throw new Error("File Name can not be empty!");
// }
// if (file.fileName.endsWith(" ")) {
// 	throw new Error("File Name can not end with white space!");
// }
// const filePathUncheck = createFullPath(file)
// const normalFilePath = normalizePath(filePathUncheck);
// plugin.app.vault.checkPath(normalFilePath)
// if (await plugin.app.vault.adapter.exists(normalFilePath)) {
// 	throw new Error("File Exist!");
// }
// return file;

		} catch (error) {
			args = config.update(args);
			errorMessage = error.message;
			continue;
		}

	}
}
export async function createDefaultFileName(plugin: CardNote, content: string) {
	const folderPath = plugin.settings.defaultFolder;
	const createRandomFileName = () => {
		return ReCheck({
			create: () => {
				return { name: "NewNote", count: 0 };
			},
			update: (prev) => ({ name: prev.name, count: prev.count + 1 }),
			provide: (arg) => Promise.resolve({
				folderPath,
				fileName: `${arg.name}${arg.count}`,
				extension: MarkdownFileExtension,
			}),
			check: plugin.checkFileName
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
export const LIST = /(?<list>[-*]\s|(?:\d.)+\s)(?<text>.*)/
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
