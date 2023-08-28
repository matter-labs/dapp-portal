@redirection @regression @mainPage @authorized @smoke

Feature: External Redirection on the Main Page

  Background:
    Given Connect Metamask extension with login action

  @id1410
  Scenario Outline: Check redirection for the "View on Explorer" links (zkSync Era∎)
    Given I am on the Main page
    When I select the "<Network Name>" network
    When I click by "testId" with "account-dropdown" value
    When I click by text " View on explorer "
    Then Modal card element with the "//*[text()='View on explorer']" xpath should be "visible"
    When I click by the "<Modal card network>" text element on the Modal card
    Then New page has "<url>" address


    Examples:
      | Network Name       | Modal card network                | url                                                                                  |
      | zkSync Era Mainnet | //*[text()='zkSync Era∎ Mainnet'] | https://explorer.zksync.io/address/0x2CF4F78917A16C9584AeB5d4c5bD2713d724C75d        |
      | zkSync Era Mainnet | //*[text()='Ethereum Mainnet']    | https://etherscan.io/address/0x2CF4F78917A16C9584AeB5d4c5bD2713d724C75d              |
      | zkSync Era Testnet | //*[text()='zkSync Era∎ Goerli']  | https://goerli.explorer.zksync.io/address/0x2CF4F78917A16C9584AeB5d4c5bD2713d724C75d |
      | zkSync Era Testnet | //*[text()='Ethereum Goerli Testnet']     | https://goerli.etherscan.io/address/0x2CF4F78917A16C9584AeB5d4c5bD2713d724C75d       |

  @id1582
  Scenario Outline: Check redirection for the "View on Explorer" links (zkSync Lite∎)
    Given I am on the Main page
    When I select the "<Network Name>" network
    When I click by "testId" with "account-dropdown" value
    When I click by text " View on explorer "
    Then Modal card element with the "//*[text()='View on explorer']" xpath should be "visible"
    When I click by the "<Modal card network>" text element on the Modal card
    Then New page has "<url>" address


    Examples:
      | Network Name        | Modal card network                | url                                                                                   |
      | zkSync Lite Mainnet | //*[text()='zkSync Lite Mainnet'] | https://zkscan.io/explorer/accounts/0x2CF4F78917A16C9584AeB5d4c5bD2713d724C75d        |
      | zkSync Lite Mainnet | //*[text()='Ethereum Mainnet']    | https://etherscan.io/address/0x2CF4F78917A16C9584AeB5d4c5bD2713d724C75d               |
      | zkSync Lite Goerli  | //*[text()='zkSync Lite Goerli']  | https://goerli.zkscan.io/explorer/accounts/0x2CF4F78917A16C9584AeB5d4c5bD2713d724C75d |
      | zkSync Lite Goerli  | //*[text()='Ethereum Goerli Testnet']     | https://goerli.etherscan.io/address/0x2CF4F78917A16C9584AeB5d4c5bD2713d724C75d        |

  @id1535:I
  Scenario Outline: Check redirection for the Header links
    Given I am on the Main page
    When I click by "<Selector type>" with "<Selector value>" value
    Then New page has "<url>" address

    Examples:
      | Selector type | Selector value     | url                                                               |
      | aria-label    | Blog               | https://zksync.mirror.xyz/                                        |
      | aria-label    | Discord Community  | https://join.zksync.dev/                                          |
      | aria-label    | Telegram Support   | https://t.me/zksync                                               |
      | aria-label    | Twitter Community  | https://twitter.com/i/flow/login?redirect_after_login=%2Fzksync   |
      | aria-label    | Email              | https://zksync.io/contact                                         |

  @id1535:II
  Scenario: Check redirection for the Header links
    Given I am on the Main page
    When I click by "id" with "zk-sync-white-total" value
    Then Current page have "/" address

  @id1532
  Scenario: Check redirection for the Upper navigation menu - Build
    #Quickstart
    Given I hover the "text" element with " Build " value
    When I click by text " Quickstart "
    Then New page has "https://era.zksync.io/docs/dev/building-on-zksync/hello-world.html" address
    #Documentation
    Given I hover the "text" element with " Build " value
    When I click by text " Documentation "
    Then New page has "https://era.zksync.io/docs/" address
    #Web3 API
    Given I hover the "text" element with " Build " value
    When I click by text " Web3 API "
    Then New page has "https://era.zksync.io/docs/api/api.html" address
    #Guides: Contract deployment
    Given I hover the "text" element with " Build " value
    When I click by text " Contract deployment "
    Then New page has "https://era.zksync.io/docs/reference/architecture/contract-deployment.html" address
    #Guides: Bridging Assets
    Given I hover the "text" element with " Build " value
    When I click by text " Bridging assets "
    Then New page has "https://era.zksync.io/docs/reference/concepts/bridging-asset.html" address
    #Guides: Account abstraction
    Given I hover the "text" element with " Build " value
    When I click by text " Account abstraction "
    Then New page has "https://era.zksync.io/docs/dev/tutorials/custom-aa-tutorial.html" address
    #Guides: Building custom Paymasters
    Given I hover the "text" element with " Build " value
    When I click by text " Building custom Paymasters "
    Then New page has "https://era.zksync.io/docs/dev/tutorials/custom-paymaster-tutorial.html" address
    #Guides: Cross-chain governance
    Given I hover the "text" element with " Build " value
    When I click by text " Cross-chain governance "
    Then New page has "https://era.zksync.io/docs/dev/tutorials/cross-chain-tutorial.html" address
    #Tools: Cross-chain governance
    Given I hover the "text" element with " Build " value
    When I click by text " Javascript SDK "
    Then New page has "https://era.zksync.io/docs/api/js/" address
    #Tools: Hardhat plugins
    Given I hover the "text" element with " Build " value
    When I click by text " Hardhat plugins "
    Then New page has "https://era.zksync.io/docs/tools/hardhat/" address
    #Tools: zkSync Era CLI
    Given I hover the "text" element with " Build " value
    When I click by text " zkSync Era CLI "
    Then New page has "https://era.zksync.io/docs/tools/zksync-cli/" address

  @id1533
  Scenario: Check redirection for the Upper navigation menu - Learn
    #Freedom is our mission
    Given I hover the "text" element with " Learn " value
    When I click by text " Freedom is our mission "
    Then New page has "https://zksync.io/ethos" address
    #Hyperscalibility
    Given I hover the "text" element with " Learn " value
    When I click by text " Hyperscalibility "
    Then New page has "https://zksync.io/hyperscalability" address
    #Security
    Given I hover the "text" element with " Learn " value
    When I click by text " Security "
    Then New page has "https://zksync.io/security" address
    #Game-changing UX
    Given I hover the "text" element with " Learn " value
    When I click by text " Game-changing UX "
    Then New page has "https://zksync.io/ux" address

  @id1536
  Scenario: Check redirection for the Upper navigation menu - Network
    #ZKSYNC ERA (V2): Intro to zkSync Era
    Given I hover the "text" element with " Network " value
    When I click by text " Intro to zkSync Era "
    Then New page has "https://era.zksync.io/docs/reference/concepts/zkSync.html" address
    #ZKSYNC ERA (V2): Wallet Portal
    Given I hover the "text" element with " Network " value
    When I click by text " Wallet Portal "
    Then New page has "https://portal.zksync.io/" address
    #ZKSYNC ERA (V2): Block Explorer
    Given I hover the "text" element with " Network " value
    When I click by text " Block Explorer "
    Then New page has "https://explorer.zksync.io/" address
