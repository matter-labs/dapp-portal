import { Given, Then, When } from "@cucumber/cucumber";
import { expect } from "@playwright/test";

import { Helper } from "../helpers/helper";
import { BasePage } from "../pages/base.page";
import { ContactsPage } from "../pages/contacts.page";
import { LoginPage } from "../pages/login.page";
import { MainPage } from "../pages/main.page";
import { MetamaskPage } from "../pages/metamask.page";
import { RevokePage } from "../pages/revoke.page";
import { config } from "../support/config";

import type { ICustomWorld } from "../support/custom-world";

let basePage: BasePage;
let mainPage: MainPage;
let loginPage: LoginPage;
let revokePage: RevokePage;
let metamaskPage: MetamaskPage;
let contactsPage: ContactsPage;
let helper: Helper;
let result: any;
let element: any;

Given("I go to {string} url", config.stepTimeout, async function (this: ICustomWorld, url: string) {
  basePage = new BasePage(this);
  await basePage.goTo(url);
});

Given("I go to page {string}", config.stepTimeout, async function (this: ICustomWorld, route: string) {
  await this.page?.waitForLoadState("load", { timeout: 3 * 1000 });
  await this.page?.goto(config.BASE_URL + route);
});

When("I click by text {string}", config.stepTimeout, async function (this: ICustomWorld, text: string) {
  basePage = new BasePage(this);
  await basePage.clickByText(text);
});

When("I click by partial text {string}", config.stepTimeout, async function (this: ICustomWorld, text: string) {
  basePage = new BasePage(this);
  await basePage.clickByPartialText(text);
});

When(
  "I click by {string} with {string} value",
  config.stepTimeout,
  async function (this: ICustomWorld, elementType: string, value: string) {
    basePage = new BasePage(this);
    await basePage.clickBy(elementType, value);
  }
);

When("Connect Metamask extension with login action", config.stepTimeout, async function (this: ICustomWorld) {
  const loginPage = new LoginPage(this);

  await loginPage.connectMetamask();
});

When(
  "I go to {string} transaction section",
  config.stepTimeout,
  async function (this: ICustomWorld, transactionType: string) {
    mainPage = new MainPage(this);
    await mainPage.selectTransaction(transactionType);
  }
);

When(
  "I choose {string} as token and insert {string} as amount",
  config.stepTimeout,
  async function (this: ICustomWorld, token: string, amount: string) {
    mainPage = new MainPage(this);
    await mainPage.chooseToken(token);
    await mainPage.insertAmount(amount);
  }
);

When(
  "Message {string} should be visible",
  config.stepTimeout,
  async function (this: ICustomWorld, successMessage: string) {
    result = await this.page?.locator(`//*[text()="${successMessage}"]`).first();
    await expect(result).toBeVisible(config.stepTimeout);
  }
);

When("Circle timer for fee updating should be visible", config.stepTimeout, async function (this: ICustomWorld) {
  mainPage = new MainPage(this);
  element = mainPage.circleTimerElement;
  result = await this.page?.locator(element);
  await expect(result).toBeVisible();
});

When(
  "I {string} transaction after clicking {string} button",
  config.stepExtraTimeout,
  async function (this: ICustomWorld, actionType: string, transactionBtn: string) {
    mainPage = new MainPage(this);
    await mainPage.makeTransaction(actionType, transactionBtn);
  }
);

When(
  "I approve allowance after clicking {string} button",
  config.stepExtraTimeout,
  async function (this: ICustomWorld, transactionBtn: string) {
    metamaskPage = new MetamaskPage(this);
    mainPage = new MainPage(this);
    const selector = await mainPage.getTransactionSelector(transactionBtn);
    await metamaskPage.approveAllowance(selector);
  }
);

Then(
  "Element with {string} {string} should be {string}",
  config.stepTimeout,
  async function (this: ICustomWorld, elementType: string, value: string, checkType: string) {
    basePage = new BasePage(this);

    await basePage.verifyElement(elementType, value, checkType);
  }
);

Then(
  "Element with {string} {string} should have {string} {string}",
  config.stepTimeout,
  async function (
    this: ICustomWorld,
    elementType: string, // f.e. id or class
    elementValue: string,
    content: string,
    contentType: string // f.e. value or text
  ) {
    basePage = new BasePage(this);

    await basePage.verifyContent(elementType, elementValue, content, contentType);
  }
);

When("I insert {string} as amount", config.stepTimeout, async function (this: ICustomWorld, amount: string) {
  mainPage = new MainPage(this);
  await mainPage.insertAmount(amount);
});

When("I confirm the network switching", config.stepTimeout, async function (this: ICustomWorld) {
  metamaskPage = new MetamaskPage(this);
  await metamaskPage.switchNetwork();
});

When(
  "I confirm the network switching {string}",
  config.stepTimeout,
  async function (this: ICustomWorld, network?: string) {
    metamaskPage = new MetamaskPage(this);
    await metamaskPage.switchNetwork(network);
  }
);

