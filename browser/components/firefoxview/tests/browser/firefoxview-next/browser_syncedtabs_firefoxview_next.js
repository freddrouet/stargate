/* Any copyright is dedicated to the Public Domain.
 * http://creativecommons.org/publicdomain/zero/1.0/ */

/* import-globals-from ../head.js */

add_setup(async function () {
  registerCleanupFunction(() => {
    // reset internal state so it doesn't affect the next tests
    TabsSetupFlowManager.resetInternalState();
  });

  // gSync.init() is called in a requestIdleCallback. Force its initialization.
  gSync.init();

  registerCleanupFunction(async function () {
    await tearDown(gSandbox);
  });
  await SpecialPowers.pushPrefEnv({
    set: [["browser.tabs.firefox-view-next", true]],
  });
});

add_task(async function test_unconfigured_initial_state() {
  const sandbox = setupMocks({
    state: UIState.STATUS_NOT_CONFIGURED,
    syncEnabled: false,
  });
  await withFirefoxView({}, async browser => {
    const { document } = browser.contentWindow;
    await navigateToCategoryAndWait(document, "syncedtabs");
    Services.obs.notifyObservers(null, UIState.ON_UPDATE);

    let syncedTabsComponent = document.querySelector(
      "view-syncedtabs:not([slot=syncedtabs])"
    );

    let emptyState =
      syncedTabsComponent.shadowRoot.querySelector("fxview-empty-state");
    ok(
      emptyState.getAttribute("headerlabel").includes("syncedtabs-signin"),
      "Signin message is shown"
    );

    // Test telemetry for signing into Firefox Accounts.
    await clearAllParentTelemetryEvents();
    EventUtils.synthesizeMouseAtCenter(
      emptyState.querySelector(`button[data-action="sign-in"]`),
      {},
      browser.contentWindow
    );
    await TestUtils.waitForCondition(
      () =>
        Services.telemetry.snapshotEvents(
          Ci.nsITelemetry.DATASET_PRERELEASE_CHANNELS
        ).parent?.length >= 1,
      "Waiting for fxa_continue firefoxview_next telemetry event.",
      200,
      100
    );
    TelemetryTestUtils.assertEvents(
      [["firefoxview_next", "fxa_continue", "sync"]],
      { category: "firefoxview_next" },
      { clear: true, process: "parent" }
    );
    await BrowserTestUtils.removeTab(browser.ownerGlobal.gBrowser.selectedTab);
  });
  await tearDown(sandbox);
});

add_task(async function test_signed_in() {
  const sandbox = setupMocks({
    state: UIState.STATUS_SIGNED_IN,
    fxaDevices: [
      {
        id: 1,
        name: "This Device",
        isCurrentDevice: true,
        type: "desktop",
        tabs: [],
      },
    ],
  });

  await withFirefoxView({}, async browser => {
    const { document } = browser.contentWindow;
    await navigateToCategoryAndWait(document, "syncedtabs");
    Services.obs.notifyObservers(null, UIState.ON_UPDATE);

    let syncedTabsComponent = document.querySelector(
      "view-syncedtabs:not([slot=syncedtabs])"
    );
    await TestUtils.waitForCondition(() => syncedTabsComponent.fullyUpdated);
    let emptyState =
      syncedTabsComponent.shadowRoot.querySelector("fxview-empty-state");
    ok(
      emptyState.getAttribute("headerlabel").includes("syncedtabs-adddevice"),
      "Add device message is shown"
    );

    // Test telemetry for adding a device.
    await clearAllParentTelemetryEvents();
    EventUtils.synthesizeMouseAtCenter(
      emptyState.querySelector(`button[data-action="add-device"]`),
      {},
      browser.contentWindow
    );
    await TestUtils.waitForCondition(
      () =>
        Services.telemetry.snapshotEvents(
          Ci.nsITelemetry.DATASET_PRERELEASE_CHANNELS
        ).parent?.length >= 1,
      "Waiting for fxa_mobile firefoxview_next telemetry event.",
      200,
      100
    );
    TelemetryTestUtils.assertEvents(
      [["firefoxview_next", "fxa_mobile", "sync"]],
      { category: "firefoxview_next" },
      { clear: true, process: "parent" }
    );
    await BrowserTestUtils.removeTab(browser.ownerGlobal.gBrowser.selectedTab);
  });
  await tearDown(sandbox);
});