#    ZKSYNC LITE (V1): Intro to zkSync Lite
    Given I hover the "text" element with " Network " value
    When I click by text " Intro to zkSync Lite "
    Then New page has "https://docs.zksync.io/userdocs/intro/" address
    #ZKSYNC LITE (V1): Wallet Portal
    Given I hover the "text" element with " Network " value
    When I click by text " Wallet Portal "
    When I click by "href and text" with "'https://lite.zksync.io/' and 'Wallet Portal'" value
    Then New page has "https://lite.zksync.io/" address
#    #ZKSYNC LITE (V1): Block Explorer
    Given I hover the "text" element with " Network " value
    When I click by text " Block Explorer "
    When I click by "href and text" with "'https://zkscan.io/' and 'Block Explorer'" value
    Then New page has "https://zkscan.io/" address
    #ECOSYSTEM: Explore the Ecosystem
    Given I hover the "text" element with " Network " value
    When I click by text " Explore the Ecosystem "
    When I click by "href and text" with "'https://ecosystem.zksync.io' and  'Explore the Ecosystem'" value
    Then New page has "https://ecosystem.zksync.io/" address
    #ECOSYSTEM: Brand assets
    Given I hover the "text" element with " Network " value
    When I click by text " Brand assets "
    Then New page has "https://matterlabs.notion.site/zkSync-Brand-Resources-750bb7b1f3d14ebe9f539a86901c4a1c" address

  @id1485
  Scenario Outline: Check redirection for the "Swap" page links
    Given I go to page "/payments/?network=era-goerli"
    When I click by text "Swap"
    When I click by text "<Swap name>"
    Then New page has "<url>" address

    Examples:
      | Swap name         | url                                   |
      | Mute.io           | https://app.mute.io/swap              |
      | Maverick Protocol | https://app.mav.xyz/?chain=324        |
      | Velocore          | https://app.velocore.xyz/swap         |
      | SpaceFi           | https://swap-zksync.spacefi.io/#/swap |
      | eZKalibur         | https://dapp.ezkalibur.com/           |
      | veSync            | https://app.vesync.finance/swap       |
      | iZiSwap           | https://zksync.izumi.finance/swap     |

  @id1532
  Scenario: Check redirection for the Upper navigation menu - Build
    #Quickstart
    Given I hover the "text" element with " Build " value
    When I click by text " Quickstart "
    Then New page has "https://era.zksync.io/docs/dev/building-on-zksync/hello-world.html" address
    #Documentation
    Given I hover the "text" element with " Build " value
    When I click by text " Documentation "
    Then New page has "https://era.zksync.io/docs/" address
    #Web3 API
    Given I hover the "text" element with " Build " value
    When I click by text " Web3 API "
    Then New page has "https://era.zksync.io/docs/api/api.html" address
    #Guides: Contract deployment
    Given I hover the "text" element with " Build " value
    When I click by text " Contract deployment "
    Then New page has "https://era.zksync.io/docs/reference/architecture/contract-deployment.html" address
    #Guides: Bridging Assets
    Given I hover the "text" element with " Build " value
    When I click by text " Bridging assets "
    Then New page has "https://era.zksync.io/docs/reference/concepts/bridging-asset.html" address
    #Guides: Account abstraction
    Given I hover the "text" element with " Build " value
    When I click by text " Account abstraction "
    Then New page has "https://era.zksync.io/docs/dev/tutorials/custom-aa-tutorial.html" address
    #Guides: Building custom Paymasters
    Given I hover the "text" element with " Build " value
    When I click by text " Building custom Paymasters "
    Then New page has "https://era.zksync.io/docs/dev/tutorials/custom-paymaster-tutorial.html" address
    #Guides: Cross-chain governance
    Given I hover the "text" element with " Build " value
    When I click by text " Cross-chain governance "
    Then New page has "https://era.zksync.io/docs/dev/tutorials/cross-chain-tutorial.html" address
    #Tools: Cross-chain governance
    Given I hover the "text" element with " Build " value
    When I click by text " Javascript SDK "
    Then New page has "https://era.zksync.io/docs/api/js/" address
    #Tools: Hardhat plugins
    Given I hover the "text" element with " Build " value
    When I click by text " Hardhat plugins "
    Then New page has "https://era.zksync.io/docs/tools/hardhat/" address
    #Tools: zkSync Era CLI
    Given I hover the "text" element with " Build " value
    When I click by text " zkSync Era CLI "
    Then New page has "https://era.zksync.io/docs/tools/zksync-cli/" address

  @id1533
  Scenario: Check redirection for the Upper navigation menu - Learn
    #Freedom is our mission
    Given I hover the "text" element with " Learn " value
    When I click by text " Freedom is our mission "
    Then New page has "https://zksync.io/ethos" address
    #Hyperscalibility
    Given I hover the "text" element with " Learn " value
    When I click by text " Hyperscalibility "
    Then New page has "https://zksync.io/hyperscalability" address
    #Security
    Given I hover the "text" element with " Learn " value
    When I click by text " Security "
    Then New page has "https://zksync.io/security" address
    #Game-changing UX
    Given I hover the "text" element with " Learn " value
    When I click by text " Game-changing UX "
    Then New page has "https://zksync.io/ux" address

  @id1536
  Scenario: Check redirection for the Upper navigation menu - Network
    #ZKSYNC ERA (V2): Intro to zkSync Era
    Given I hover the "text" element with " Network " value
    When I click by text " Intro to zkSync Era "
    Then New page has "https://era.zksync.io/docs/reference/concepts/zkSync.html" address
    #ZKSYNC ERA (V2): Wallet Portal
    Given I hover the "text" element with " Network " value
    When I click by text " Wallet Portal "
    Then New page has "https://portal.zksync.io/" address
    #ZKSYNC ERA (V2): Block Explorer
    Given I hover the "text" element with " Network " value
    When I click by text " Block Explorer "
    Then New page has "https://explorer.zksync.io/" address
