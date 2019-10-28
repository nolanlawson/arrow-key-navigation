require('jsdom-global')()
const lib = require('../pkg')
const assert = require('assert')

function isTextInput (element) {
  const tagName = element.tagName
  const isTextarea = tagName === 'TEXTAREA'
  const isTextInput = tagName === 'INPUT' &&
    ['text', 'search', 'number', 'email', 'url'].indexOf(
      element.getAttribute('type').toLowerCase()) !== -1
  const isContentEditable = element.hasAttribute('contenteditable')
  return isTextarea || isTextInput || isContentEditable
}

const $ = document.querySelector.bind(document)
let oldActiveElement

// keep track of the active element before the library does anything
function onKeyDownBefore () {
  oldActiveElement = document.activeElement
}

// simulate normal behavior when keydown/keyup happens, such as moving the cursor left/right in an input
function onKeyDownAfter (e) {
  if (!oldActiveElement || !isTextInput(oldActiveElement)) {
    return
  }
  const selectionStart = oldActiveElement.selectionStart
  const len = oldActiveElement.value.length
  if (e.key === 'ArrowLeft') {
    if (selectionStart > 0) {
      oldActiveElement.selectionStart--
      oldActiveElement.selectionEnd--
    }
  } else if (e.key === 'ArrowRight') {
    if (oldActiveElement.selectionEnd < len) {
      oldActiveElement.selectionEnd++
      oldActiveElement.selectionStart++
    }
  }
}

function installListeners () {
  window.addEventListener('keydown', onKeyDownBefore)
  lib.register()
  window.addEventListener('keydown', onKeyDownAfter)
}

function uninstallListeners () {
  window.addEventListener('keydown', onKeyDownBefore)
  lib.unregister()
  window.removeEventListener('keydown', onKeyDownAfter)
}

function typeLeft () {
  window.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowLeft'}))
}

function typeRight () {
  window.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight'}))
}

function typeEnter () {
  window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter'}))
}

function assertActiveClass (className) {
  assert.deepStrictEqual([...document.activeElement.classList], className)
}

describe('test suite', () => {

  beforeEach(() => {
    installListeners()
  })

  afterEach(() => {
    uninstallListeners()
  })

  describe('basic tests', () => {

    it('basic focus test', () => {
      document.body.innerHTML = `<div class=container>
        <input class="input" type="text">
        <button class="btn">Click me</button>
      </div>`
      typeRight()
      assertActiveClass(['input'])
      typeRight()
      assertActiveClass(['btn'])
      typeLeft()
      assertActiveClass(['input'])
      typeRight()
      assertActiveClass(['btn'])
      typeRight()
      assertActiveClass(['btn'])
    })

    it('handles tabindex correctly', () => {
      document.body.innerHTML = `<div class=container>
        <div class="focusable" tabindex="0"></div>
        <div class="focusable-2" tabindex="1"></div>
        <button class="not-focusable" tabindex="-1"></button>
      </div>`
      typeRight()
      assertActiveClass(['focusable'])
      typeRight()
      assertActiveClass(['focusable-2'])
      typeRight()
      assertActiveClass(['focusable-2'])
    })

    it('handles text/checkbox inputs correctly', () => {
      document.body.innerHTML = `<div class=container>
        <input type="text" class="input-1">
        <input type="text" class="input-2">
        <input type="checkbox" class="input-3">
      </div>`
      $('.input-1').value = 'foo'
      typeRight()
      assertActiveClass(['input-1'])
      typeRight()
      assertActiveClass(['input-1'])
      typeRight()
      assertActiveClass(['input-1'])
      typeRight()
      assertActiveClass(['input-1'])
      typeRight()
      assertActiveClass(['input-2'])
      typeRight()
      assertActiveClass(['input-3'])
      assert(!$('.input-3').checked, 'not checked originally')
      typeEnter()
      assert($('.input-3').checked, 'checked after pressing enter')
    })

    // TODO: can't actually test contenteditable in jsdom: https://github.com/jsdom/jsdom/issues/2472
    it.skip('handles contenteditable correctly', () => {
      document.body.innerHTML = `<div class=container>
        <div class="editable" contenteditable>hi</div>
        <input type="text" class="input">
      </div>`
      typeRight()
      assertActiveClass(['editable'])
      typeRight()
      assertActiveClass(['editable'])
      typeRight()
      assertActiveClass(['editable'])
      typeRight()
      assertActiveClass(['input'])
    })

    it('works when no focusable elements', () => {
      document.body.innerHTML = '<div class="foo">hi</div>'
      assert.deepStrictEqual(document.activeElement.constructor.name, 'HTMLBodyElement')
      typeRight()
      assert.deepStrictEqual(document.activeElement.constructor.name, 'HTMLBodyElement')
      typeLeft()
      assert.deepStrictEqual(document.activeElement.constructor.name, 'HTMLBodyElement')
    })
  })

  describe('focus trap tests', () => {

    beforeEach(() => {
      lib.setFocusTrapTest(el => el.classList.contains('focus-trap'))
    })

    afterEach(() => {
      lib.setFocusTrapTest(undefined)
    })

    it('traps focus', () => {
      document.body.innerHTML = `<div class=container>
        <button class="bad"></button>
        <div class="focus-trap">
          <input class="input" type="text">
          <button class="btn">Click me</button>
        </div>
        <button class="bad"></button>
      </div>`
      $('button.btn').focus()
      typeLeft()
      assertActiveClass(['input'])
      typeRight()
      assertActiveClass(['btn'])
      typeRight()
      assertActiveClass(['btn'])
      typeLeft()
      assertActiveClass(['input'])
      typeLeft()
      assertActiveClass(['input'])
    })
  })
})
