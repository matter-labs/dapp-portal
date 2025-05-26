import { setTimeout } from "timers/promises";

import { Extension } from "../data/data";
import { depositTag, Helper, resetAllowanceTag } from "../helpers/helper";
import { config, wallet } from "../support/config";

import type { ICustomWorld } from "../support/custom-world";
import { MainPage } from "./main.page";
import { BasePage } from "./base.page";

let page: any;
let element: any;
let metamaskHomeUrl: string;
let metamaskWelcomeUrl: string;
export let address: string;
let selector: string;
let testId: any;
let logoutTrigger: any;

export class MetamaskPage extends BasePage {
  constructor(world: ICustomWorld) {
    super(world);
  }

  get continueBtn() {
    return "//*[@class='transaction-footer-row']//button";
  }

  get aggressiveFee() {
    return "//input[@value='high']";
  }

  get feeTypes() {
    return "//*[@class='transaction-detail-edit']//button";
  }

  get feeChangerBtn() {
    return "//div[@class='edit-gas-display']//button";
  }

  get feeChangerAlert() {
    return "//p[contains(text(), 'Fee has changed')]";
  }

  get saveFeeBtn() {
    return "//*[@class='popover-container']//button";
  }

  get metamaskResetButton() {
    return "//*[@data-testid='advanced-setting-reset-account']//button[1]"; // //button[contains(text(),'Reset')]|
  }

  get nextButton() {
    return "//button[contains(text(), 'Next')]";
  }

  get switchNetworkButton() {
    return "//button[contains(text(), 'Switch network')]";
  }

  get extensionDetailsBtn() {
    return "id=detailsButton";
  }

  get acceptMetricsBtn() {
    return "page-container-footer-next";
  }

  get noThanksBtn() {
    return "//button[contains(text(), 'No thanks')]";
  }

  get confirmTransaction() {
    return "//*[@data-testid='page-container-footer-next'] | //button[contains(text(), 'Confirm')] | //*[@data-testid='confirmation-submit-button']";
  }

  get signTransaction() {
    return "//*[@data-testid='page-container-footer-next'] | //button[contains(text(), 'Sign')]";
  }

  get scrolldownButton() {
    return "//*[@data-testid='signature-request-scroll-button']";
  }

  get cancelBtn() {
    return "//*[@data-testid='page-container-footer-cancel'] | //button[contains(text(), 'Cancel')]";
  }

  get declineBtn() {
    return "//*[@data-testid='page-container-footer-cancel'] | //button[contains(text(), 'Reject')]";
  }

  get newPasswordField() {
    return "//*[@data-testid='create-password-new' and @type='password']";
  }

  get confirmPasswordField() {
    return "//*[@data-testid='create-password-confirm' and @type='password']";
  }

  get unlockPasswordField() {
    return '[data-testid="unlock-password"]';
  }

  get confirmUnlockBtn() {
    return '[data-testid="unlock-submit"]';
  }

  get metamaskNextBtn() {
    return '[data-testid="page-container-footer-next"]';
  }

  get onboardingDoneBtn() {
    return '[data-testid="onboarding-complete-done"]';
  }

  get pinExtensionNextBtn() {
    return '[data-testid="pin-extension-next"]';
  }

  get pinExtensionDoneBtn() {
    return '[data-testid="pin-extension-done"]';
  }

  get popoverCloseBtn() {
    return '[data-testid="popover-close"]';
  }

  get checkboxTermsUsage() {
    return '[data-testid="create-password-terms"]';
  }

  get importBtn() {
    return "//button[contains(text(), 'Confirm Secret Recovery Phrase')]";
  }

  get succeedBtn() {
    return "//button[@data-testid='create-password-import']";
  }

  get confirmBtn() {
    return "//div[@class='confirmation-footer']//button[2]";
  }

  get switchNetworkBtnMM() {
    return "//div[@class='confirmation-footer']//button[contains(text(), 'Switch network')]";
  }

  get onboardingTermsLabel() {
    return "label[for='onboarding__terms-checkbox']";
  }

  get importExistingWalletBtn() {
    return "//button[contains(text(), 'Import an existing wallet')]";
  }

