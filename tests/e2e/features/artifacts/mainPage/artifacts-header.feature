@artifacts @regression @header
Feature: Artifacts - UI

  Background:
    Given Connect Metamask extension with login action

  @id1363 @loginPage
  Scenario: Check artifacts on the Login page
    Given I'm logged out
    Then Element with "text" "Connect your Ethereum wallet to zkSync Portal" should be "visible"
    Then Element with "testId" "network-switcher" should be "visible"
    Then Element with "title" "zkSync Portal GitHub page" should be "visible"

  @id1534
  Scenario: Check artifacts on the Header
    Given I am on the Main page
    Then Element with "href" "/" should be "visible"
    Then Element with "href" "/" should be "clickable"
    Then Element with "aria-label" "Medium Blog" should be "visible"
    Then Element with "aria-label" "Medium Blog" should be "clickable"
    Then Element with "aria-label" "Discord Community" should be "visible"
    Then Element with "aria-label" "Discord Community" should be "clickable"
    Then Element with "aria-label" "Telegram Support" should be "visible"
    Then Element with "aria-label" "Telegram Support" should be "clickable"
    Then Element with "aria-label" "Twitter Community" should be "visible"
    Then Element with "aria-label" "Twitter Community" should be "clickable"
    Then Element with "aria-label" "Email" should be "visible"
    Then Element with "aria-label" "Email" should be "clickable"

  @id1428
  Scenario: Check artifacts on the Receive page
    Given I am on the Main page
    When I go to page "/transaction/zksync/era/receive"
    Then Element with "text" "Receive" should be "visible"
    Then Element with "text" "Official bridge" should be "visible"
    Then Element with "text" "Add funds using official bridge" should be "visible"
    Then Element with "href" "/transaction/zksync/era/deposit" should be "visible"
    Then Element with "href" "/transaction/zksync/era/deposit" should be "clickable"
    Then Element with "text" "View address" should be "visible"
    Then Element with "text" "Receive from another account" should be "visible"
    Then Element with "href" "/transaction/zksync/era/receive-address" should be "visible"
    Then Element with "href" "/transaction/zksync/era/receive-address" should be "clickable"
    Then Element with "text" "Receive test tokens" should be "visible"
    Then Element with "text" "Use official faucet to get test tokens" should be "visible"
    Then Element with "href" "/transaction/zksync/era/faucet" should be "visible"
    Then Element with "href" "/transaction/zksync/era/faucet" should be "clickable"
    Then Element with "text" "Top-up with cash" should be "visible"
    Then Element with "text" "Ramp" should be "visible"
    Then Element with "href" "https://ramp.network/buy/" should be "visible"
    Then Element with "href" "https://ramp.network/buy/" should be "clickable"
    Then Element with "text" "Top-up from another network" should be "visible"
    Then Element with "text" "Layerswap" should be "visible"
    Then Element with "href" "https://www.layerswap.io/?destNetwork=ZKSYNCERA_MAINNET" should be "visible"
    Then Element with "text" "Orbiter" should be "visible"
    Then Element with "href" "https://www.orbiter.finance/?dest=zkSync%20Era" should be "clickable"

  @id1352
  Scenario: Check artifacts on the Receive Address (QR) page
    Given I am on the Main page
    When I go to page "/transaction/zksync/era/receive-address"
    Then Element with "text" "Receive" should be "visible"
    Then Element with "class" "qr-code-container" should be "visible"
    Then Element with "text" "0xa439ba...046" should be "visible"
    Then Element with "text" "Scan to copy address" should be "visible"
    Then Element with "text" "Copy" should be "visible"
    Then Element with "text" "Copy" should be "clickable"
    Then Element with "text" " Please transfer funds to this address using " should be "visible"
    Then Element with "text" "zkSync Era∎ Goerli" should be "visible"
    Then Element with "text" " to successfully receive them " should be "visible"