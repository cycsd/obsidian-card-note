import CardNote from "main";
import { Changes, ChangeInfo, LinkCache } from "obsidian";



export const BLOCKIDREPLACE = () => /[^a-zA-Z\d-]+/g;
export const FILENAMEREPLACE = () => /[!"#$%&()*+,.:;<=>?@^`{|}~/[\]\\\r\n]/g;
export const HEADINGREPLACE = () => /([:#|^\\\r\n]|%%|\[\[|]])/g

export type RequiredProperties<T, P extends keyof T> = Omit<T, P> & Required<Pick<T, P>>


export function throttle<T extends unknown[], V>(
	cb: (...args: [...T]) => V,
	secondTimeout = 0,
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

export async function ReCheck<T, R = T, R2 = R>(config: CheckConfig<T, R, R2>): Promise<R2 | Break> {
	let errorMessage: string | undefined;
	let args = config.create();
	let result: Awaited<R> | undefined;
	// eslint-disable-next-line no-constant-condition
	while (true) {
		try {
			result = await config.provide(args, result, errorMessage);
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

export const HEADING = () => /^(?<header>#{1,6}\s)(?<title>.*)/;
export type Heading = {
	type: 'heading'
	headingSymbol: string,
	title: string,
}

export const LIST = /^([ \t]*)(?<listSymbol>[*+-]|\d+[.)])( {1,4}(?! )| |\t|$|(?=\n))(?<item>[^\n]*)/
export const TASK = /^([ \t]*)(?<task>\[.\])?( {1,4}(?! )| |\t|$|(?=\n))(?<item>[^\n]*)/
export type ListItem = {
	type: 'list',
	listSymbol: string,
	item: string,
}
export type TaskItem = Omit<ListItem, 'type'> & {
	type: 'task',
	task: string
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
export function listItemParser(text: string): ListItem | TaskItem | undefined {
	const match = LIST.exec(text);
	if (match) {
		const groups = match.groups,
			listSymbol = groups?.listSymbol,
			item = groups?.item;
		if (item) {
			const taskMatch = TASK.exec(item),
				taskGroups = taskMatch?.groups,
				task = taskGroups?.task,
				taskItem = taskGroups?.item;
			return task ? {
				type: 'task',
				listSymbol: listSymbol!,
				task: task,
				item: taskItem ?? '',
			} : {
				type: 'list',
				listSymbol: listSymbol!,
				item,
			}
		}
		else {
			return {
				type: 'list',
				listSymbol: listSymbol!,
				item: '',
			}
		}
	}
}
export function markdownParser(content: string): MarkdownSyntax {
	const headingMatch = HEADING().exec(content);
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
export type LinkInfo = {
	path: string,
	subpath: string,
	link: LinkCache,
}


export type LinkText = Partial<{
	left: string,
	right: string,
	path: string,
	display: string,
	displayText: string,
}> & {
	text: string
}

const WIKILINK = () => new RegExp(/^(?<left>!?\[\[)(?<link>.*?)(?<display>\|(?<displayText>.*))?(?<right>]])$/);
const MARKDOWNLINK = () => /^(?<left>!?\[)(?<displayText>.*?)(?<mid>]\(\s*)(?<link>[^ ]+)(?<right>(?:\s+.*?)?\))$/;
export function UpdateLinkText(sourcePath: string, linkInfo: LinkInfo, newPath: (link: LinkInfo) => string): ChangeInfo {
	const linkMatch: { regex: RegExp, newText: (match: RegExpExecArray, path: string) => string }[] = [
		{
			regex: WIKILINK(),
			newText: (match, path) => {
				const display = match.groups?.display ?? "";
				return `${match.groups?.left}${path}${display}${match.groups?.right}`
			}
		},
		{
			regex: MARKDOWNLINK(),
			newText(match, path) {
				const display = match.groups?.displayText ?? "";
				return `${match.groups?.left}${display}${match.groups?.mid}${path}${match.groups?.right}`
			},
		}];
	for (const r of linkMatch) {
		const match = r.regex.exec(linkInfo.link.original);
		if (match) {
			const np = newPath(linkInfo);
			const newText = r.newText(match, np);
			return {
				change: newText,
				reference: linkInfo.link,
				sourcePath,
			}
		}
	}
	return {
		change: `[[${newPath(linkInfo)}]]`,
		reference: linkInfo.link,
		sourcePath,
	}

}
export function LinkToChanges(linkMap: Map<string, LinkInfo[]>, newPath: (link: LinkInfo) => string): Changes {
	const change: Changes = {
		data: {},
		keys: () => Object.keys(change.data),
		add: (key, value) => {
			const values = change.data[key];
			if (values && !values.contains(value)) {
				if (!values.contains(value)) {
					values.push(value);
				}
			}
			else {
				change.data[key] = [value];
			}
		},
		remove: (key, value) => {
			const values = change.data[key];
			values?.remove(value);
		},
		removeKey: (key) => { delete change.data[key] },
		get: (key) => change.data[key],
		clear: (key) => change.removeKey(key),
		clearAll: () => { change.data = {} },
		contains: (key, value) => change.data[key]?.contains(value),
		count: () => {
			let c = 0;
			for (const key in change.data) {
				const len = change.data[key].length;
				c += len;
			}
			return c
		},
	}
	linkMap.forEach((value, key) => {
		const changeInfo = value.map(text => UpdateLinkText(key, text, newPath));
		change.data[key] = changeInfo
	})

	return change
}