add_task(async function test_no_synced_tabs() {
  Services.prefs.setBoolPref("services.sync.engine.tabs", false);
  const sandbox = setupMocks({
    state: UIState.STATUS_SIGNED_IN,
    fxaDevices: [
      {
        id: 1,
        name: "This Device",
        isCurrentDevice: true,
        type: "desktop",
        tabs: [],
      },
      {
        id: 2,
        name: "Other Device",
        type: "desktop",
        tabs: [],
      },
    ],
  });

  await withFirefoxView({}, async browser => {
    const { document } = browser.contentWindow;
    await navigateToCategoryAndWait(document, "syncedtabs");
    Services.obs.notifyObservers(null, UIState.ON_UPDATE);

    let syncedTabsComponent = document.querySelector(
      "view-syncedtabs:not([slot=syncedtabs])"
    );
    await TestUtils.waitForCondition(() => syncedTabsComponent.fullyUpdated);
    let emptyState =
      syncedTabsComponent.shadowRoot.querySelector("fxview-empty-state");
    ok(
      emptyState.getAttribute("headerlabel").includes("syncedtabs-synctabs"),
      "Enable synced tabs message is shown"
    );
  });
  await tearDown(sandbox);
  Services.prefs.setBoolPref("services.sync.engine.tabs", true);
});

add_task(async function test_no_error_for_two_desktop() {
  const sandbox = setupMocks({
    state: UIState.STATUS_SIGNED_IN,
    fxaDevices: [
      {
        id: 1,
        name: "This Device",
        isCurrentDevice: true,
        type: "desktop",
        tabs: [],
      },
      {
        id: 2,
        name: "Other Device",
        type: "desktop",
        tabs: [],
      },
    ],
  });

  await withFirefoxView({}, async browser => {
    const { document } = browser.contentWindow;
    await navigateToCategoryAndWait(document, "syncedtabs");
    Services.obs.notifyObservers(null, UIState.ON_UPDATE);

    let syncedTabsComponent = document.querySelector(
      "view-syncedtabs:not([slot=syncedtabs])"
    );
    await TestUtils.waitForCondition(() => syncedTabsComponent.fullyUpdated);
    let emptyState =
      syncedTabsComponent.shadowRoot.querySelector("fxview-empty-state");
    is(emptyState, null, "No empty state should be shown");
    let noTabs = syncedTabsComponent.shadowRoot.querySelectorAll(".notabs");
    is(noTabs.length, 1, "Should be 1 empty device");
  });
  await tearDown(sandbox);
});

add_task(async function test_empty_state() {
  const sandbox = setupMocks({
    state: UIState.STATUS_SIGNED_IN,
    fxaDevices: [
      {
        id: 1,
        name: "This Device",
        isCurrentDevice: true,
        type: "desktop",
        tabs: [],
      },
      {
        id: 2,
        name: "Other Desktop",
        type: "desktop",
        tabs: [],
      },
      {
        id: 3,
        name: "Other Mobile",
        type: "phone",
        tabs: [],
      },
    ],
  });

  await withFirefoxView({ openNewWindow: true }, async browser => {
    const { document } = browser.contentWindow;
    await navigateToCategoryAndWait(document, "syncedtabs");
    Services.obs.notifyObservers(null, UIState.ON_UPDATE);

    let syncedTabsComponent = document.querySelector(
      "view-syncedtabs:not([slot=syncedtabs])"
    );
    await TestUtils.waitForCondition(() => syncedTabsComponent.fullyUpdated);
    let noTabs = syncedTabsComponent.shadowRoot.querySelectorAll(".notabs");
    is(noTabs.length, 2, "Should be 2 empty devices");

    let headers =
      syncedTabsComponent.shadowRoot.querySelectorAll("h3[slot=header]");
    ok(
      headers[0].textContent.includes("Other Desktop"),
      "Text is correct (Desktop)"
    );
    ok(headers[0].innerHTML.includes("icon desktop"), "Icon should be desktop");
    ok(
      headers[1].textContent.includes("Other Mobile"),
      "Text is correct (Mobile)"
    );
    ok(headers[1].innerHTML.includes("icon phone"), "Icon should be phone");
  });
  await tearDown(sandbox);
});