  get mainBtn() {
    return ".button";
  }

  get metamaskFormField() {
    return "@class='form-field__input'";
  }

  async metamaskValue(value: string) {
    return `@value='${value}'`;
  }

  get copyWalletAddress() {
    return "//button[@class='selected-account__clickable']";
  }

  // metamask home page
  get headerIcon() {
    return "(//*[contains(@class,'app-header')]//div[contains(@class,'identicon')])[1]";
  }

  get logoutBtn() {
    return "//div[@class='account-menu']//button";
  }

  get popOverMenuCloseBtn() {
    return "//h2[@title='popover']/..//button";
  }

  async getCodePhraseField(indx: number) {
    element = `${this.byTestId}import-srp__srp-word-` + indx.toString();
    return await element;
  }

  async getloginPage() {
    testId = new BasePage(this.world).byTestId;
    await page.bringToFront();
    await page.reload();
    await page.locator(this.onboardingTermsLabel).click();
    await page.click(this.importExistingWalletBtn);
    await page.click(this.mainBtn);
  }

  async importMetamaskAccount(secretPhrase: Array<string>, password: string) {
    await this.fillSecretPhrase(secretPhrase);
    await page.click(this.importBtn);
    await page.fill(this.newPasswordField, password);
    await page.fill(this.confirmPasswordField, password);
    await page.locator(this.checkboxTermsUsage).click({ force: true });
    await page.bringToFront();
    await page.click(this.succeedBtn);
  }

  private async fillSecretPhrase(walletPhrase: Array<string>) {
    for (let i = 0; i < walletPhrase.length; i++) {
      const secretWord: string = walletPhrase[i].toString();
      const codePhraseField: object = await this.getCodePhraseField(i);
      await page.locator(codePhraseField).fill(secretWord);
    }
  }

  async extractCurrentWalletAddress() {
    const helper = await new Helper(this.world);
    const currentURL = page.url();
    await page.goto(metamaskWelcomeUrl);
    await page.reload();
    await page.locator("//button[@data-testid='popover-close']").click();
    await page.locator(this.copyWalletAddress).click();
    address = await helper.getClipboardValue();
    await page.goto(currentURL);
  }

  async authorizeInMetamaskExtension(secretPhrase: Array<string>, password: string) {
    const helper = await new Helper(this.world);
    const wallet_password = await helper.decrypt(wallet.password);
    page = this.world.page;

    if (metamaskWelcomeUrl === undefined) {
      await this.getMetamaskExtensionUrl();
      await page.goto(metamaskWelcomeUrl);
      await page.reload();
      await page.bringToFront();
      await this.getloginPage();
      await this.importMetamaskAccount(secretPhrase, password);
    } else {
      await page.goto(metamaskWelcomeUrl);
      if (logoutTrigger && (await page.$(this.unlockPasswordField)) !== null) {
        await page.locator(this.unlockPasswordField).fill(wallet_password);
        await page.locator(this.confirmUnlockBtn).click();
      }
    }
    logoutTrigger = false;
    if (resetAllowanceTag) {
      await this.extractCurrentWalletAddress();
    }
  }

  async callTransactionInterface() {
    const helper = await new Helper(this.world);
    const mainPage = await new MainPage(this.world);
    selector = await mainPage.commonButtonByItsName("Change wallet network");
    const networkChangeRequest = await helper.checkElementVisible(selector);
    if (networkChangeRequest) {
      await this.switchNetwork();
    }
    await setTimeout(config.minimalTimeout.timeout);
    selector = await mainPage.commonButtonByItsName("Continue");
    const continueBtn = await helper.checkElementVisible(selector);
    const modalCard = await helper.checkElementVisible(mainPage.modalCard);
    if (continueBtn && !modalCard) {
      await this.click(selector);
    }
  }

  async approveAllowance(selector: string) {
    const mainPage = await new MainPage(this.world);
    selector = `${mainPage.modalCard}${selector}`;
    if (selector.includes("Approve allowance")) {
      selector = `${mainPage.modalCard}//*[contains(text(), 'Allowance approved')]`;
      await this.world.page?.waitForSelector(selector, config.extraTimeout);
      await this.click(await mainPage.buttonOfModalCard("Continue"));
    }
  }

