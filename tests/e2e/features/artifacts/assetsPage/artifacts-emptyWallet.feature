@artifacts @regression @assetsPage @emptyWallet @various
Feature: Artifacts - UI

  Background:
    Given Connect Metamask extension with login action


  @id1332
  Scenario: Check artifacts for an empty wallet
    Then A wallet should be "empty"
    Then Message " You don't have any balances on " should be visible
    Then Message "zkSync Era Testnet" should be visible
    Then Message " Proceed to " should be visible
    Then Message "Add funds" should be visible
    Then Message " page to add balance to your account " should be visible
    Then Element with "href and text" "'/transaction/zksync/era/receive' and 'Add funds'" should be "visible"
    Then Element with "href and text" "'/transaction/zksync/era/receive' and 'Add funds'" should be "clickable"
    Then Element with "href and text" "'/balances' and 'View all'" should be "visible"
    Then Element with "href and text" "'/balances' and 'View all'" should be "clickable"

  @tokens @emptyWallet
  Scenario Outline: Check artifacts on tokens dropdown on Deposit/Withdraw/Transfer page for Empty Wallet
    Given I go to page "<network>"
    Then I click by "testId" with "token-dropDown" value
    Then Element with "text" "Choose token" should be "visible"
    Then Element with "text" "Zero balances" should be "visible"
    Then Element with "class" "token-balance-amount" should be "visible"
    Then Element with "text" "0" should be "visible"

    Examples:
      | network                                                                                                  |
      | /transaction/zksync/era/deposit/?network=era-mainnet&address=0x47BCD42B8545c23031E9918c3D823Be4100D4e87  |
      | /transaction/zksync/era/deposit/?network=era-goerli&address=0x47BCD42B8545c23031E9918c3D823Be4100D4e87   |
      | /transaction/zksync/era/send/?network=era-mainnet&address=0x47BCD42B8545c23031E9918c3D823Be4100D4e87     |
      | /transaction/zksync/era/send/?network=era-goerli&address=0x47BCD42B8545c23031E9918c3D823Be4100D4e87      |
      | /transaction/zksync/era/withdraw/?network=era-mainnet&address=0x47BCD42B8545c23031E9918c3D823Be4100D4e87 |
      | /transaction/zksync/era/withdraw/?network=era-goerli&address=0x47BCD42B8545c23031E9918c3D823Be4100D4e87  |