add_task(async function test_tabs() {
  TabsSetupFlowManager.resetInternalState();

  const sandbox = setupRecentDeviceListMocks();
  const syncedTabsMock = sandbox.stub(SyncedTabs, "getRecentTabs");
  let mockTabs1 = getMockTabData(syncedTabsData1);
  let getRecentTabsResult = mockTabs1;
  syncedTabsMock.callsFake(() => {
    info(
      `Stubbed SyncedTabs.getRecentTabs returning a promise that resolves to ${getRecentTabsResult.length} tabs\n`
    );
    return Promise.resolve(getRecentTabsResult);
  });
  sandbox.stub(SyncedTabs, "getTabClients").callsFake(() => {
    return Promise.resolve(syncedTabsData1);
  });

  await withFirefoxView({ openNewWindow: true }, async browser => {
    const { document } = browser.contentWindow;
    await navigateToCategoryAndWait(document, "syncedtabs");
    Services.obs.notifyObservers(null, UIState.ON_UPDATE);

    let syncedTabsComponent = document.querySelector(
      "view-syncedtabs:not([slot=syncedtabs])"
    );
    await TestUtils.waitForCondition(() => syncedTabsComponent.fullyUpdated);

    let headers =
      syncedTabsComponent.shadowRoot.querySelectorAll("h3[slot=header]");
    ok(
      headers[0].textContent.includes("My desktop"),
      "Text is correct (My desktop)"
    );
    ok(headers[0].innerHTML.includes("icon desktop"), "Icon should be desktop");
    ok(
      headers[1].textContent.includes("My iphone"),
      "Text is correct (My iphone)"
    );
    ok(headers[1].innerHTML.includes("icon phone"), "Icon should be phone");

    let tabLists = syncedTabsComponent.tabLists;
    await TestUtils.waitForCondition(() => {
      return tabLists[0].rowEls.length;
    });
    let tabRow1 = tabLists[0].rowEls;
    ok(
      tabRow1[0].shadowRoot.textContent.includes,
      "Internet for people, not profits - Mozilla"
    );
    ok(tabRow1[1].shadowRoot.textContent.includes, "Sandboxes - Sinon.JS");
    is(tabRow1.length, 2, "Correct number of rows are displayed.");
    let tabRow2 = tabLists[1].shadowRoot.querySelectorAll("fxview-tab-row");
    is(tabRow2.length, 2, "Correct number of rows are dispayed.");
    ok(tabRow1[0].shadowRoot.textContent.includes, "The Guardian");
    ok(tabRow1[1].shadowRoot.textContent.includes, "The Times");

    // Test telemetry for opening a tab.
    await clearAllParentTelemetryEvents();
    EventUtils.synthesizeMouseAtCenter(tabRow1[0], {}, browser.contentWindow);
    await TestUtils.waitForCondition(
      () =>
        Services.telemetry.snapshotEvents(
          Ci.nsITelemetry.DATASET_PRERELEASE_CHANNELS
        ).parent?.length >= 1,
      "Waiting for synced_tabs firefoxview_next telemetry event.",
      200,
      100
    );
    TelemetryTestUtils.assertEvents(
      [
        [
          "firefoxview_next",
          "synced_tabs",
          "tabs",
          null,
          { page: "syncedtabs" },
        ],
      ],
      { category: "firefoxview_next" },
      { clear: true, process: "parent" }
    );
  });
  await tearDown(sandbox);
});

