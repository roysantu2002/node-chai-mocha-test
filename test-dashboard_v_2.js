require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { Builder, By, until } = require('selenium-webdriver');
const chrome = require('selenium-webdriver/chrome');
const assert = require('assert');

describe('Login Flow with Auth0 using .env credentials', function () {
	this.timeout(60000);

	let driver;
	const baseUrl = process.env.BASE_URL;
	const username = process.env.AUTH0_USERNAME;
	const password = process.env.AUTH0_PASSWORD;

	const linksTextFile = path.join(__dirname, 'all_links.txt');
	const sitemapFile = path.join(__dirname, 'sitemap.xml');
	let collectedLinks = new Set();

	const collectLinks = async () => {
		const anchorElements = await driver.findElements(By.css('a[href]'));
		for (const anchor of anchorElements) {
			const href = await anchor.getAttribute('href');
			if (href && href.startsWith('http')) {
				collectedLinks.add(href);
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

			// Wait for home page to load
			await driver.wait(until.urlContains('/'), 10000);

			// Collect links on the home page
			await collectLinks();
			console.log(`✅ Collected links from homepage.`);
		} catch (err) {
			console.error('❌ Error in login flow:', err.message);
			throw err;
		}
	});

	after(async function () {
		if (driver) await driver.quit();
	});

	it('should navigate to dashboard, collect links, and export sitemap', async function () {
		try {
			const dashboardLink = await driver.wait(
				until.elementLocated(By.css('a[href="/dashboard"]')),
				10000
			);
			await dashboardLink.click();

			await driver.wait(until.urlContains('/dashboard'), 10000);
			const currentUrl = await driver.getCurrentUrl();
			assert(
				currentUrl.includes('/dashboard'),
				'Expected to land on dashboard'
			);

			// Collect links from dashboard
			await collectLinks();
			console.log(`✅ Collected links from dashboard.`);

			// Write all links to text file
			fs.writeFileSync(
				linksTextFile,
				Array.from(collectedLinks).join('\n'),
				'utf8'
			);
			console.log(`✅ Saved ${collectedLinks.size} links to ${linksTextFile}`);

			// Generate sitemap.xml
			const sitemapXml =
				`<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n` +
				Array.from(collectedLinks)
					.map((url) => `  <url><loc>${url}</loc></url>`)
					.join('\n') +
				`\n</urlset>`;
			fs.writeFileSync(sitemapFile, sitemapXml, 'utf8');
			console.log(`✅ Generated sitemap at ${sitemapFile}`);
		} catch (err) {
			console.error(
				'❌ Error during dashboard flow or link collection:',
				err.message
			);
			throw err;
		}
	});
});
