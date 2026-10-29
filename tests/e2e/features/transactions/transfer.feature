@transfer @regression @transactions 
Feature: Transfer

  Background:
    Given Connect Metamask extension with login action

  @id1321
  Scenario: Make a transfer in ETH
    Given I am on the Main page
    When I go to page "/send?address=0xF649f392289F80752B0aDdD90058a8248b5026fE"
    When I confirm the network switching
    Then Element with "testId" "token-dropDown" should be "clickable"
    When I choose "ETH" as token and insert "0.0000000001" as amount
    Then I click by "text" with " Continue " value
    When I "confirm" transaction after clicking "Send now" button
    Then Message "Transaction submitted" should be visible
    Then Message "Transaction completed" should be visible
    Then Element with "text" " Go to Assets page " should be "visible"
    Then Element with "text" " Go to Assets page " should be "clickable"
    Then Element with "text" " Make another transaction " should be "visible"
    Then Element with "text" " Make another transaction " should be "clickable"
    Then Arrow element for "Transfer" external link should be "visible"
    Then Arrow element for "Transfer" external link should be "clickable"

  @id1276 @groupthree
  Scenario: Reject a transfer transaction
    Given I am on the Main page
    When I go to page "/send?address=0xF649f392289F80752B0aDdD90058a8248b5026fE"
    When I confirm the network switching
    When I choose "ETH" as token and insert "0.0000000001" as amount
    Then I click by "text" with " Continue " value
    When I "reject" transaction after clicking "Send now" button
    Then Element with "text" "Send now" should be "visible"

