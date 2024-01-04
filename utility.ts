import CardNote from "main";
import { TFile, TFolder, normalizePath } from "obsidian";

export function throttle<T extends unknown[], V>(
	cb: (...args: [...T]) => V,
	secondTimeout =0,
	resetTimer?: boolean
) {
	let timer = false;
	let result: V;
	return (...args: [...T]) => {
		if (!timer) {
			timer = true;
			setTimeout(() => {
				timer = false;
			}, 1000* secondTimeout);
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
	provide: (arg: T, unapprove: TFile | TFolder | undefined) => Promise<FileInfo | Break>,
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
	while (true) {
		const file = await config.provide(state, folder);
		if (isBreak(file)) {
			return file;
		}
		const filePathUncheck = createFullPath(file)
		const normalFilePath = normalizePath(filePathUncheck);
		try {
			if (filePathUncheck.length === 0) {
				throw new Error("File Name can not be empty");
			}
			if (filePathUncheck === "" || await plugin.app.vault.adapter.exists(normalFilePath)) {
				throw new Error("File Exist!");
			}
			plugin.app.vault.checkPath(normalFilePath)
			return file;

		} catch (error) {
			state = config.update(state);
			continue;
		}

	}
}
export async function createDefaultFileName(plugin: CardNote, content: string) {
	const folderPath = plugin.settings.defaultFolder;
	const fileName = content.split(LineBreak, 1)[0].substring(0, 20);
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
	return fileName.length !== 0
		? {
			folderPath,
			fileName,
			extension: MarkdownFileExtension,
		}
		: await createRandomFileName() as FileInfo;
}
