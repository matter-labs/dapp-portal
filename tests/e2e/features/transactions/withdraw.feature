@withdraw @regression @transactions @bridgePage
Feature: Withdraw

  Background:
    Given Connect Metamask extension with login action

  @id1333
  Scenario: Make a withdraw in ETH
    Given I go to page "/bridge/withdraw"
    When I confirm the network switching
    Then Element with "testId" "token-dropDown" should be "clickable"
    When I choose "ETH" as token and insert "0.0000000001" as amount
    Then I click by "text" with " Continue " value
    When I "confirm" transaction after clicking "Bridge now" button
    Then Message "Transaction submitted" should be visible

  @id1274
  Scenario: Withdraw - Send - [Transaction] 0 funds
    Given I go to page "/bridge/withdraw"
    Then Element with "text" "ZKsync Sepolia Testnet" should be "clickable"
    When I confirm the network switching
    When I insert "0" as amount
    Then Element with "text" " Continue " should be "disabled"


  @id1290
  Scenario: Withdraw - Send - [Transaction] 0 funds
    Given I go to page "/bridge/withdraw"
    Then Element with "text" "ZKsync Sepolia Testnet" should be "clickable"
    When I confirm the network switching
    Then Element with "xpath" "//button[contains(@title, 'Your max amount is ')]" should be "clickable"
    Then Element with "xpath" "//button[contains(@title, 'Your max amount is ')]" should be "clickable"
    When I click by "xpath" with "//button[contains(@title, 'Your max amount is ')]" value
    Then Element with "title" "Max amount is set" should be "visible"

  @id1554
  Scenario: Withdraw - Bridge - [Transaction] 
    Given I go to page "/bridge/withdraw"
    When I confirm the network switching
    Then Element with "testId" "token-dropDown" should be "clickable"
    When I choose "ETH" as token and insert "10000" as amount
    When Element with "partial class" "has-error" should be "visible"
    When Element with "text" " Max amount is " should be "visible"
    When Element with "text" " Continue " should be "disabled" 
    When I save Max Balance Error Value 
    When I click on the underlined Max amount number
    Then Max amount is set to the input field
    Then Element with "partial class" "has-error" should be "invisible"  

  @id1601 @id1608 @id1694
  Scenario: make a Withdraw (Bridge)
    Given I go to page "/bridge/withdraw"
    When I confirm the network switching
    Then Element with "testId" "token-dropDown" should be "clickable"
    When I choose "ETH" as token and insert "0.0000000001" as amount
    Then I click by "text" with " Continue " value
    When I "confirm" transaction after clicking "Bridge now" button
    Then Message "Transaction submitted" should be visible
    #Part 2 - Transaction submitted" pop up artifacts id1608
    Then Element with "partial class" "transaction-progress-animation" should be "visible"
    Then Element with "partial class" "transaction-hash-button" should be "visible"
    #Time of tx
    Then Element with "text" "Value:" should be "visible"
    Then Element with "partial text" "0.0000000001" should be "visible"
    Then Modal card element with the "//*[contains(text(), 'ETH')]" xpath should be "visible"
    #Token icon
    Then Modal card element with the "//*[contains(@src, 'eth.svg')]" xpath should be "visible"
    Then Arrow element for "Withdraw" external link should be "visible"
    Then Arrow element for "Withdraw" external link should be "clickable"
    Then Element with "text" " You will have to claim your withdrawal once it's processed. Claiming will require paying the fee on the Ethereum Sepolia Testnet network. " should be "visible"
    Then Element with "text" "From" should be "visible"
    Then Element with "text" "To" should be "visible"
    Then Element with "text" " Make another transaction " should be "visible"
    #id1694
    #Techincal step
    Then I click by text " Make another transaction "
    # Click on "Recent withdrawals" section
    Then I click by text " Transfers "
    #Each record has next information:
    Then Element with "text" "Transfers" should be "visible"
    Then Element with "text" "Bridged" should be "visible"
    Then Element with "partial class" "animate-spin" should be "visible"
    # Amount information:
    Then Element with "class" "button-line-body-info-secondary" should be "visible"
    
