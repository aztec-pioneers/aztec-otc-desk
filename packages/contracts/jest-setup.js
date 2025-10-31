if (typeof expect !== 'undefined' && !expect.addEqualityTesters) {
  // Add the missing method as a no-op or basic implementation
  expect.addEqualityTesters = function(testers) {
    // Store testers for potential future use
    expect._customTesters = expect._customTesters || [];
    expect._customTesters.push(...testers);
  };
}

jest.setTimeout(60000);