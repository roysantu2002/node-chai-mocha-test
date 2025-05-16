const axios = require('axios');
const { Builder, By, until } = require('selenium-webdriver');
const { expect } = require('chai');
require('dotenv').config(); // Load environment variables from .env file

// Auth0 credentials from .env file
const auth0ClientId = process.env.AUTH0_CLIENT_ID;
const auth0ClientSecret = process.env.AUTH0_CLIENT_SECRET;
const auth0Domain = process.env.AUTH0_DOMAIN; // e.g., your-domain.auth0.com
const auth0Audience = process.env.AUTH0_AUDIENCE; // API audience

// User credentials from .env file
const auth0Username = process.env.AUTH0_USERNAME;
const auth0Password = process.env.AUTH0_PASSWORD;

// Auth0 token URL
const auth0TokenUrl = `https://${auth0Domain}/oauth/token`;

let driver;
let accessToken;

describe('Home Page UI Tests with Auth0 Login', function () {
	this.timeout(60000);

	before(async () => {
		try {
			// Step 1: Request Auth0 token using password grant
			const response = await axios.post(auth0TokenUrl, {
				grant_type: 'password',
				username: auth0Username,
				password: auth0Password,
				client_id: auth0ClientId,
				client_secret: auth0ClientSecret,
				audience: auth0Audience,
				scope: 'openid read profile email phone offline_access refetch: true',
				connection: 'Username-Password-Authentication', // Explicitly define connection nam
			});

			// Step 2: Store the token for later use
			accessToken = response.data.access_token;
			console.log('Access Token:', accessToken);

			// Step 3: Launch the driver and set cookies (or headers)
			driver = await new Builder().forBrowser('chrome').build();
			await driver.get('http://localhost:3000');

			// Set the Auth0 access token in cookies (if your app uses cookies)
			await driver.manage().addCookie({
				name: 'access_token',
				value: accessToken,
				domain: 'localhost', // Adjust domain if needed
			});

			// Reload to make sure the login state is active
			await driver.get('http://localhost:3000');
		} catch (error) {
			console.error('Error during login setup:', error);
			throw error;
		}
	});

	after(async () => {
		try {
			if (driver) {
				await driver.quit();
			}
		} catch (error) {
			console.error('Error during after hook:', error);
		}
	});

	it('should login and navigate to the dashboard page', async function () {
		try {
			// Step 1: Ensure the page has a Dashboard item (button or link)
			const dashboardLink = await driver.wait(
				until.elementLocated(By.css('a.dashboard-link')), // Adjust the selector to match your page
				5000
			);
			expect(dashboardLink).to.not.be.null;

			// Step 2: Click the Dashboard link
			await dashboardLink.click();

			// Step 3: Wait for the page to navigate to /dashboard
			await driver.wait(until.urlContains('/dashboard'), 5000);

			// Step 4: Verify that the dashboard page has loaded (you can verify any specific element on the dashboard)
			const dashboardHeader = await driver.wait(
				until.elementLocated(By.css('h1.dashboard-header')), // Adjust the selector to match your dashboard page
				5000
			);
			expect(dashboardHeader).to.not.be.null;

			console.log('✅ Successfully logged in and navigated to the dashboard');
		} catch (error) {
			console.error('Error during test execution:', error);
			throw error;
		}
	});
});