  async operateTransaction(selector: string, argument: string) {
    await this.world.page?.locator(selector).waitFor({
      state: "visible",
      timeout: config.defaultTimeout.timeout,
    });
    const popUpContext = await this.catchPopUpByClick(selector);
    await setTimeout(config.minimalTimeout.timeout);
    await popUpContext?.setViewportSize(config.popUpWindowSize);
    if (argument == "confirm" || argument == "continue") {
      const confirmBtn = await popUpContext?.locator(this.confirmTransaction);
      let isDisabled: boolean | undefined = false;
      try {
        isDisabled = !(await confirmBtn?.isVisible()) || (await confirmBtn?.isDisabled());
      } catch (e) {
        console.log(e);
      }
      if (isDisabled) {
        const isVisibleScrolldown = await popUpContext?.isVisible(this.scrolldownButton);
        if (isVisibleScrolldown) {
          await popUpContext?.click(this.scrolldownButton, { timeout: config.defaultTimeout.timeout });
          const signBtnElement = await popUpContext?.locator(this.signTransaction);
          await signBtnElement?.scrollIntoViewIfNeeded();
          await popUpContext?.click(this.signTransaction, { timeout: config.increasedTimeout.timeout });
          return;
        }
      }
      // confirmScrolldownButton
      await popUpContext?.click(this.confirmTransaction, { timeout: config.increasedTimeout.timeout });
    } else if (argument == "next and confirm") {
      await popUpContext?.click(this.nextButton);
      await popUpContext?.click(this.confirmTransaction);
    } else if (argument == "networkSwitch") {
      await popUpContext?.click(this.switchNetworkButton);
    } else if (argument == "reject") {
      const cancelBtn = await popUpContext?.locator(this.cancelBtn);
      let isDisabled: boolean | undefined = false;
      try {
        isDisabled = !(await cancelBtn?.isVisible()) || (await cancelBtn?.isDisabled());
      } catch (e) {
        console.log(e);
      }
      if (isDisabled) {
        const isVisibleScrolldown = await popUpContext?.isVisible(this.scrolldownButton);
        if (isVisibleScrolldown) {
          await popUpContext?.click(this.scrolldownButton, { timeout: config.defaultTimeout.timeout });
          const cancelBtnElement = await popUpContext?.locator(this.cancelBtn);
          await cancelBtnElement?.scrollIntoViewIfNeeded();
          await popUpContext?.click(this.cancelBtn, { timeout: config.increasedTimeout.timeout });
          return;
        }
      }

      await popUpContext?.click(this.cancelBtn, config.increasedTimeout);
    }
  }

  async catchPopUpByClick(element: string) {
    const helper = await new Helper(this.world);
    const [popUp] = await Promise.all([
      this.world.context?.waitForEvent("page", { timeout: config.increasedTimeout.timeout }),
      this.world.page?.locator(element).first().click({ timeout: config.increasedTimeout.timeout }),
    ]);

    await popUp?.waitForLoadState("domcontentloaded");

    return popUp;
  }

  async isFeeAlert(element: string) {
    const helper = new Helper(this.world);
    const mainPage = new MainPage(this.world);
    const feeAlert = await helper.checkElementVisible(this.feeChangerAlert);
    if (feeAlert) {
      await helper.checkElementVisible(mainPage.confirmFeeChangeButton);
      await helper.checkElementClickable(mainPage.confirmFeeChangeButton);
      await this.click(mainPage.confirmFeeChangeButton);
      await helper.checkElementVisible(element);
      await helper.checkElementClickable(element);
      await this.catchPopUpByClick(element);
    }
  }

  async catchPopUp() {
    const [popUp] = await Promise.all([this.world.context?.waitForEvent("page")]);
    return popUp;
  }

