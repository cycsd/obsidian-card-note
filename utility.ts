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

export type Break = Record<string, never>;
export type NameFile<T> = {
	create: () => T,
	update: (prev: T) => T,
	provide: (arg: T, unapprove: TFile | TFolder | undefined) => Promise<string | Break>,
}
export function isBreak(name: string | Break): name is Break {
	return typeof (name) !== "string";
}
export async function checkFileName<T>(plugin: CardNote, config: NameFile<T>) {
	let state = config.create();
	let folder;
	while (true) {
		const fileUncheck = await config.provide(state, folder);
		if (isBreak(fileUncheck)) {
			return fileUncheck;
		}
		const normalFilePath = normalizePath(fileUncheck);
		try {
			if (fileUncheck.length === 0) {
				throw new Error("File Name can not be empty");
			}
			if (fileUncheck === "" || await plugin.app.vault.adapter.exists(fileUncheck + MarkdownFileExtension)) {
				throw new Error("File Exist!");
			}
			plugin.app.vault.checkPath(normalFilePath)
			return normalFilePath;

		} catch (error) {
			state = config.update(state);
			continue;
		}

	}
}
export async function createDefaultFileName(plugin: CardNote, content: string) {
	const filePath = content.split(LineBreak, 1)[0].substring(0, 20);
	const createRandomFileName = () => {
		return checkFileName(plugin, {
			create: () => {
				return { name: "NewNote", count: 0 };
			},
			update: (prev) => ({ name: prev.name, count: prev.count + 1 }),
			provide: (arg) => Promise.resolve(arg.name + arg.count),
		})
	}
	return filePath.length !== 0
		? filePath
		: await createRandomFileName();
}
