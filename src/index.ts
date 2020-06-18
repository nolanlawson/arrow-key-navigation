/**
 * Makes it so the left and right arrows change focus, ala Tab/Shift+Tab. This is mostly designed
 * for KaiOS devices.
 */
/* global document, addEventListener, removeEventListener, getSelection */

interface FocusTrapTest { (element: Element): boolean }

var shadowRoots

// This query is adapted from a11y-dialog
// https://github.com/edenspiekermann/a11y-dialog/blob/cf4ed81/a11y-dialog.js#L6-L18
var focusablesQuery = 'a[href], area[href], input, select, textarea, ' +
  'button, iframe, object, embed, [contenteditable], [tabindex], ' +
  'video[controls], audio[controls], summary'

// TODO: email/number types are a special type, in that they return selectionStart/selectionEnd as null
// As far as I can tell, there is no way to actually get the caret position from these inputs. So we
// don't do the proper caret handling for those inputs, unfortunately.
// https://html.spec.whatwg.org/multipage/input.html#do-not-apply
var textInputTypes = ['text', 'search', 'url', 'password', 'tel']

var checkboxRadioInputTypes = ['checkbox', 'radio']

var focusTrapTest: FocusTrapTest = undefined

function getHost(shadowRoot) {
  return shadowRoot && shadowRoot.getRootNode() && shadowRoot.getRootNode().host
}

function isAncestor (node, ancestor) {
  var parent = node
  while (parent) {
    parent = parent.parentElement
    if (parent === ancestor) {
      return true
    }
  }
  return false
}

// Given a root, a descendant node, and a list of other descendant nodes,
// traverse the DOM to find where that node _would_ be inserted in the list
// of descendant nodes, maintaining DOM (focus) order.
function findNextNodeIndex(root, nodes, node) {
  var treeWalker = document.createTreeWalker(root, NodeFilter.SHOW_ELEMENT)
  treeWalker.currentNode = node
  var nextNode = treeWalker.nextNode()
  while (nextNode) {
    var index = nodes.indexOf(nextNode)
    if (index !== -1) {
      return index
    }
    nextNode = treeWalker.nextNode()
  }
  return nodes.length // end of the list
}

// A custom element with open shadow DOM may contain any number of
// focusable elements. It itself may or may not be focusable.
// The goal here is to traverse the shadow roots to find any of their
// children that may be focusable, and then add them to the list of
// light nodes *in the proper DOM order*.
// TODO: this doesn't consider shadow roots inside of shadow roots
function addShadowNodes (root, nodes) {
  if (!shadowRoots.length) {
    return
  }
  for (var i = 0; i < shadowRoots.length; i++) {
    var shadowRoot = shadowRoots[i]
    var host = getHost(shadowRoot)
    if (!host || !isAncestor(host, root)) {
      continue
    }
    var shadowNodes = shadowRoot.querySelectorAll(focusablesQuery)
    if (!shadowNodes.length) {
      continue
    }

    var index = findNextNodeIndex(root, nodes, host)
    Array.prototype.splice.apply(nodes, [index, 0].concat(shadowNodes))
  }
}

function getCandidateFocusableElements (root) {
  var nodes = root.querySelectorAll(focusablesQuery)
  if (shadowRoots) { // allow for better tree-shaking by minifiers if you aren't using shadow DOM
    addShadowNodes(root, nodes)
  }
  return nodes
}

function getFocusableElements (activeElement) {
  // Respect focus trap inside of dialogs
  var dialogParent = getFocusTrapParent(activeElement)
  var root = dialogParent || document

  var res = []
  var elements = getCandidateFocusableElements(root)

  var len = elements.length
  for (var i = 0; i < len; i++) {
    var element = elements[i]
    if (element === activeElement || (
        !element.disabled &&
        !/^-/.test(element.getAttribute('tabindex') || '') &&
        !element.hasAttribute('inert') && // see https://github.com/GoogleChrome/inert-polyfill
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

/**
 * Register the shadow root of an open shadow DOM that should also be traversed when searching
 * for focusable elements in the DOM. Should be removed with `unregisterShadowRoot()`
 * if the host custom element is removed from the DOM.
 *
 * @param shadowRoot
 */
function registerShadowRoot (shadowRoot: ShadowRoot) {
  shadowRoots = shadowRoots || []
  if (shadowRoots.indexOf(shadowRoot) === -1) {
    shadowRoots.push(shadowRoot)
  }
}

/**
 * Unregister a shadow root that was added with `registerShadowRoot()`.
 * @param shadowRoot
 */
function unregisterShadowRoot (shadowRoot: ShadowRoot) {
  shadowRoots = shadowRoots || []
  var index = shadowRoots.indexOf(shadowRoot)
  if (index !== -1) {
    shadowRoots.splice(index, 1)
  }
}

export {
  register,
  unregister,
  registerShadowRoot,
  unregisterShadowRoot,
  setFocusTrapTest
}