When("A wallet should be {string}", config.stepTimeout, async function (this: ICustomWorld, balanceValue: string) {
  mainPage = new MainPage(this);
  result = await mainPage.getTotalBalance();

  if (balanceValue === "fullfilled") {
    await expect(result).toBeGreaterThan(0.1);
  } else if (balanceValue === "empty") {
    await expect(result).toBeLessThanOrEqual(0);
  } else {
    console.log("An incorrect value has been provided as a parameter: the correct ones only 'fullfilled' and 'empty'");
  }
});

When("I'm logged out", config.stepTimeout, async function (this: ICustomWorld) {
  mainPage = new MainPage(this);
  loginPage = new LoginPage(this);

  await mainPage.performLogOut();
  await this.page?.waitForLoadState();

  result = await this.page?.locator(loginPage.loginBtn);

  await expect(result).toBeVisible();
});

Then("Clipboard contains {string} value", async function (this: ICustomWorld, text: string) {
  helper = new Helper(this);
  result = await helper.getClipboardValue();

  await expect(result).toBe(text);
});

Then("Clipboard is not empty", async function (this: ICustomWorld) {
  helper = new Helper(this);
  result = await helper.getClipboardValue();

  await expect(typeof result).toBe("string");
});

Given(
  "I fill the input field contains {string} type {string} value with {string} text",
  async function (this: ICustomWorld, selectorType: string, selectorValue: string, text: string) {
    basePage = new BasePage(this);
    await basePage.fillSpecificField(selectorType, selectorValue, text);
  }
);

Given("I click on the Copy button", async function (this: ICustomWorld) {
  await this.page?.locator("//button[@class='copy-button']").last().click();
});

Given("I click on the Save contact button", async function (this: ICustomWorld) {
  await this.page?.locator("//button[@type='submit' and text()='Save contact']").first().click();
});

Given("I click on the {string} button", async function (this: ICustomWorld, buttonName: string) {
  mainPage = new MainPage(this);
  await mainPage.clickOnButton(buttonName);
});

Given("I click on the Add contact button for found contact", async function (this: ICustomWorld) {
  contactsPage = new ContactsPage(this);
  await contactsPage.clickAddButton();
});

Given("I click on the Edit contact button", async function (this: ICustomWorld) {
  contactsPage = new ContactsPage(this);
  await contactsPage.pressEditBtnModal();
});

Given("I click on the {string} contact button", async function (this: ICustomWorld, removeButtonName: string) {
  contactsPage = new ContactsPage(this);
  await contactsPage.pressRemoveBtnModal(removeButtonName);
});

Given("I go to the main page", config.stepTimeout, async function (this: ICustomWorld) {
  await this.page?.waitForLoadState("load", config.defaultTimeout);
  await this.page?.goto(config.BASE_URL + config.DAPP_NETWORK);
});

Given("I am on the Main page", async function (this: ICustomWorld) {
  const basePage = new BasePage(this);
  await this.page?.waitForTimeout(config.minimalTimeout.timeout);
  element = await basePage.returnElementByType("class", "title");
  await expect(element).toBeVisible(config.increasedTimeout);
  const textContent = await element.textContent();
  await expect(textContent).toContain("Bridge");
  result = await basePage.isImOnTheMainPage();
  await expect(result).toBe(true);
});

Given("I am on the Assets page", async function (this: ICustomWorld) {
  const basePage = new BasePage(this);
  await this.page?.waitForTimeout(config.minimalTimeout.timeout);
  element = await basePage.returnElementByType("class", "title");
  await expect(element).toBeVisible(config.increasedTimeout);
  const textContent = await element.textContent();
  await expect(textContent).toContain("Assets");
  result = await basePage.isImOnTheAssetsPage();
  await expect(result).toBe(true);
});

Then("Current page have {string} address", config.stepTimeout, async function (this: ICustomWorld, route: string) {
  mainPage = new MainPage(this);
  helper = new Helper(this);
  await this.page?.waitForURL("**" + route);
  result = await this.page?.url();

  await expect(result).toContain(route);
});

Given("I click the Send button (modal) on the Contacts page", async function (this: ICustomWorld) {
  contactsPage = new ContactsPage(this);
  await contactsPage.pressSendBtnModal();
});

Given("I click on the First saved contact within the Contacts page", async function (this: ICustomWorld) {
  contactsPage = new ContactsPage(this);
  await contactsPage.clickOnSavedContact();
});

Given(
  "The {string} contact name is visible on the modal window within the Contacts page",
  async function (this: ICustomWorld, contactName: string) {
    contactsPage = new ContactsPage(this);
    element = await this.page?.locator(await contactsPage.contactNameModal(contactName));

    await expect(element).toBeVisible();
  }
);

Given(
  "The {string} contact name is visible in the list on Contacts page",
  async function (this: ICustomWorld, contactName: string) {
    contactsPage = new ContactsPage(this);
    element = await contactsPage.getContactItem(contactName);
    await expect(element).toBeVisible();
  }
);

