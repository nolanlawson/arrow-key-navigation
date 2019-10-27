kaios-navigation
=====

## Overview

`kaios-navigation` is a simple utility to add left/right focus navigation to a web app. It's
designed for KaiOS apps but also available for any browser.

The basic idea is to make the <kbd>←</kbd> and <kbd>→</kbd> keys act similar to 
<kbd>Tab</kbd> and <kbd>Shift</kbd>+<kbd>Tab</kbd>, i.e. to change focus between focusable elements in the DOM.
Since the <kbd>↑</kbd> and <kbd>↓</kbd> keys typically scroll the page in KaiOS, this is usually all you need
to add basic KaiOS accessibility ot an existing web app.

## Install

    npm install --save kaios-navigation

## Usage

```js
const kaiosNavigation = require('kaios-navigation')

kaiosNavigation.register() // start listening for ←/→ key inputs
kaiosNavigation.unregister() // stop listening
```

## Focus traps

To build [an accessible dialog](https://www.w3.org/TR/wai-aria-practices-1.1/#dialog_modal), you need to
"trap" focus inside of the dialog, i.e. make it so focus cannot escape the dialog while it is active. To
accomplish this, you can set a "focus trap test" which takes an element as input and returns truthy/falsy
to indicate that the element is a focus trap (e.g. the modal dialog root):

```js
kaiosNavigation.setFocusTrapTest(element => {
  return element.classList.contains('my-dialog-class')
})
```

If you don't call `setFocusTrapTest()`, then `kaios-navigation` will assume that there are no focus traps
in your app.
