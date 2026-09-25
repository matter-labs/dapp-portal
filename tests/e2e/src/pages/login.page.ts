import { Helper } from "../helpers/helper";
import { config, wallet } from "../support/config";
import type { Page } from "@playwright/test";
import type { ICustomWorld } from "../support/custom-world";
import { MetamaskPage } from "./metamask.page";
import { BasePage } from "./base.page";

export class LoginPage extends BasePage {
  constructor(world: ICustomWorld) {
    super(world);
  }

  get notificationBtn() {
    return "//button[2]";
  }

  get loginBtn() {
    return `${this.byTestId}login-button`;
  }

  get changeNetworkBtn() {
    return `${this.byTestId}change-l1-network-button`;
  }

  get termsAndConditionsCheckbox() {
    return `${this.byTestId}terms-and-conditions-checkbox`;
  }

  get proceedBtn() {
    return `${this.byTestId}proceed-button`;
  }

  get mainTitle() {
    return "//h1[text()='ZKsync Portal']";
  }

  async firstTimeLogin(metamaskPage: MetamaskPage, walletPassword: string) {
    // Now wait for the second popup or tab (unlock page) to open
    const popUp = await this.world.context?.waitForEvent("page", {
      timeout: config.increasedTimeout.timeout,
    });
    // Wait for second popup to load the unlock page
    await popUp?.waitForLoadState("domcontentloaded");
    await popUp?.waitForURL("**/home.html#onboarding/unlock", { timeout: config.increasedTimeout.timeout });

    await popUp?.locator(metamaskPage.unlockPasswordField).isVisible(config.defaultTimeout);
    // await popUp?.setViewportSize(config.popUpWindowSize);
    const passwordFieldVisible = await popUp
      ?.locator(metamaskPage.unlockPasswordField)
      .isVisible(config.defaultTimeout);
    if (passwordFieldVisible) {
      await popUp?.locator(metamaskPage.unlockPasswordField).fill(walletPassword);
      await popUp?.locator(metamaskPage.confirmUnlockBtn).click();
      await popUp?.locator(metamaskPage.onboardingDoneBtn).click();
      await popUp?.locator(metamaskPage.pinExtensionNextBtn).click();
      await popUp?.locator(metamaskPage.pinExtensionDoneBtn).click();
      await popUp?.waitForTimeout(700);
      await popUp?.locator(metamaskPage.popoverCloseBtn).click();
      await popUp?.close();
      await this.world.page?.waitForTimeout(700);
      await this.world.page?.reload();
    }
  }

  async nonFirstTimeLogin(metamaskPage: MetamaskPage, walletPassword: string, popUp?: Page) {
    await popUp?.setViewportSize(config.popUpWindowSize);
    // await popUp?.setViewportSize(config.popUpWindowSize);
    const passwordFieldVisible = await popUp
      ?.locator(metamaskPage.unlockPasswordField)
      .isVisible(config.defaultTimeout);

    if (passwordFieldVisible) {
      await popUp?.locator(metamaskPage.unlockPasswordField).fill(walletPassword);
      await popUp?.locator(metamaskPage.confirmUnlockBtn).click();
    } else {
      await popUp?.locator(metamaskPage.metamaskNextBtn).click();
      await popUp?.locator(metamaskPage.metamaskNextBtn).click();
    }
    await popUp?.waitForEvent("close", { timeout: config.increasedTimeout.timeout });
  }

  async connectMetamask() {
    const helper = await new Helper(this.world);
    const loginStatus = await this.checkLoginStatus();
    const wallet_password = helper.getWalletPassword();

    if (!loginStatus) {
      const metamaskPage = await new MetamaskPage(this.world);

      try {
        const checkbox = await this.world.page?.waitForSelector(this.termsAndConditionsCheckbox, {
          state: "visible",
          timeout: config.defaultTimeout.timeout, // short timeout to avoid long waits
        });
        if (checkbox) {
          await checkbox.click(config.increasedTimeout);
          await this.world.page?.waitForSelector(this.proceedBtn);
          await this.world.page?.locator(this.proceedBtn).click(config.increasedTimeout); // click a proceed button
        }
      } catch (error) {
        // Checkbox not visible, skipping click.
      }

      try {
        const loginButton = await this.world.page?.waitForSelector(this.loginBtn, {
          state: "visible",
          timeout: config.defaultTimeout.timeout, // short timeout to avoid long waits
        });
        if (loginButton) {
          await loginButton.click(config.increasedTimeout);
          const popUp = await new MetamaskPage(this.world).catchPopUpByClick(":text('MetaMask')");

          // Check if it's the first time the MetaMask is being opened:
          try {
            // Wait for first popup to close
            await popUp?.waitForEvent("close", { timeout: config.increasedTimeout.timeout });
            await this.firstTimeLogin(metamaskPage, wallet_password);
            await this.world.page?.locator(this.loginBtn).click(config.increasedTimeout); // click a login button
            const newPopUp = await new MetamaskPage(this.world).catchPopUpByClick(":text('MetaMask')");
            await this.nonFirstTimeLogin(metamaskPage, wallet_password, newPopUp);
          } catch (error) {
            await this.nonFirstTimeLogin(metamaskPage, wallet_password, popUp);
          }
        }
      } catch (error) {
        // Login button not visible, skipping click.
      }
      await this.world.page?.waitForTimeout(config.increasedTimeout.timeout);
    } else if (!(await this.actualNetworkIsSepolia())) {
      await this.world.page?.goto(config.BASE_URL + config.DAPP_NETWORK);
      await this.world.page?.waitForLoadState("load");
    }
  }

  async logout() {
    await this.world.page?.evaluate(() => window.localStorage.clear());
    await this.world.page?.waitForTimeout(500);
    await this.world.page?.reload();
    await this.world.page?.waitForURL(config.BASE_URL);
  }

  async checkLoginStatus() {
    let result = await this.world.page?.evaluate(() => window.localStorage["wagmi.recentConnectorId"]);

    if (result == '"injected"') {
      result = true;
    } else {
      result = false;
    }
    return result;
  }

  async actualNetworkIsSepolia() {
    let result = await this.world.page?.evaluate(() => window.localStorage.lastSelectedEthereumNetwork);

    if (result == "sepolia") {
      result = true;
    } else {
      result = false;
    }
    return result;
  }
}
