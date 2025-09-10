@deposit @regression @transactions @blockchain
Feature: Deposit

  Background:
    Given Connect Metamask extension with login action

  @id7854 @id1609 @id1607
  Scenario: Make a deposit on Bridge (Deposit)
    Given I go to page "/bridge"
    When I confirm the network switching
    Then Element with "id" "transaction-amount-input" should have "" "value"
    Then Element with "testId" "fee-amount" should be "visible"
    Then Fee "should" have "$" value
    Then Fee "should" have "ETH" value
    Then Element with "testId" "token-dropDown" should be "clickable"
    When I choose "ETH" as token and insert "0.0000000001" as amount
    Then Element with "text" " Continue " should be "clickable"
    Then I click by "text" with " Continue " value
    Then Element with "text" " I understand, proceed to bridge " should be "clickable"
    Then I click by "text" with " I understand, proceed to bridge " value
    When I "confirm" transaction after clicking "Bridge now" button
    Then Message "Transaction submitted" should be visible
    Then Element with "partial href" "https://sepolia.etherscan.io/tx/" should be "clickable"
    #id1607 Check "Transaction submitted" pop up Artifacts
    Then Element with "partial class" "transaction-progress-animation" should be "visible"
    Then Element with "partial class" "transaction-hash-button" should be "visible"
    #Token icon
    Then Element with "text" "Value:" should be "visible"
    Then Element with "partial text" "0.0000000001" should be "visible"
    Then Modal card element with the "//*[contains(@src, 'eth.svg')]" xpath should be "visible"
    Then Modal card element with the "//*[contains(text(), 'ETH')]" xpath should be "visible"
    Then Arrow element for "Deposit" external link should be "visible"
    Then Arrow element for "Deposit" external link should be "clickable"
    Then Element with "text" "From" should be "visible"
    Then Element with "text" "To" should be "visible"
    Then Element with "text" " Make another transaction " should be "visible"
    Then Element with "text" " Explore Ecosystem " should be "visible"
    #id1609 Check "Explore ecosystem" button  
    Then Element with "text" " Explore Ecosystem " should be "clickable" 
    Then I click by "text" with " Explore Ecosystem " value
    Then New page has "https://zksync.dappradar.com/" partial address
    