  async switchNetwork() {
    const continueBtnSelector = "//button[contains(text(), ' Continue ')]";
    const continueBtnElement: any = await this.world.page?.locator(continueBtnSelector);
    const isContinueBtnElementVisible = await continueBtnElement.isVisible();

    const switchNetworkBtnSelector = "//div[@class='transaction-footer-row']//button";

    // Wait for the state to update
    await this.world.page?.waitForTimeout(300);
    const switchNetworkBtnElement: any = await this.world.page?.locator(switchNetworkBtnSelector);
    const buttonText = await switchNetworkBtnElement.innerText();
    const isChangeWalletNetwork = buttonText.includes("Change wallet network");
    const isConnectWallet = buttonText.includes("Connect wallet");
    const isButtonEnabled = isChangeWalletNetwork || isConnectWallet;
    const isSwitchNetworkBtnElementEnabled = await switchNetworkBtnElement.isEnabled();

    if (isSwitchNetworkBtnElementEnabled && isButtonEnabled && !isContinueBtnElementVisible) {
      const popUpContext = await this.catchPopUpByClick(switchNetworkBtnSelector);
      await popUpContext?.setViewportSize(config.popUpWindowSize);
      try {
        const confirmButton = await popUpContext?.waitForSelector(this.confirmTransaction, {
          state: "visible",
          timeout: config.increasedTimeout.timeout,
        });

        if (confirmButton) {
          await confirmButton.click();
        }
      } catch (error) {
        console.log("Confirm Transaction button not visible within timeout.");
      }

      try {
        const confirmButton = await popUpContext?.waitForSelector(this.confirmTransaction, {
          state: "visible",
          timeout: config.increasedTimeout.timeout,
        });

        if (confirmButton) {
          await confirmButton.click();
        }
      } catch (error) {
        console.log("Confirm Transaction button not visible within timeout.");
      }

      try {
        const switchNetworkButton = await popUpContext?.waitForSelector(this.switchNetworkBtnMM, {
          state: "visible",
          timeout: config.increasedTimeout.timeout,
        });

        if (switchNetworkButton) {
          await switchNetworkButton.click();
        }
      } catch (error) {
        // Switch Network button not visible, skipping click.
      }
    }
  }

  private async getMetamaskExtensionUrl() {
    await page.goto(Extension.allExtensionsUrl);
    await page.locator(this.extensionDetailsBtn).click();
    let extractedId: any = await page.url();
    extractedId = await extractedId.match("\\=(.*)")[1];
    metamaskHomeUrl = Extension.specifiedExtensionUrl + extractedId + Extension.metamaskHomeHtml;
    metamaskWelcomeUrl = metamaskHomeUrl + Extension.metamaskInitialize;
  }

  private async processTransaction(context: any, actionType: string) {
    await context?.setViewportSize(config.popUpWindowSize);
    await context?.bringToFront();
    if (actionType === "confirm") {
      await this.selectAggressiveFee(context);
      await context?.click(this.confirmTransaction, config.increasedTimeout);
    } else if (actionType === "reject") {
      await context?.click(this.declineBtn, config.increasedTimeout);
    } else {
      console.error("Incorrect actionType value: it should be only confirm or reject");
    }
  }

  async selectAggressiveFee(context: any) {
    await context?.click(this.feeTypes, config.increasedTimeout);
    await context?.click(this.feeChangerBtn, config.increasedTimeout);
    const aggressiveFeeVisibility = await context?.locator(this.aggressiveFee).isVisible(config.defaultTimeout);
    if (aggressiveFeeVisibility) {
      await context?.click(this.aggressiveFee, config.increasedTimeout);
    }
    await context?.click(this.saveFeeBtn, config.increasedTimeout);
  }

  async logout() {
    const page = await this.world.context?.newPage();
    await page?.goto(metamaskWelcomeUrl);
    await page?.waitForLoadState("domcontentloaded");

    if (logoutTrigger === false || logoutTrigger === undefined || (await page?.$(this.unlockPasswordField)) === null) {
      if (await page?.locator(this.popOverMenuCloseBtn).isVisible(config.defaultTimeout)) {
        await page?.locator(this.popOverMenuCloseBtn).first().click(config.defaultTimeout);
      }
      if (await page?.locator(this.headerIcon).first().isVisible(config.defaultTimeout)) {
        await page?.locator(this.headerIcon).first().click();
        await page?.locator(this.logoutBtn).first().click();
      }
    }
    return (logoutTrigger = true);
  }

  async isLogout() {
    return logoutTrigger;
  }
}
