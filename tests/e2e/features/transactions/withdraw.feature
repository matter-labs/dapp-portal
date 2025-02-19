@withdraw @regression @transactions @bridgePage
Feature: Withdraw

  Background:
    Given Connect Metamask extension with login action

  @id1333 @id1434
  Scenario: Make a withdraw in ETH
    #first part - id1333
    Given I go to "Withdraw" transaction section
    Given I click by "text" with "Your account" value
    When I choose "ETH" as token and insert "0.0000000001" as amount
    When I "confirm" transaction after clicking "Send to Ethereum Goerli Testnet" button
    Then Message "Transaction submitted" should be visible
    #second part - id1434
#    Then Element with "xpath" "//*[@class='modal-card']//a[@href='/']" should be "clickable"
#    When I click by "xpath" with "//*[@class='modal-card']//a[@href='/']" value
#    Then Element with "xpath" "//h1[text()='Assets']" should be "visible"

  @id1274
  Scenario: Withdraw - Send - [Transaction] 0 funds
    # Given I click by "text" with "ZKsync Era∎" value
    When I go to "Withdraw" transaction section
    When I click by "text" with "Your account" value
    When I insert "0" as amount
    When I confirm the network switching
    Then Element with "text" " Continue " should be "disabled"


  @id1290
  Scenario: Withdraw - Send - [Transaction] 0 funds
    When I go to "Withdraw" transaction section
    When I click by "text" with "Your account" value
    Then Element with "class" "amount-input-max-button" should be "clickable"
    When I click by "text" with " Max " value
    Then Element with "title" "Max amount is set" should be "visible"

  @id1554
  Scenario: Withdraw - Bridge - [Transaction] insufficient funds
    Given I am on the Main page
    Given I go to "Withdraw" transaction section
    Given I click by "text" with "Your account" value
    When I choose "ETH" as token and insert "10000" as amount
    When I confirm the network switching
    Then Element with "partial class" "has-error" should be "enabled"
    Then Element with "text" " Max " should be "visible"
    Then Element with "text" " Max " should be "clickable"
    Then Element with "text" " Continue " should be "disabled"
    When I click by text " Max "
    Then Element with "partial class" "has-error" should be "invisible"

  @id1327
  Scenario: Withdraw - Bridge - [WF] Withdraw
    Given I am on the Main page
    Given I go to "Withdraw" transaction section
    Given I click by "text" with "Your account" value
    When I confirm the network switching
    When I choose "ETH" as token and insert "0.0001" as amount
    #check an available balance
    Then Element with "class" "break-all" should be "visible"
    When I click by text " Max "
    Then Element with "class" "amount-input-token" should be "visible"
    Then Element with "class" "amount-input-token" should be "clickable"

  @id1601 @id1608 @id1694
  Scenario: make a Withdraw (Bridge)
    Given I go to page "/bridge?network=era-goerli"
    When I click by text "Withdraw"
    When I choose "ETH" as token and insert "0.0000000001" as amount
    When I "confirm" transaction after clicking "Send to Ethereum Goerli Testnet" button
    Then Message "Transaction submitted" should be visible
    #Part 2 - Transaction submitted" pop up artifacts id1608
    Then Element with "partial class" "progress-plane-animation" should be "visible"
    Then Element with "partial href and text" "'https://goerli.explorer.zksync.io/tx' and 'Withdraw'" should be "visible"
    # Then Element with "partial href and text" "'https://goerli.explorer.zksync.io/tx' and 'Withdraw'" should be "clickable"
    #Time of tx
    Then Element with "class" "button-line-body-info-underline" should be "visible"
    Then Element with "text" "0.0000000001" should be "visible"
    Then Modal card element with the "//*[text()='ETH']" xpath should be "visible"
    #Token icon
    Then Modal card element with the "//*[contains(@src, 'eth.svg')]" xpath should be "visible"
    Then Modal card element with the "//*[text()='<$0.01']" xpath should be "visible"
    Then Arrow element for "Withdraw" external link should be "visible"
    Then Arrow element for "Withdraw" external link should be "clickable"
    Then Element with "text" " Your funds will be available on the " should be "visible"
    Then Element with "text" "Ethereum Goerli Testnet" should be "visible"
    Then Element with "text" " after a " should be "visible"
    Then Element with "text" "~5+ hour delay" should be "visible"
    Then Element with "text" ". During this time, the transaction will be processed and finalized. You are free to close this page. " should be "visible"
    Then Element with "text" " Learn more " should be "visible"
    Then Element with "text" " Learn more " should be "clickable"
    Then Element with "text" " Make another transaction " should be "visible"
    Then Element with "text" " Explore ecosystem " should be "visible"
    #id1694
    #Techincal step
    Then I click by text " Make another transaction "
    When I click by text "Withdraw"
    # Recent withdrawal section contains:
    Then Element with "text" "Recent withdrawals " should be "visible"
    Then Element with "text" "Recent withdrawals " should be "clickable"
    Then Element with "testId" "withdraw-amount" should be "visible"
    # Click on "Recent withdrawals" section
    Then I click by text "Recent withdrawals"
    #Each record has next information:
    Then Element with "text" "Withdraw" should be "visible"
    Then Element with "class" "transaction-line-item-icon-container" should be "visible"
    Then Element with "testId" "withdraw-date" should be "visible"
    Then Element with "text" "Status: " should be "visible"
    Then Element with "text" " In Progress." should be "visible"
    Then Element with "testId" "withdraw-timer" should be "visible"
    # Amount information:
    Then Element with "text" "0.0000000001" should be "visible"
    Then Element with "partial src" "eth.svg" should be "visible"
    Then Element with "text" "ETH" should be "visible"
    Then Element with "text" "<$0.01" should be "visible"
    
