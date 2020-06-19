arrow-key-navigation [![Build Status](https://travis-ci.org/nolanlawson/arrow-key-navigation.svg)](https://travis-ci.org/nolanlawson/arrow-key-navigation) 
=====

## Overview

`arrow-key-navigation` is a simple utility to add left/right focus navigation to a web app. It's
designed for KaiOS apps but also available for any browser.

The basic idea is to make the <kbd>←</kbd> and <kbd>→</kbd> keys act similar to 
<kbd>Tab</kbd> and <kbd>Shift</kbd>+<kbd>Tab</kbd>, i.e. to change focus between focusable elements in the DOM.
Since the <kbd>↑</kbd> and <kbd>↓</kbd> keys typically scroll the page in KaiOS, this is usually all you need
to add basic KaiOS accessibility to an existing web app.

It will also listen for the <kbd>Enter</kbd> key for certain special cases like checkbox/radio buttons. `contenteditable` and Shadow DOM are also supported.

## Install

    npm install --save arrow-key-navigation

Or [browse unpkg.com](https://unpkg.com/browse/arrow-key-navigation/) for a list of build files.

## Usage

```js
import * as arrowKeyNavigation from 'arrow-key-navigation'

arrowKeyNavigation.register() // start listening for key inputs
arrowKeyNavigation.unregister() // stop listening
```

## Focus traps

To build [an accessible dialog](https://www.w3.org/TR/wai-aria-practices-1.1/#dialog_modal), you need to
"trap" focus inside of the dialog, i.e. make it so focus cannot escape the dialog while it is active. To
accomplish this, you can set a "focus trap test" which takes an element as input and returns truthy/falsy
to indicate that the element is a focus trap (e.g. the modal dialog root):

```js
arrowKeyNavigation.setFocusTrapTest(element => {
  return element.classList.contains('my-dialog-class')
})
```

If you don't call `setFocusTrapTest()`, then `arrow-key-navigation` will assume that there are no focus traps
in your app.

## Conditional or lazy loading

You can choose to install this module only in KaiOS environments using logic like the following:

```js
if (/KAIOS/.test(navigator.userAgent)) {
  import('arrow-key-navigation').then(arrowKeyNavigation => {
    arrowKeyNavigation.register()
  })
}
```

## Contributing

### Build

    npm run build

### Lint

    npm run lint

### Fix most lint issues

    npm run lint:fix

### Test

    npm test

### Code coverage

    npm run cover

### Manual KaiOS app test

The `index.html` and `manifest.webapp` files are designed for a quick-and-dirty KaiOS app test.

Run `npm run build` and then install the root directory as a packaged KaiOS app to test it.