Given(
  "The {string} contact name is not present in the list on Contacts page",
  async function (this: ICustomWorld, contactName: string) {
    helper = new Helper(this);
    contactsPage = new ContactsPage(this);
    element = await contactsPage.getContactItem(contactName);
    result = await helper.checkElementVisible(element);
    await expect(result).toBe(false);
  }
);

Then(
  "Fee {string} have {string} value",
  config.stepTimeout,
  async function (this: ICustomWorld, flag: string, value: string) {
    mainPage = new MainPage(this);
    await mainPage.feeValueIs(flag, value);
  }
);

Then(
  "Modal card element with the {string} xpath should be {string}",
  config.stepTimeout,
  async function (this: ICustomWorld, xpath: string, checkType: string) {
    mainPage = new MainPage(this);
    await mainPage.checkModalCardElement(xpath, checkType);
  }
);

Then(
  "Arrow element for {string} external link should be {string}",
  config.stepTimeout,
  async function (this: ICustomWorld, link: string, checkType: string) {
    mainPage = new MainPage(this);
    await mainPage.checkArrowElement(link, checkType);
  }
);

When(
  "I click by the {string} text element on the Modal card",
  config.stepTimeout,
  async function (this: ICustomWorld, textElement: string) {
    mainPage = new MainPage(this);
    await mainPage.clickModalCardElement(textElement);
  }
);

When(
  "Element {string} should dissapear in {int} seconds",
  config.stepExtraTimeout,
  async function (this: ICustomWorld, selecterValue: string, seconds: number) {
    mainPage = new MainPage(this);
    result = await mainPage.isElementDissapeared(selecterValue, seconds);
    await expect(result).toBe(true);
  }
);

When("I click by the {string} text on the Menu", config.stepTimeout, async function (this: ICustomWorld, text: string) {
  mainPage = new MainPage(this);
  await mainPage.clickMenuElement(text);
});

Then("I close modal card", config.stepTimeout, async function (this: ICustomWorld) {
  const basePage = new BasePage(this);
  const mainPage = new MainPage(this);
  const modalCardElement = mainPage.modalCard;
  element = modalCardElement + mainPage.closeBtnModalCard;

  await basePage.click(element);
});

Then("I select the {string} network", config.stepTimeout, async function (this: ICustomWorld, networkName: string) {
  const mainPage = new MainPage(this);

  await mainPage.selectNetwork(networkName);
});

Then("New page has {string} address", config.stepTimeout, async function (this: ICustomWorld, url: string) {
  mainPage = new MainPage(this);
  helper = new Helper(this);
  await this.page?.waitForTimeout(5000);
  result = await helper.checkTabByUrl(url);
  await expect(result).toBe(url);
});

Then("New page has {string} partial address", config.stepTimeout, async function (this: ICustomWorld, url: string) {
  mainPage = new MainPage(this);
  helper = new Helper(this);
  await this.page?.waitForTimeout(5000);
  result = await helper.checkTabByUrl(url, true);
  await expect(result).toContain(url);
});

Then(
  "I hover the {string} element with {string} value",
  config.stepTimeout,
  async function (this: ICustomWorld, elementType: string, value: string) {
    const basePage = new BasePage(this);
    element = await basePage.returnElementByType(elementType, value);

    await element.hover();
  }
);

Then(
  "The list has the one of the expected type of transactions",
  config.stepTimeout,
  async function (this: ICustomWorld) {
    const mainPage = new MainPage(this);
    element = await mainPage.getTypeOfTransactionsElement();

    await expect(element).toBeVisible();
  }
);

Then("The Green success mark should be visible", config.stepTimeout, async function (this: ICustomWorld) {
  mainPage = new MainPage(this);
  element = mainPage.greenSuccessMark;
  result = await this.page?.locator(element);
  await expect(result).toBeVisible();
});

Then("Submitted transaction animation should be visible", config.stepTimeout, async function (this: ICustomWorld) {
  mainPage = new MainPage(this);
  element = mainPage.submittedTransactionAnimation;
  result = await this.page?.locator(element);
  await expect(result).toBeVisible();
});

Then("Faucet tokens animation should be visible", config.stepTimeout, async function (this: ICustomWorld) {
  mainPage = new MainPage(this);
  element = mainPage.faucetTokensAnimation;
  result = await this.page?.locator(element);
  await expect(result).toBeVisible();
});

Given("I reset allowance", config.stepExtraTimeout, async function (this: ICustomWorld) {
  revokePage = new RevokePage(this);
  await revokePage.login();
  await revokePage.revokeAllowance();
  await revokePage.logout();
});

When("I save Max Balance Error Value", config.stepTimeout, async function (this: ICustomWorld) {
  mainPage = new MainPage(this);
  await mainPage.saveMaxBalanceErrorValue();
});

When("I click on the underlined Max amount number", config.stepTimeout, async function (this: ICustomWorld) {
  mainPage = new MainPage(this);
  await mainPage.click(mainPage.amountInputErrorButton);
});

When("Max amount is set to the input field", config.stepTimeout, async function (this: ICustomWorld) {
  mainPage = new MainPage(this);
  await mainPage.maxAmountIsSet();
});
