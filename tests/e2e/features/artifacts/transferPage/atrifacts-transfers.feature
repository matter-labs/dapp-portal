@artifacts @regression @transferPage
Feature: Artifacts - UI

  Background:
    Given Connect Metamask extension with login action


  @id1646:I @tokens @testnet
  Scenario: Check artifacts on tokens dropdown on Transfer page (Testnet)
    Given I go to page "/transaction/zksync/era/send?network=era-goerli&address=0x47BCD42B8545c23031E9918c3D823Be4100D4e87"
    Then I click by "testId" with "token-dropDown" value
    Then Element with "text" "Choose token" should be "visible"
    Then Element with "placeholder" "Symbol or address" should be "visible"
    Then Element with "class" "token-balance-amount" should be "visible"
    Then Element with "class" "token-balance-price" should be "visible"

  @id1646:II @tokens @testnet
  Scenario Outline: Check artifacts on tokens dropdown on Transfer page (Testnet)
    Given I go to page "/transaction/zksync/era/send?network=era-goerli&address=0x47BCD42B8545c23031E9918c3D823Be4100D4e87"
    Then I click by "testId" with "token-dropDown" value
    Then Element with "text" "<TokenName>" should be "visible"
    Then Element with "partial src" "<img>" should be "visible"
    Then Element with "text" "<TokenAddress>" should be "visible"

    Examples:
      | TokenName | TokenAddress   | img      |
      | ETH       | 0x000000...00A | eth.svg  |
      | DAI       | 0x3e7676...D4b | dai.svg  |
      | LINK      | 0x406091...c78 | link.svg |
      | USDC      | 0x0faF6d...2A9 | usdc.svg |
      | wBTC      | 0x0BfcE1...e9c | wbtc.svg |


  @id1645 @tokens @mainnet
  Scenario: Check artifacts on tokens dropdown on Transfer page (Mainnet)
    Given I go to page "/transaction/zksync/era/send?network=era-mainnet&address=0x47BCD42B8545c23031E9918c3D823Be4100D4e87"
    Then Element with "testId" "token-dropDown" should be "clickable"
    Then I click by "testId" with "token-dropDown" value
    Then Element with "text" "Choose token" should be "visible"
    Then Element with "placeholder" "Symbol or address" should be "visible"
    Then Element with "class" "token-balance-amount" should be "visible"
    #ETH
    Then Element with "text" "ETH" should be "visible"
    Then Element with "text" "0x000000...00A" should be "visible"
    Then Element with "partial src" "eth.svg" should be "visible"
    #USDC
    Then Element with "text" "USDC" should be "visible"
    Then Element with "text" "0x3355df...af4" should be "visible"
    Then Element with "partial src" "usdc.svg" should be "visible"
    #MUTE
    Then Element with "text" "MUTE" should be "visible"
    Then Element with "text" "0x0e97C7...d42" should be "visible"
    Then Element with "partial src" "mute.svg" should be "visible"
    #COMBO
    Then Element with "text" "COMBO" should be "visible"
    Then Element with "text" "0xc2B13B...8E3" should be "visible"
    Then Element with "partial src" "combo.svg" should be "visible"
    #PERP
    Then Element with "text" "PERP" should be "visible"
    Then Element with "text" "0x42c1c5...601" should be "visible"
    Then Element with "partial src" "perp.svg" should be "visible"
    #LUSD
    Then Element with "text" "LUSD" should be "visible"
    Then Element with "text" "0x503234...115" should be "visible"
    Then Element with "partial src" "lusd.svg" should be "visible"
    #DVF
    Then Element with "text" "DVF" should be "visible"
    Then Element with "text" "0xBbD1bA...716" should be "visible"
    Then Element with "partial src" "dvf.svg" should be "visible"
    #WOO
    Then Element with "text" "WOO" should be "visible"
    Then Element with "text" "0x9E22D7...159" should be "visible"
    Then Element with "partial src" "woo.svg" should be "visible"
    #xcRMRK
    Then Element with "text" "xcRMRK" should be "visible"
    Then Element with "text" "0x6F1A89...545" should be "visible"
    Then Element with "partial src" "xcrmrk.svg" should be "visible"
    #DERI
    Then Element with "text" "DERI" should be "visible"
    Then Element with "text" "0x140D5b...803" should be "visible"
    Then Element with "partial src" "deri.svg" should be "visible"
    #DEXTF
    Then Element with "text" "DEXTF" should be "visible"
    Then Element with "text" "0x9929bC...e41" should be "visible"
    Then Element with "partial src" "dextf.svg" should be "visible"
    #GOVI
    Then Element with "text" "GOVI" should be "visible"
    Then Element with "text" "0xD63eF5...044" should be "visible"
    Then Element with "partial src" "govi.svg" should be "visible"
    #1INCH
    Then Element with "text" "1INCH" should be "visible"
    Then Element with "text" "0x3f0B8B...e59" should be "visible"
    Then Element with "partial src" "1inch.svg" should be "visible"
    #SIS
    Then Element with "text" "SIS" should be "visible"
    Then Element with "text" "0xdd9f72...827" should be "visible"
    Then Element with "partial src" "sis.svg" should be "visible"
    #LQTY
    Then Element with "text" "LQTY" should be "visible"
    Then Element with "text" "0xf755cF...401" should be "visible"
    Then Element with "partial src" "lqty.svg" should be "visible"
    #PEPE
    Then Element with "text" "PEPE" should be "visible"
    Then Element with "text" "0xFD282F...c71" should be "visible"
    Then Element with "partial src" "pepe.svg" should be "visible"
    #rETH
    Then Element with "text" "rETH" should be "visible"
    Then Element with "text" "0x32Fd44...806" should be "visible"
    Then Element with "partial src" "reth.svg" should be "visible"
    #RPL
    Then Element with "text" "RPL" should be "visible"
    Then Element with "text" "0x1CF855...5BC" should be "visible"
    Then Element with "partial src" "rpl.svg" should be "visible"
    #UFI
    Then Element with "text" "UFI" should be "visible"
    Then Element with "text" "0xa0C1BC...dAE" should be "visible"
    Then Element with "partial src" "ufi.svg" should be "visible"
    #cbETH
    Then Element with "text" "cbETH" should be "visible"
    Then Element with "text" "0x75Af29...ED5" should be "visible"
    Then Element with "partial src" "cbeth.svg" should be "visible"
    #RAISE
    Then Element with "text" "RAISE" should be "visible"
    Then Element with "text" "0x3D79F1...46f" should be "visible"
    Then Element with "partial src" "raise.svg" should be "visible"
    #LSD
    Then Element with "text" "LSD" should be "visible"
    Then Element with "text" "0x458A2E...bD4" should be "visible"
    Then Element with "partial src" "lsd.svg" should be "visible"
    #ETHx
    Then Element with "text" "ETHx" should be "visible"
    Then Element with "text" "0x668cc2...39c" should be "visible"
    Then Element with "partial src" "ethx.svg" should be "visible"
    #WBTC
    Then Element with "text" "WBTC" should be "visible"
    Then Element with "text" "0xBBeB51...011" should be "visible"
    Then Element with "partial src" "wbtc.svg" should be "visible"
    #KNC
    Then Element with "text" "KNC" should be "visible"
    Then Element with "text" "0x6ee46C...3e6" should be "visible"
    Then Element with "partial src" "wbtc.svg" should be "visible"
    #BEL
    Then Element with "text" "BEL" should be "visible"
    Then Element with "text" "0xB83CFB...2D9" should be "visible"
    Then Element with "partial src" "bel.png" should be "visible"
    #ZZ
    Then Element with "text" "ZZ" should be "visible"
    Then Element with "text" "0x1ab721...184" should be "visible"
    Then Element with "partial src" "zz.png" should be "visible"

  @id1364 @Transfer
  Scenario: Check artifacts on the Send to page - Transfer
    Given I am on the Main page
    When I go to page "/transaction/zksync/era/send/?network=era-goerli"
    When I fill the "//*[@placeholder='Address or ENS or contact name']" input field by "foundation.eth"
    Then Element with "text" "0x47BC...e87" should be "visible"
    When I click on the Add contact button for found contact
    When I confirm the network switching
    Then Element with "text" "Send to" should be "visible"
    Then Element with "id" "amount-input" should be "visible"
    Then Element with "text" " Balance: " should be "visible"
    Then Element with "class" "break-all" should be "visible"
    Then Element with "partial text" "Max" should be "visible"
    Then Element with "partial text" "Max" should be "clickable"
    Then Element with "placeholder" "0" should be "visible"
    Then Element with "testId" "token-dropDown" should be "visible"
    Then Element with "testId" "token-dropDown" should be "clickable"
    Then Element with "testId" "fee-amount" should be "visible"
    Then Fee should have "$" value
    Then Fee should have "ETH" value
    Then Circle timer for fee updating should be visible
    Then Element with "text" " Continue " should be "visible"

  @id1566 @Transfer
  Scenario: Check artifacts on the Confirm transaction modal - Transfer
    Given I am on the Main page
    When I go to page "/transaction/zksync/era/send/?network=era-goerli"
    When I fill the "//*[@placeholder='Address or ENS or contact name']" input field by "foundation.eth"
    Then Element with "text" "0x47BC...e87" should be "visible"
    When I click on the Add contact button for found contact
    When I confirm the network switching
    When I choose "ETH" as token and insert "0.0001" as amount
    Then Element with "text" " Continue " should be "clickable"
    When I click by text " Continue "
    Then Element with "text" "Confirm transaction" should be "visible"
    Then Element with "text" "Your zkSync Era Testnet account" should be "visible"