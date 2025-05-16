const { Builder, By, until } = require('selenium-webdriver');
const { expect } = require('chai');
const axios = require('axios');
const xml2js = require('xml2js');

const sitemapUrl = 'http://localhost:3000/sitemap.xml'; // Replace with your sitemap URL

describe('Sitemap UI Tests', function () {
	this.timeout(60000); // Increase timeout for slow-loading pages
	let driver;
	let urls = [];

	before(async () => {
		// Fetch and parse sitemap
		const response = await axios.get(sitemapUrl);
		const parser = new xml2js.Parser();
		const result = await parser.parseStringPromise(response.data);
		urls = result.urlset.url.map((u) => u.loc[0]).slice(0, 5); // Limit to 5 URLs

		driver = await new Builder().forBrowser('chrome').build();
	});

	after(async () => {
		if (driver) {
			await driver.quit();
		}
	});

	// Define tests after the `before` hook
	it('should test all URLs in sitemap', async function () {
		for (let i = 0; i < urls.length; i++) {
			const url = urls[i];
			console.log(`🔍 Testing ${url}`);
			await driver.get(url);

			// Header
			const header = await driver.wait(
				until.elementLocated(By.css('header')),
				7000
			);
			expect(header).to.not.be.null;

			// Footer
			// const footer = await driver.wait(
			// 	until.elementLocated(By.css('footer')),
			// 	5000
			// );
			// expect(footer).to.not.be.null;

			// Title
			// const title = await driver.getTitle();
			// expect(title).to.be.a('string').and.not.to.be.empty;

			console.log(`✅ Passed UI test for: ${url}`);
		}
	});
});
