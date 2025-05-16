require('dotenv').config();
const { Builder, By, until } = require('selenium-webdriver');
const chrome = require('selenium-webdriver/chrome');
const assert = require('assert');

describe('Login Flow with Auth0 using .env credentials', function () {
	this.timeout(40000);

	let driver;
	const baseUrl = process.env.BASE_URL;
	const username = process.env.AUTH0_USERNAME;
	const password = process.env.AUTH0_PASSWORD;

	before(async function () {
		driver = await new Builder().forBrowser('chrome').build();

		try {
			await driver.get(baseUrl);

			// Click the "Start Here" button
			const startHereButton = await driver.wait(
				until.elementLocated(
					By.xpath(
						"//span[contains(text(),'Start ') or contains(text(),'Start here')]"
					)
				),
				10000
			);
			await startHereButton.click();

			// Wait for login page (email input or username)
			const emailInput = await driver.wait(
				until.elementLocated(
					By.css('input[type="email"], input[name="username"]')
				),
				10000
			);
			await emailInput.sendKeys(username);

			// Click "Continue" if needed (some Auth0 flows have a two-step login)
			const continueBtn = await driver.findElements(
				By.css('button[type="submit"]')
			);
			if (continueBtn.length) {
				await continueBtn[0].click();
			}

			// Wait for password input
			const passwordInput = await driver.wait(
				until.elementLocated(By.css('input[type="password"]')),
				10000
			);
			await passwordInput.sendKeys(password);

			// Submit the form
			const loginBtn = await driver.wait(
				until.elementLocated(By.css('button[type="submit"]')),
				10000
			);
			await loginBtn.click();

			// Handle the "Accept" button if it appears (first-time login flow with consent)
			try {
				const acceptButton = await driver.wait(
					until.elementLocated(
						By.xpath(
							"//button[contains(text(), 'Accept') or contains(text(), 'Allow')]"
						)
					),
					5000
				);
				if (acceptButton) {
					await acceptButton.click(); // Click the "Accept" button
				}
			} catch (acceptError) {
				console.log(
					'No "Accept" button found, continuing with the login flow.'
				);
			}
			// Wait for home page to load (post-login redirection)
			await driver.wait(until.urlContains('/'), 10000);
		} catch (err) {
			console.error('❌ Error in login flow:', err.message);
			throw err;
		}
	});

	after(async function () {
		if (driver) await driver.quit();
	});

	it('should navigate to the dashboard page after clicking the "Dashboard" link', async function () {
		try {
			// Wait for the "Dashboard" link to appear and ensure it's not stale
			let dashboardLink = await driver.wait(
				until.elementLocated(By.css('a[href="/dashboard"]')),
				10000
			);

			// Re-locate the element in case it was stale
			dashboardLink = await driver.findElement(By.css('a[href="/dashboard"]'));

			await dashboardLink.click();

			// Wait for the dashboard page to load (by checking the URL)
			await driver.wait(until.urlContains('/dashboard'), 10000);
			const currentUrl = await driver.getCurrentUrl();
			assert(
				currentUrl.includes('/dashboard'),
				'Expected to land on dashboard'
			);
		} catch (err) {
			console.error('❌ Error in dashboard navigation:', err.message);
			throw err;
		}
	});
});