add_task(async function test_empty_desktop_same_name() {
  const sandbox = setupMocks({
    state: UIState.STATUS_SIGNED_IN,
    fxaDevices: [
      {
        id: 1,
        name: "A Device",
        isCurrentDevice: true,
        type: "desktop",
        tabs: [],
      },
      {
        id: 2,
        name: "A Device",
        type: "desktop",
        tabs: [],
      },
    ],
  });

  await withFirefoxView({ openNewWindow: true }, async browser => {
    const { document } = browser.contentWindow;
    await navigateToCategoryAndWait(document, "syncedtabs");
    Services.obs.notifyObservers(null, UIState.ON_UPDATE);

    let syncedTabsComponent = document.querySelector(
      "view-syncedtabs:not([slot=syncedtabs])"
    );
    await TestUtils.waitForCondition(() => syncedTabsComponent.fullyUpdated);
    let noTabs = syncedTabsComponent.shadowRoot.querySelectorAll(".notabs");
    is(noTabs.length, 1, "Should be 1 empty devices");

    let headers =
      syncedTabsComponent.shadowRoot.querySelectorAll("h3[slot=header]");
    ok(
      headers[0].textContent.includes("A Device"),
      "Text is correct (Desktop)"
    );
  });
  await tearDown(sandbox);
});

add_task(async function test_empty_desktop_same_name_three() {
  const sandbox = setupMocks({
    state: UIState.STATUS_SIGNED_IN,
    fxaDevices: [
      {
        id: 1,
        name: "A Device",
        isCurrentDevice: true,
        type: "desktop",
        tabs: [],
      },
      {
        id: 2,
        name: "A Device",
        type: "desktop",
        tabs: [],
      },
      {
        id: 3,
        name: "A Device",
        type: "desktop",
        tabs: [],
      },
    ],
  });

  await withFirefoxView({ openNewWindow: true }, async browser => {
    const { document } = browser.contentWindow;
    await navigateToCategoryAndWait(document, "syncedtabs");
    Services.obs.notifyObservers(null, UIState.ON_UPDATE);

    let syncedTabsComponent = document.querySelector(
      "view-syncedtabs:not([slot=syncedtabs])"
    );
    await TestUtils.waitForCondition(() => syncedTabsComponent.fullyUpdated);
    let noTabs = syncedTabsComponent.shadowRoot.querySelectorAll(".notabs");
    is(noTabs.length, 2, "Should be 2 empty devices");

    let headers =
      syncedTabsComponent.shadowRoot.querySelectorAll("h3[slot=header]");
    ok(
      headers[0].textContent.includes("A Device"),
      "Text is correct (Desktop)"
    );
    ok(
      headers[1].textContent.includes("A Device"),
      "Text is correct (Desktop)"
    );
  });
  await tearDown(sandbox);
});

add_task(async function search_synced_tabs() {
  TabsSetupFlowManager.resetInternalState();

  const sandbox = setupRecentDeviceListMocks();
  const syncedTabsMock = sandbox.stub(SyncedTabs, "getRecentTabs");
  let mockTabs1 = getMockTabData(syncedTabsData1);
  let getRecentTabsResult = mockTabs1;
  syncedTabsMock.callsFake(() => {
    info(
      `Stubbed SyncedTabs.getRecentTabs returning a promise that resolves to ${getRecentTabsResult.length} tabs\n`
    );
    return Promise.resolve(getRecentTabsResult);
  });
  sandbox.stub(SyncedTabs, "getTabClients").callsFake(() => {
    return Promise.resolve(syncedTabsData1);
  });
  await SpecialPowers.pushPrefEnv({
    set: [["browser.firefox-view.search.enabled", true]],
  });

  await withFirefoxView({}, async browser => {
    const { document } = browser.contentWindow;
    await navigateToCategoryAndWait(document, "syncedtabs");
    Services.obs.notifyObservers(null, UIState.ON_UPDATE);

    let syncedTabsComponent = document.querySelector(
      "view-syncedtabs:not([slot=syncedtabs])"
    );
    await TestUtils.waitForCondition(() => syncedTabsComponent.fullyUpdated);

    let cards = syncedTabsComponent.cardEls;
    is(cards.length, 2, "There are two device cards.");
    let deviceOneTabs = cards[0].querySelector("fxview-tab-list").rowEls;
    let deviceTwoTabs = cards[1].querySelector("fxview-tab-list").rowEls;

    info("Input a search query.");
    EventUtils.synthesizeMouseAtCenter(
      syncedTabsComponent.searchTextbox,
      {},
      content
    );
    EventUtils.sendString("Mozilla", content);
    await TestUtils.waitForCondition(
      () => syncedTabsComponent.fullyUpdated,
      "Synced Tabs component is done updating."
    );
    cards = syncedTabsComponent.cardEls;
    deviceOneTabs = cards[0].querySelector("fxview-tab-list").rowEls;
    deviceTwoTabs = cards[1].querySelector("fxview-tab-list");
    await TestUtils.waitForCondition(
      () => deviceOneTabs.length === 1,
      "There is one matching search result for the first device."
    );
    await TestUtils.waitForCondition(
      () => !deviceTwoTabs,
      "There are no matching search results for the second device."
    );

    info("Clear the search query.");
    EventUtils.synthesizeMouseAtCenter(
      syncedTabsComponent.searchTextbox.clearButton,
      {},
      content
    );
    await TestUtils.waitForCondition(
      () => syncedTabsComponent.fullyUpdated,
      "Synced Tabs component is done updating."
    );
    cards = syncedTabsComponent.cardEls;
    deviceOneTabs = cards[0].querySelector("fxview-tab-list").rowEls;
    deviceTwoTabs = cards[1].querySelector("fxview-tab-list").rowEls;
    await TestUtils.waitForCondition(
      () =>
        syncedTabsComponent.cardEls[0].querySelector("fxview-tab-list").rowEls
          .length === deviceOneTabs.length,
      "The original device's list is restored."
    );
    await TestUtils.waitForCondition(
      () =>
        syncedTabsComponent.cardEls[1].querySelector("fxview-tab-list").rowEls
          .length === deviceTwoTabs.length,
      "The new devices's list is restored."
    );
  });
  await SpecialPowers.popPrefEnv();
  await tearDown(sandbox);
});

