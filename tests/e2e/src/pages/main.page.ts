import { expect } from "@playwright/test";

import { Routes } from "../data/data";
import { Helper } from "../helpers/helper";
import { config } from "../support/config";

import type { ICustomWorld } from "../support/custom-world";
import { MetamaskPage } from "./metamask.page";
import { BasePage } from "./base.page";

let metamaskPage: any;
let result: any;
let maxBalanceErrorValue: string;

export class MainPage extends BasePage {
  constructor(world: ICustomWorld) {
    super(world);
  }

  get amountInputField() {
    return "//*[@class='amount-input-field-container']//input";
  }

  get accountDropdown() {
    return `${this.byTestId}account-dropdown`;
  }

  get modalCard() {
    return "//*[@class='modal-card']";
  }

  get circleTimerElement() {
    return '//*[contains(@class, "radial-progress")]';
  }

  get submittedTransactionAnimation() {
    return '//*[contains(@class, "progress-plane-animation")]';
  }

  get greenSuccessMark() {
    return '//*[contains(@class, "lottie-animation-container")]';
  }

  get faucetTokensAnimation() {
    return '//*[contains(@class, "idle-faucet-animation")]';
  }

  get menuElement() {
    return "//*[@class='menu-options']";
  }

  get avatarModalCard() {
    return '//*[contains(@class, "address-card-avatar")]';
  }

  get totalIntBalance() {
    return ".total-int";
  }

  get externalLinkArrow() {
    return "//*[@class='line-button-with-img-icon']";
  }

  get totalDecBalance() {
    return ".total-dec";
  }

  get tokenDropDown() {
    return "token-dropDown";
  }

  get selectedNetwork() {
    return ".network-item-label";
  }

  get getFirstToken() {
    return "//button[@l1address]";
  }

  get emptyBalancesWarning() {
    return `${this.byTestId}no-balances-warning`;
  }

  get feeValue() {
    return `${this.byTestId}fee-amount`;
  }

  get balanceValue() {
    return "//span[@class='break-all']";
  }

  get closeBtnModalCard() {
    return "//*[@data-testid='close-button']";
  }

  get networkSwitcher() {
    return `${this.byTestId}network-switcher`;
  }

  get amountInputErrorButton() {
    return '//*[@class="amount-input-error"]//button';
  }

  async getButton(buttonName: string) {
    return `//*[@type='button' and contains(., '${buttonName}')] | //button[text()[contains(string(), '${buttonName}')]]`;
  }

  get confirmFeeChangeButton() {
    return "//button[text()='Confirm']";
  }

  async commonButtonByItsName(value: string) {
    return `//button[contains(., '${value}')]`;
  }

  async buttonOfModalCard(buttonText: string) {
    return `${this.modalCard}//button[text()='${buttonText}']`;
  }

  async feeValueIs(flag: string, value: string) {
    const helperPage = await new Helper(this.world);
    const element = this.feeValue;
    await this.world.page?.waitForTimeout(5000); // required
    await helperPage.checkElementVisible(element);
    result = await this.world.page?.locator(element);
    if (flag == "should") {
      return await expect(result).toContainText(value);
    } else if (flag == "should not") {
      return await expect(result).not.toContainText(value);
    }
  }

  async isElementDissapeared(selecterValue: string, seconds: number) {
    const helper = new Helper(this.world);
    const basePage = new BasePage(this.world);
    const selector = `//*[@${basePage.byTestId}'fee-amount']//*[@alt='${selecterValue}']`;
    const timeout = (seconds + 5) * 1000; // plus extra 5 seconds to avoid false positive timeout issues
    return await helper.checkSelectorHidden(selector, timeout);
  }

  async selectTransaction(transactionType: string) {
    try {
      let route: string;
      if (transactionType === "Withdraw") {
        route = Routes.withdraw;
      } else if (transactionType === "Deposit") {
        route = Routes.deposit;
      } else {
        throw new Error("Unknown transaction type");
      }

      await this.world.page?.goto(config.BASE_URL + route + config.DAPP_NETWORK);
      return route;
    } catch (e) {
      sentryCaptureException({
        error: e as Error,
        parentFunctionName: "selectTransaction",
        parentFunctionParams: [transactionType],
        accountAddress: "",
        filePath: "tests/e2e/src/pages/main.page.ts",
      });
      console.error(e);
    }
  }

  async chooseToken(tokenName: string) {
    await this.click(this.tokenDropDown, true);
    await this.clickBy("placeholder", "Symbol or address");
    await this.fill(".small-input-field", `${tokenName}`);
    await this.click(this.getFirstToken);
  }

  async insertAmount(amount: string) {
    await this.world.page?.waitForTimeout(3 * 1000);
    await this.fill(this.amountInputField, amount);
  }

