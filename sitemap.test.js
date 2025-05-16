const { Builder, By, until } = require('selenium-webdriver');
const { expect } = require('chai');
const axios = require('axios');
const xml2js = require('xml2js');

const sitemapUrl = 'http://localhost:3000/sitemap.xml';

describe('Home Page UI Navigation Tests', function () {
	this.timeout(120000);
	let driver;

	const homepage = 'http://localhost:3000';

	before(async () => {
		driver = await new Builder().forBrowser('chrome').build();
		await driver.get(homepage);
	});

	after(async () => {
		await driver.quit();
	});

	it('should find and click all links on the homepage', async function () {
		const links = await driver.findElements(By.css('a[href]'));
		console.log(`Found ${links.length} <a> tags with hrefs.`);

		for (let i = 0; i < links.length; i++) {
			try {
				// Re-fetch all elements to avoid stale element references
				const linkElements = await driver.findElements(By.css('a[href]'));
				const link = linkElements[i];
				const href = await link.getAttribute('href');

				if (!href || href.startsWith('mailto:') || href.startsWith('tel:'))
					continue;

				console.log(`🧭 Navigating to: ${href}`);
				await driver.executeScript(
					"arguments[0].target='_self'; arguments[0].click();",
					link
				);

				await driver.wait(until.elementLocated(By.css('body')), 5000);
				const title = await driver.getTitle();
				expect(title).to.be.a('string').and.not.empty;

				console.log(`✅ Success: Navigated to ${href}`);
				await driver.get(homepage); // Go back to home
			} catch (error) {
				console.log(`❌ Failed to test link ${i + 1}:`, error.message);
			}
		}
	});

	it('should find and click all buttons on the homepage', async function () {
		const buttons = await driver.findElements(By.css('button'));
		console.log(`Found ${buttons.length} <button> elements.`);

		for (let i = 0; i < buttons.length; i++) {
			try {
				const buttonElements = await driver.findElements(By.css('button'));
				const button = buttonElements[i];
				const text = await button.getText();

				console.log(`🧭 Clicking button ${i + 1}: "${text}"`);
				await button.click();

				// Optional: wait for some change to happen
				await driver.sleep(1000); // You can use a better wait condition here

				console.log(`✅ Success: Button "${text}" clicked.`);
				await driver.get(homepage); // Reload home for next button
			} catch (error) {
				console.log(`❌ Failed to click button ${i + 1}:`, error.message);
			}
		}
	});
});

describe('Sitemap UI Tests', function () {
	this.timeout(60000);
	let driver;
	let urls = [];

	before(async () => {
		const response = await axios.get(sitemapUrl);

		const parser = new xml2js.Parser({
			explicitArray: false,
			ignoreAttrs: true,
			tagNameProcessors: [xml2js.processors.stripPrefix],
		});
		const result = await parser.parseStringPromise(response.data);

		const rawUrls = result.urlset.url;
		urls = Array.isArray(rawUrls) ? rawUrls.map((u) => u.loc) : [rawUrls.loc];

		// urls = urls.slice(0, 5); // Limit for speed
		driver = await new Builder().forBrowser('chrome').build();
	});

	after(async () => {
		await driver.quit();
	});

	// Dynamically define tests after 'before' runs
	it('should load and test each URL in the sitemap', async function () {
		for (const [index, url] of urls.entries()) {
			console.log(`Testing (${index + 1}): ${url}`);
			await driver.get(url);

			const header = await driver.wait(
				until.elementLocated(By.css('header')),
				5000
			);
			expect(header).to.not.be.null;

			const title = await driver.getTitle();
			expect(title).to.be.a('string').and.not.empty;

			console.log(`✅ Passed UI test for: ${url}`);
		}
	});
});