add_task(async function search_synced_tabs_recent_browsing() {
  const NUMBER_OF_TABS = 6;
  TabsSetupFlowManager.resetInternalState();
  const sandbox = setupRecentDeviceListMocks();
  const tabClients = [
    {
      id: 1,
      type: "client",
      name: "My desktop",
      clientType: "desktop",
      tabs: Array(NUMBER_OF_TABS).fill({
        type: "tab",
        title: "Internet for people, not profits - Mozilla",
        url: "https://www.mozilla.org/",
        icon: "https://www.mozilla.org/media/img/favicons/mozilla/favicon.d25d81d39065.ico",
        client: 1,
      }),
    },
  ];
  sandbox
    .stub(SyncedTabs, "getRecentTabs")
    .resolves(getMockTabData(tabClients));
  sandbox.stub(SyncedTabs, "getTabClients").resolves(tabClients);

  await SpecialPowers.pushPrefEnv({
    set: [["browser.firefox-view.search.enabled", true]],
  });
  await withFirefoxView({}, async browser => {
    const { document } = browser.contentWindow;
    await navigateToCategoryAndWait(document, "recentbrowsing");
    Services.obs.notifyObservers(null, UIState.ON_UPDATE);

    info("Input a search query.");
    const recentBrowsing = document.querySelector("view-recentbrowsing");
    EventUtils.synthesizeMouseAtCenter(
      recentBrowsing.searchTextbox,
      {},
      content
    );
    EventUtils.sendString("Mozilla", content);
    const slot = recentBrowsing.querySelector("[slot='syncedtabs']");
    await TestUtils.waitForCondition(
      () => slot.fullyUpdated,
      "Synced Tabs component is done updating."
    );
    await TestUtils.waitForCondition(
      () => slot.tabLists[0].rowEls.length === 5,
      "Not all search results are shown yet."
    );

    info("Click the Show All link.");
    const showAllLink = await TestUtils.waitForCondition(() =>
      slot.shadowRoot.querySelector("[data-l10n-id='firefoxview-show-all']")
    );
    showAllLink.click();
    await TestUtils.waitForCondition(
      () => slot.tabLists[0].rowEls.length === NUMBER_OF_TABS,
      "All search results are shown."
    );
    ok(BrowserTestUtils.is_hidden(showAllLink), "The show all link is hidden.");
  });
  await SpecialPowers.popPrefEnv();
  await tearDown(sandbox);
});