  async makeTransaction(actionType: string, transactionType: string) {
    metamaskPage = await new MetamaskPage(this.world);
    const selector = await this.getTransactionSelector(transactionType);
    if (actionType != "continue") {
      await metamaskPage.callTransactionInterface();
    }
    await metamaskPage.operateTransaction(selector, actionType);
  }

  async getTransactionSelector(transactionType: string) {
    const selector = `//*[contains(text(),'${transactionType}')]`;
    return selector;
  }

  async monitorBalance(walletAddress: string, layer: string) {
    const helper = await new Helper(this.world);
    const balanceETH = await helper.getBalanceETH(walletAddress, layer);
    await helper.notifyQAIfLowBalance(layer, walletAddress, balanceETH);
    console.log("======== " + layer + " balance: " + balanceETH + " ETH | " + walletAddress);
    await expect(balanceETH).toBeGreaterThan(config.thresholdBalance);
  }

  async getTotalBalance() {
    const helper = new Helper(this.world);

    const totalInt = await helper.getTextFromLocator(this.totalIntBalance);
    const totalDec = await helper.getTextFromLocator(this.totalDecBalance);

    result = await helper.getNumberFromString(totalInt + totalDec);
    const extractedNumber = result.replace(/[^\d.-]/g, "");
    result = parseFloat(extractedNumber);

    return result;
  }

  async performLogOut() {
    const helper = new Helper(this.world);
    await helper.clearLocalStorage();
    await this.world.page?.reload();
  }

  async fillText(inputField: string, text: string) {
    const helper = new Helper(this.world);

    if (text !== "clipboard") {
      await this.fill(inputField, text);
    } else {
      result = await helper.getClipboardValue();
      await this.fill(inputField, result);
    }
  }

  async checkModalCardElement(xpath: string, checkType: string) {
    const selector = this.modalCard + xpath;
    await this.verifyElement("xpath", selector, checkType);
  }

  async checkArrowElement(externalLinkName: string, checkType: string) {
    let link: any;
    if (externalLinkName === "Layerswap") {
      link = "https://www.layerswap.io/?sourceExchangeName=ZKSYNCERA_MAINNET";
      const selector = `//*[contains(@href,'${link}')]` + this.externalLinkArrow;
      await this.verifyElement("xpath", selector, checkType);
    } else if (externalLinkName === "Transfer" || externalLinkName === "Withdraw") {
      link = "https://goerli.explorer.zksync.io/tx";
      const selector = this.modalCard + `//*[contains(@href,'${link}')]` + this.externalLinkArrow;
      await this.verifyElement("xpath", selector, checkType);
    } else if (externalLinkName === "Deposit") {
      link = "https://goerli.etherscan.io/tx/";
      const selector = this.modalCard + `//*[contains(@href,'${link}')]` + this.externalLinkArrow;
      await this.verifyElement("xpath", selector, checkType);
    } else {
      return console.error("An incorrect link name has been provided");
    }
  }

  async clickModalCardElement(selectorValue: string) {
    let selector: string;
    const regex = /\/\/\*/g;
    const matchXpath = selectorValue.match(regex);

    if (!matchXpath) {
      selector = `//*[contains(text(),'${selectorValue}')]`;
    } else {
      selector = selectorValue;
    }
    await this.click(this.modalCard + selector);
  }

  async clickMenuElement(text: string) {
    const selector = `//*[contains(text(),'${text}')]`;
    await this.click(this.menuElement + selector);
  }

  async selectNetwork(networkName: string) {
    await this.click(this.networkSwitcher);

    if (
      networkName === "ZKsync Era Mainnet" ||
      networkName === "ZKsync Era Testnet" ||
      networkName === "ZKsync Lite Mainnet" ||
      networkName === "ZKsync Lite Goerli"
    ) {
      result = `//*[text()='${networkName}']`;
    } else {
      console.log("An incorrect value of the Network name");
    }
    await this.click(this.modalCard + result);
  }

  async getTypeOfTransactionsElement() {
    const href = Routes.txBlockExplorer;
    const transactionTypes = ["Receive", "Withdraw", "Send"];

    for (let i = 0; i < transactionTypes.length; i++) {
      const selectorValue = `'${href}' and '${transactionTypes[i]}'`;

      result = await this.getElementByPartialHrefAndText(selectorValue);

      if (result !== undefined) {
        break;
      }
    }
    return result;
  }

  async clickOnButton(buttonName: string) {
    const selector = await this.getButton(buttonName);
    await this.click(selector);
  }

  async saveMaxBalanceErrorValue() {
    const helper = new Helper(this.world);
    const selector = this.amountInputErrorButton;
    maxBalanceErrorValue = await helper.getTextFromLocator(selector);
  }

  async maxAmountIsSet() {
    const basePage = new BasePage(this.world);
    const elementType = "class";
    const elementValue = "amount-input-field";
    const contentType = "value";
    basePage.verifyContent(elementType, elementValue, maxBalanceErrorValue, contentType);
  }
}
