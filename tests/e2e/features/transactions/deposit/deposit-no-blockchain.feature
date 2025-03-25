@deposit @regression @transactions @noblockchain
Feature: Deposit

  Background:
    Given Connect Metamask extension with login action


  @id1539 
  Scenario: Deposit - Receive - [Transaction] insufficient funds > max balance
    Given I am on the Main page
    When I confirm the network switching
    Then Element with "id" "transaction-amount-input" should have "" "value"
    Then Element with "testId" "fee-amount" should be "visible"
    Then Fee "should" have "$" value
    Then Fee "should" have "ETH" value
    Then Element with "testId" "token-dropDown" should be "clickable"
    When I choose "ETH" as token and insert "100000000" as amount
    When Element with "partial class" "has-error" should be "visible"
    When Element with "text" " Max amount is " should be "visible"
    When Element with "text" " Continue " should be "disabled" 
    When I save Max Balance Error Value 
    When I click on the underlined Max amount number
    Then Max amount is set to the input field
    Then Element with "partial class" "has-error" should be "invisible"  
    
  @id1427 
  Scenario: Where to add funds - Receive - [WF] Check for Mistakes
    Given I go to page "/bridge?network=sepolia"
    Then Element with "partial text" "To your account " should be "visible"
    Then Element with "testId" "change-account-button" should be "visible"
    Then I click by "testId" with "change-account-button" value
    Then Element with "id" "transaction-address-input" should be "visible"
    When I fill the input field contains "placeholder" type "Address or ENS" value with "0x8f0f44583aQ6908f7f933cd6f0aae382ac3fd8f6" text
    Then Element with "text" "Invalid Ethereum 0x address" should be "visible"  
    When I fill the input field contains "placeholder" type "Address or ENS" value with "0x8f0f44583a6908f7f933cd6f0aae382ac3fd8f6" text
    Then Element with "text" "Invalid Ethereum 0x address" should be "visible" 
    When I fill the input field contains "placeholder" type "Address or ENS" value with "0x8f0f44583a$6908f7f933cd6f0aae382ac3fd8f6" text
    Then Element with "text" "Invalid Ethereum 0x address" should be "visible"  
    When I fill the input field contains "placeholder" type "Address or ENS" value with "0x8f0F33583a56908F7F933cd6F0AaA382aC3fd8f6" text
    Then Element with "text" "Invalid Ethereum 0x address" should be "visible"
    When I fill the input field contains "placeholder" type "Address or ENS" value with "1231231231212312312314235346454756745635345345345399" text 
    Then Element with "placeholder" "Address or ENS" should have "123123123121231231231423534645475674563534" "value"

  @id1331 
  Scenario: Deposit - Send - [WF] Check Fee value
    Given I go to page "/bridge?network=sepolia"
    When I confirm the network switching
    Then Element with "id" "transaction-amount-input" should have "" "value"
    Then Element with "testId" "token-dropDown" should be "clickable"
    When I choose "ETH" as token and insert "1" as amount
    Then Element with "testId" "fee-amount" should be "visible"
    Then Fee "should" have "$" value
    Then Fee "should" have "ETH" value
    When I choose "UNI" as token and insert "1" as amount
    Then Element with "testId" "fee-amount" should be "visible"
    Then Fee "should" have "$" value
    Then Fee "should" have "ETH" value
    When I hover the "alt" element with "ETH token icon" value
    Then Element with "text" "Click to toggle how amount is displayed" should be "visible"
    When I click by "alt" with "ETH token icon" value
    Then Fee "should not" have "$" value
    When I click by "alt" with "ETH token icon" value
    Then Fee "should" have "$" value
    
  @id1325
  Scenario: Deposit - Send 0 funds
    Given I go to page "/bridge?network=sepolia"
    When I confirm the network switching
    Then Element with "id" "transaction-amount-input" should have "" "value"
    Then Element with "testId" "token-dropDown" should be "clickable"
    When I choose "ETH" as token and insert "0" as amount
    Then Element with "text" " Continue " should be "disabled"