#    ZKSYNC LITE (V1): Intro to zkSync Lite
    Given I hover the "text" element with " Network " value
    When I click by text " Intro to zkSync Lite "
    Then New page has "https://docs.zksync.io/userdocs/intro/" address
    #ZKSYNC LITE (V1): Wallet Portal
    Given I hover the "text" element with " Network " value
    When I click by text " Wallet Portal "
    When I click by "href and text" with "'https://lite.zksync.io/' and 'Wallet Portal'" value
    Then New page has "https://lite.zksync.io/" address
#    #ZKSYNC LITE (V1): Block Explorer
    Given I hover the "text" element with " Network " value
    When I click by text " Block Explorer "
    When I click by "href and text" with "'https://zkscan.io/' and 'Block Explorer'" value
    Then New page has "https://zkscan.io/" address
    #ECOSYSTEM: Explore the Ecosystem
    Given I hover the "text" element with " Network " value
    When I click by text " Explore the Ecosystem "
    When I click by "href and text" with "'https://ecosystem.zksync.io' and  'Explore the Ecosystem'" value
    Then New page has "https://ecosystem.zksync.io/" address
    #ECOSYSTEM: Brand assets
    Given I hover the "text" element with " Network " value
    When I click by text " Brand assets "
    Then New page has "https://matterlabs.notion.site/zkSync-Brand-Resources-750bb7b1f3d14ebe9f539a86901c4a1c" address

  @id1649
  Scenario Outline: Check redirection for the "Send" page links
    Given I go to page "/transaction/zksync/era/?network=era-goerli"
    When I click by text "<Service name>"
    Then New page has "<url>" address

    Examples:
      | Service name    | url                                                                   |
      | Layerswap       | https://www.layerswap.io/app?sourceExchangeName=ZKSYNCERA_MAINNET     |
      | Orbiter         | https://www.orbiter.finance/?source=zkSync%20Era&dest=Ethereum        |
   
  @id1610
  Scenario: Check redirection for the "Explore ecosystem" button (Withdraw Bridge)
    Given I go to page "/bridge?network=era-goerli"
    When I click by text "Withdraw"
    When I choose "ETH" as token and insert "0.0000000001" as amount
    When I "confirm" transaction after clicking "Send to Ethereum Goerli Testnet" button
    Then Message "Transaction submitted" should be visible
    When I click by text " Explore ecosystem "
    Then New page has "https://ecosystem.zksync.io/" address
    