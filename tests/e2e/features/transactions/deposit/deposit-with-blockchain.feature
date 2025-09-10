@deposit @regression @transactions @blockchain
Feature: Deposit

  Background:
    Given Connect Metamask extension with login action

  @id1418 @id1396
  Scenario: Make a deposit in ETH
    Given I go to page "/bridge"
    When I confirm the network switching
    Then Element with "id" "transaction-amount-input" should have "" "value"
    Then Element with "testId" "fee-amount" should be "visible"
    Then Fee "should" have "$" value
    Then Fee "should" have "ETH" value
    When I choose "ETH" as token and insert "0.0000000001" as amount
    Then I click by "text" with " Continue " value
    Then I click by "text" with " I understand, proceed to bridge " value
    When I "confirm" transaction after clicking "Bridge now" button
    Then Message "Transaction submitted" should be visible
    Then Element with "partial href" "https://sepolia.etherscan.io/tx/" should be "clickable"
    # id1396
    Then Element with "text" " Assets " should be "visible"
    Then Element with "text" " Assets " should be "clickable"
    When I click by "text" with " Assets " value
    Then I am on the Assets page 
    
  @id1280
  Scenario: Deposit - Track status Link redirection
    Given I go to page "/bridge"
    When I confirm the network switching
    Then Element with "id" "transaction-amount-input" should have "" "value"
    Then Element with "testId" "fee-amount" should be "visible"
    Then Fee "should" have "$" value
    Then Fee "should" have "ETH" value
    Then Element with "testId" "token-dropDown" should be "clickable"
    When I choose "ETH" as token and insert "0.0000000001" as amount
    Then I click by "text" with " Continue " value
    Then I click by "text" with " I understand, proceed to bridge " value
    When I "confirm" transaction after clicking "Bridge now" button
    Then Message "Transaction submitted" should be visible
    Then Element with "partial href" "https://sepolia.etherscan.io/tx/" should be "clickable"
    Then Modal card element with the "//a[contains(normalize-space(), 'Explorer')]" xpath should be "visible"
    Then Modal card element with the "//a[contains(normalize-space(), 'Explorer')]" xpath should be "clickable"
    When I click by the "//a[contains(normalize-space(), 'Explorer')]" text element on the Modal card
    Then New page has "https://sepolia.etherscan.io/tx/" partial address

  @id1394
  Scenario: Reject Deposit transaction
    Given I go to page "/bridge"
    When I confirm the network switching
    Then Element with "id" "transaction-amount-input" should have "" "value"
    Then Element with "testId" "fee-amount" should be "visible"
    Then Fee "should" have "$" value
    Then Fee "should" have "ETH" value
    Then Element with "testId" "token-dropDown" should be "clickable"
    When I choose "ETH" as token and insert "0.0000000001" as amount
    Then I click by "text" with " Continue " value
    Then I click by "text" with " I understand, proceed to bridge " value
    When I "reject" transaction after clicking "Bridge now" button
    Then Element with "text" "Bridge now" should be "visible"
    Then Element with "text" "Bridge now" should be "clickable"
