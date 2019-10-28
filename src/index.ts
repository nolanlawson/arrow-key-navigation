/**
 * Makes it so the left and right arrows change focus, ala Tab/Shift+Tab. This is mostly designed
 * for KaiOS devices.
 */
/* global document, addEventListener, removeEventListener, getSelection */

interface FocusTrapTest { (element: Element): boolean }

// this query is adapted from via a11y-dialog
var focusablesQuery = 'a[href], area[href], input, select, textarea, ' +
  'button, iframe, object, embed, [contenteditable], [tabindex], video[controls], audio[controls]'
var textInputTypes = ['text', 'search', 'number', 'email', 'url']
var checkboxRadioInputTypes = ['checkbox', 'radio']

var focusTrapTest: FocusTrapTest = undefined

function getFocusableElements (activeElement) {
  // Respect focus trap inside of dialogs
  var dialogParent = getFocusTrapParent(activeElement)
  var root = dialogParent || document

  var res = []
  var elements = root.querySelectorAll(focusablesQuery)

  var len = elements.length
  for (var i = 0; i < len; i++) {
    var element = elements[i]
    if (element === activeElement || (
        !element.disabled && !/^-/.test(element.getAttribute('tabindex') || '') &&
        (element.offsetWidth > 0 || element.offsetHeight > 0)
    )) {
      res.push(element)
    }
  }
  return res
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

function focusNextOrPrevious (event, key) {
  var activeElement = document.activeElement
  if (shouldIgnoreEvent(activeElement, key)) {
    return
  }
  var focusableElements = getFocusableElements(activeElement)
  if (!focusableElements.length) {
    return
  }
  var index = focusableElements.indexOf(activeElement)
  var element
  if (key === 'ArrowLeft') {
    element = focusableElements[index - 1] || focusableElements[0]
  } else { // ArrowRight
    element = focusableElements[index + 1] || focusableElements[focusableElements.length - 1]
  }
  element.focus()
  event.preventDefault()
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
