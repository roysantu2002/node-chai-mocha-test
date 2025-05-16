require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { Builder, By, until } = require('selenium-webdriver');
const chrome = require('selenium-webdriver/chrome');
const assert = require('assert');
const url = require('url');

describe('Full Site Link Crawler after Login', function () {
	this.timeout(5 * 60 * 1000); // 5 minutes max

	let driver;
	const baseUrl = process.env.BASE_URL;
	const baseDomain = new URL(baseUrl).origin;
	const username = process.env.AUTH0_USERNAME;
	const password = process.env.AUTH0_PASSWORD;

	const linksTextFile = path.join(__dirname, 'all_links.txt');
	const sitemapFile = path.join(__dirname, 'sitemap.xml');

	let visitedLinks = new Set();
	let linkQueue = [];

	const collectLinksFromCurrentPage = async () => {
		const anchors = await driver.findElements(By.css('a[href]'));
		for (const anchor of anchors) {
			const href = await anchor.getAttribute('href');
			if (href && href.startsWith(baseDomain) && !visitedLinks.has(href)) {
				linkQueue.push(href);
			}
		}
	};

	before(async function () {
		driver = await new Builder().forBrowser('chrome').build();

		try {
			await driver.get(baseUrl);

			const startHereButton = await driver.wait(
				until.elementLocated(
					By.xpath(
						"//span[contains(text(),'Start ') or contains(text(),'Start here')]"
					)
				),
				10000
			);
			await startHereButton.click();

			const emailInput = await driver.wait(
				until.elementLocated(
					By.css('input[type="email"], input[name="username"]')
				),
				10000
			);
			await emailInput.sendKeys(username);

			const continueBtn = await driver.findElements(
				By.css('button[type="submit"]')
			);
			if (continueBtn.length) {
				await continueBtn[0].click();
			}

			const passwordInput = await driver.wait(
				until.elementLocated(By.css('input[type="password"]')),
				10000
			);
			await passwordInput.sendKeys(password);

			const loginBtn = await driver.wait(
				until.elementLocated(By.css('button[type="submit"]')),
				10000
			);
			await loginBtn.click();

			try {
				const acceptButton = await driver.wait(
					until.elementLocated(
						By.xpath(
							"//button[contains(text(), 'Accept') or contains(text(), 'Allow')]"
						)
					),
					5000
				);
				if (acceptButton) await acceptButton.click();
			} catch {
				console.log('No Accept button found, continuing.');
			}

			await driver.wait(until.urlContains('/'), 10000);

			// Initial link collection from homepage
			await collectLinksFromCurrentPage();
		} catch (err) {
			console.error('❌ Login error:', err.message);
			throw err;
		}
	});

	after(async function () {
		if (driver) await driver.quit();
	});

	it('should crawl all internal links and build a sitemap', async function () {
		while (linkQueue.length > 0) {
			const currentLink = linkQueue.shift();

			if (visitedLinks.has(currentLink)) continue;
			visitedLinks.add(currentLink);

			try {
				console.log(`🌐 Visiting: ${currentLink}`);
				await driver.get(currentLink);
				await driver.sleep(1000); // small delay to allow content to load
				await collectLinksFromCurrentPage();
			} catch (err) {
				console.warn(`⚠️ Failed to visit ${currentLink}: ${err.message}`);
			}
		}

		// Write to text file
		fs.writeFileSync(
			linksTextFile,
			Array.from(visitedLinks).join('\n'),
			'utf8'
		);
		console.log(
			`✅ Saved ${visitedLinks.size} unique links to ${linksTextFile}`
		);

		// Generate sitemap
		const sitemapXml =
			`<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n` +
			Array.from(visitedLinks)
				.map((link) => `  <url><loc>${link}</loc></url>`)
				.join('\n') +
			`\n</urlset>`;
		fs.writeFileSync(sitemapFile, sitemapXml, 'utf8');
		console.log(`✅ Generated sitemap at ${sitemapFile}`);
	});
});
