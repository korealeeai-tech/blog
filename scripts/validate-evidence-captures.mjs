import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const contentDir = path.join(root, 'src/content/blog');
const externalQuotePattern = /^>\s+\[[^\]]+\]\((https?:\/\/[^)]+)\):/;
const externalMarkdownLinkPattern = /\[[^\]]+\]\((https?:\/\/[^)]+)\)/g;
const localDomains = ['korealeeai-tech.github.io'];
const screenshotPathPattern = /<img\s+[^>]*src=["']([^"']*\/blog-images\/official-docs\/[^"']+)["'][^>]*>/;
const exceptionPattern = /<!--\s*evidence-screenshot-exception:\s*(.{12,})\s*-->/;

function listMarkdownFiles(dir) {
	const entries = fs.readdirSync(dir, { withFileTypes: true });
	return entries.flatMap((entry) => {
		const fullPath = path.join(dir, entry.name);
		if (entry.isDirectory()) return listMarkdownFiles(fullPath);
		if (/\.(md|mdx)$/.test(entry.name)) return [fullPath];
		return [];
	});
}

function isExternalSource(url) {
	try {
		const host = new URL(url).hostname;
		return !localDomains.some((domain) => host === domain || host.endsWith(`.${domain}`));
	} catch {
		return false;
	}
}

function resolvePublicImage(src) {
	const publicPath = src.replace(/^\/blog\//, '');
	return path.join(root, 'public', publicPath);
}

function normalizeUrl(rawUrl) {
	const url = new URL(rawUrl);
	url.hash = '';
	url.search = '';
	url.pathname = url.pathname.replace(/\/$/, '');
	return url.toString();
}

function parseHeroImage(text) {
	const match = text.match(/^heroImage:\s*["']([^"']+)["']/m);
	return match?.[1];
}

function resolveContentImage(filePath, src) {
	return path.resolve(path.dirname(filePath), src);
}

function getCheckSection(text) {
	const match = text.match(/^## 확인 기준\s*$/m);
	if (!match) return '';

	const start = match.index + match[0].length;
	const rest = text.slice(start);
	const nextHeading = rest.search(/\n##\s+/);
	return nextHeading >= 0 ? rest.slice(0, nextHeading) : rest;
}

function validateFile(filePath) {
	const relPath = path.relative(root, filePath);
	const text = fs.readFileSync(filePath, 'utf8');
	const lines = text.split(/\r?\n/);
	const failures = [];
	const heroImage = parseHeroImage(text);
	const quotedExternalUrls = new Set();

	if (!heroImage) {
		failures.push(`${relPath}: missing required heroImage frontmatter.`);
	} else {
		const heroPath = resolveContentImage(filePath, heroImage);
		if (!fs.existsSync(heroPath)) {
			failures.push(`${relPath}: heroImage does not exist: ${heroImage}`);
		}
	}

	lines.forEach((line, index) => {
		const match = line.match(externalQuotePattern);
		if (!match || !isExternalSource(match[1])) return;
		quotedExternalUrls.add(normalizeUrl(match[1]));

		const evidenceWindow = lines.slice(index + 1, index + 16).join('\n');
		const exception = evidenceWindow.match(exceptionPattern);
		const screenshot = evidenceWindow.match(screenshotPathPattern);

		if (!screenshot && !exception) {
			failures.push(
				`${relPath}:${index + 1} external source quote must be followed by an official-docs screenshot figure or an explicit evidence-screenshot-exception comment.`
			);
			return;
		}

		if (screenshot) {
			const imagePath = resolvePublicImage(screenshot[1]);
			if (!fs.existsSync(imagePath)) {
				failures.push(`${relPath}:${index + 1} evidence screenshot does not exist: ${screenshot[1]}`);
			}
			if (!/확인일|캡처일|재확인/.test(evidenceWindow)) {
				failures.push(`${relPath}:${index + 1} evidence screenshot caption must include a checked/captured date.`);
			}
			if (!/(뜻은 아니다|증거는 아니다|증명하지|증명하는|보여주지만|보장은 아니다|보장하지)/.test(evidenceWindow)) {
				failures.push(`${relPath}:${index + 1} evidence screenshot caption must state what the capture does not prove.`);
			}
		}
	});

	const checkSection = getCheckSection(text);
	for (const match of checkSection.matchAll(externalMarkdownLinkPattern)) {
		const url = match[1];
		if (!isExternalSource(url)) continue;
		const normalizedUrl = normalizeUrl(url);
		if (!quotedExternalUrls.has(normalizedUrl) && !exceptionPattern.test(checkSection)) {
			failures.push(
				`${relPath}: 확인 기준 external link must also appear as a quoted source with adjacent evidence screenshot or explicit evidence-screenshot-exception: ${url}`
			);
		}
	}

	if (/문서 캡처 대신/.test(text) && !exceptionPattern.test(text)) {
		failures.push(`${relPath}: contains "문서 캡처 대신" without an explicit evidence-screenshot-exception comment.`);
	}

	return failures;
}

const failures = listMarkdownFiles(contentDir).flatMap(validateFile);

if (failures.length > 0) {
	console.error('Evidence screenshot validation failed:');
	for (const failure of failures) console.error(`- ${failure}`);
	process.exit(1);
}

console.log('Evidence screenshot validation passed.');
