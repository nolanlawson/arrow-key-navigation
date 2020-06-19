/**
 * Makes it so the left and right arrows change focus, ala Tab/Shift+Tab. This is mostly designed
 * for KaiOS devices.
 */
/* global document, addEventListener, removeEventListener, getSelection */

interface FocusTrapTest { (element: Element): boolean }

// TODO: email/number types are a special type, in that they return selectionStart/selectionEnd as null
// As far as I can tell, there is no way to actually get the caret position from these inputs. So we
// don't do the proper caret handling for those inputs, unfortunately.
// https://html.spec.whatwg.org/multipage/input.html#do-not-apply
var textInputTypes = ['text', 'search', 'url', 'password', 'tel']

var checkboxRadioInputTypes = ['checkbox', 'radio']

var focusTrapTest: FocusTrapTest = undefined

// This query is adapted from a11y-dialog
// https://github.com/edenspiekermann/a11y-dialog/blob/cf4ed81/a11y-dialog.js#L6-L18
var focusablesQuery = 'a[href], area[href], input, select, textarea, ' +
    'button, iframe, object, embed, [contenteditable], [tabindex], ' +
    'video[controls], audio[controls], summary'

function isFocusable(element) {
  return element.matches(focusablesQuery) &&
    !element.disabled &&
    !/^-/.test(element.getAttribute('tabindex') || '') &&
    !element.hasAttribute('inert') && // see https://github.com/GoogleChrome/inert-polyfill
    (element.offsetWidth > 0 || element.offsetHeight > 0)
}

function getFocusTrapParent (element) {
  if (!focusTrapTest) {
    return
  }
  var parent = element.parentElement
  while (parent) {
    if (focusTrapTest(parent)) {
      return parent
    }
    parent = parent.parentElement
  }
}

function shouldIgnoreEvent (activeElement, key) {
  var tagName = activeElement.tagName
  var isTextarea = tagName === 'TEXTAREA'
  var isTextInput = tagName === 'INPUT' &&
    textInputTypes.indexOf(activeElement.getAttribute('type').toLowerCase()) !== -1
  var isContentEditable = activeElement.hasAttribute('contenteditable')

  if (!isTextarea && !isTextInput && !isContentEditable) {
    return false
  }

  var selectionStart
  var selectionEnd
  var len
  if (isContentEditable) {
    var selection = getSelection()
    selectionStart = selection.anchorOffset
    selectionEnd = selection.focusOffset
    len = activeElement.textContent.length
  } else {
    selectionStart = activeElement.selectionStart
    selectionEnd = activeElement.selectionEnd
    len = activeElement.value.length
  }

  // if the cursor is inside of a textarea/input, then don't focus to the next/previous element
  // unless the cursor is at the beginning or the end
  if (key === 'ArrowLeft' && selectionStart === selectionEnd && selectionStart === 0) {
    return false
  } else if (key === 'ArrowRight' && selectionStart === selectionEnd && selectionStart === len) {
    return false
  }
  return true
}

function getNextNode(root, targetElement, forwardDirection): HTMLElement {
  var filter: NodeFilter = {
    acceptNode: function (node) {
      var accept = (node === targetElement || isFocusable(node))
      return accept ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_SKIP
    }
  }
  var walker: TreeWalker = document.createTreeWalker(root, NodeFilter.SHOW_ELEMENT, filter)
  walker.currentNode = targetElement

  var nextNode = forwardDirection ? walker.nextNode() : walker.previousNode()
  return nextNode as HTMLElement
}

function focusNextOrPrevious (event, key) {
  var activeElement = document.activeElement
  if (shouldIgnoreEvent(activeElement, key)) {
    return
  }
  var root = getFocusTrapParent(activeElement) || document
  var forwardDirection = key === 'ArrowRight'
  var nextNode = getNextNode(root, activeElement, forwardDirection)
  if (nextNode && nextNode !== activeElement) {
    nextNode.focus()
    event.preventDefault()
  }
}

function handleEnter (event) {
  var activeElement = document.activeElement
  if (activeElement.tagName === 'INPUT' &&
    checkboxRadioInputTypes.indexOf(activeElement.getAttribute('type').toLowerCase()) !== -1) {
    // Explicitly override "enter" on an input and make it fire the checkbox/radio
    (activeElement as HTMLInputElement).click()
    event.preventDefault()
  }
}

function keyListener (event) {
  if (event.altKey || event.metaKey || event.ctrlKey) {
    return // ignore e.g. Alt-Left and Ctrl-Right, which are used to switch browser tabs or navigate back/forward
  }
  var key = event.key
  switch (key) {
    case 'ArrowLeft':
    case 'ArrowRight': {
      focusNextOrPrevious(event, key)
      break
    }
    case 'Enter': {
      handleEnter(event)
      break
    }
  }
}

/**
 * Start listening for keyboard events. Attaches a listener to the window.
 */
function register () {
  addEventListener('keydown', keyListener)
}

/**
 * Stop listening for keyboard events. Unattaches a listener to the window.
 */
function unregister () {
  removeEventListener('keydown', keyListener)
}

/**
 * Set a focus trap test to identify any focus traps in the DOM, i.e. a top-level DOM node that indicates the root
 * of a focus trap. Once this is set, if focus changes within the focus trap, then will not leave the focus trap.
 * @param test: the test function
 * @see https://w3c.github.io/aria-practices/examples/dialog-modal/dialog.html
 */
function setFocusTrapTest (test: FocusTrapTest) {
  focusTrapTest = test
}

export {
  register,
  unregister,
  setFocusTrapTest
}
