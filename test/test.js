require('jsdom-global')()
const lib = require('../pkg')
const assert = require('assert')

// We check for offsetWidth/offsetHeight to avoid elements that are display:none, but JSDom just returns
// zero for everything, so we unbreak this.
Object.defineProperties(HTMLElement.prototype, {
  offsetWidth: {
    get: function () {
      return 1
    }
  },
  offsetHeight: {
    get: function () {
      return 1
    }
  }
})

const $ = document.querySelector.bind(document)
let oldActiveElement

function putCursorAtStart(el) {
  el.selectionStart = el.selectionEnd = 0
}

// keep track of the active element before the library does anything
function onKeyDownBefore () {
  oldActiveElement = document.activeElement
}

function isTextInput (element) {
  const tagName = element.tagName
  const isTextarea = tagName === 'TEXTAREA'
  const isTextInput = tagName === 'INPUT' &&
    ['text', 'search', 'url', 'password', 'tel'].indexOf(
      element.getAttribute('type').toLowerCase()) !== -1
  const isContentEditable = element.hasAttribute('contenteditable')
  return isTextarea || isTextInput || isContentEditable
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

function assertShadowActiveClass (className) {
  assert.deepStrictEqual([...document.activeElement.shadowRoot.activeElement.classList], className)
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
      putCursorAtStart($('.input-1'))
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

    it('handles url/search/password/tel inputs correctly', () => {
      document.body.innerHTML = `<div class=container>
        <input type="search" class="input-1">
        <input type="url" class="input-2">
        <input type="password" class="input-3">
        <input type="tel" class="input-4">
        <input type="text" class="input-5">
      </div>`
      $('.input-1').value = 'bar'
      putCursorAtStart($('.input-1'))
      $('.input-2').value = 'a.com'
      putCursorAtStart($('.input-2'))
      $('.input-3').value = 'psst'
      putCursorAtStart($('.input-3'))
      $('.input-4').value = '123'
      putCursorAtStart($('.input-4'))
      for (let i = 0; i < 4; i++) {
        typeRight()
        assertActiveClass(['input-1'])
      }
      for (let i = 0; i < 6; i++) {
        typeRight()
        assertActiveClass(['input-2'])
      }
      for (let i = 0; i < 5; i++) {
        typeRight()
        assertActiveClass(['input-3'])
      }
      for (let i = 0; i < 4; i++) {
        typeRight()
        assertActiveClass(['input-4'])
      }
      typeRight()
      assertActiveClass(['input-5'])
    })

    it('skips inert elements', () => {
      document.body.innerHTML = `<div class=container>
        <button class="button-1">hey</button>
        <button class="button-2" inert>hello</button>
        <button class="button-3">yo</button>
      </div>`
      typeRight()
      assertActiveClass(['button-1'])
      typeRight()
      assertActiveClass(['button-3'])
      typeLeft()
      assertActiveClass(['button-1'])
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

    it('handles details/summary correctly', () => {
      document.body.innerHTML = `<div class=container>
        <details>
          <summary class="summary">Click for details</summary>
          <p>Hey some details!</p>
        </details>
        <button class="yolo">yolo</button>
      </div>`
      typeRight()
      assertActiveClass(['summary'])
      typeRight()
      assertActiveClass(['yolo'])
    })

    it('works when no focusable elements', () => {
      document.body.innerHTML = '<div class="foo">hi</div>'
      assert.deepStrictEqual(document.activeElement.constructor.name, 'HTMLBodyElement')
      typeRight()
      assert.deepStrictEqual(document.activeElement.constructor.name, 'HTMLBodyElement')
      typeLeft()
      assert.deepStrictEqual(document.activeElement.constructor.name, 'HTMLBodyElement');
    })

    it('handles element becoming disabled while focused', () => {
      // if a button is disabled when it's focused (for whatever reason), then the left/right
      // focus should still change to the proper element to its left/right
      document.body.innerHTML = `div class="container">
        <button class="button-1">1</button>
        <button class="button-2">2</button>
        <button class="button-3">3</button>
      </div>`
      typeRight()
      assertActiveClass(['button-1'])
      typeRight()
      assertActiveClass(['button-2'])
      $('.button-2').disabled = true
      typeRight()
      assertActiveClass(['button-3'])
      typeLeft()
      assertActiveClass(['button-1'])
      $('.button-2').disabled = false
      typeRight()
      assertActiveClass(['button-2'])
      $('.button-2').disabled = true
      typeLeft()
      assertActiveClass(['button-1'])
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

  describe('shadow dom', () => {
    it('works with shadow dom', () => {
      class Component extends HTMLElement {
        constructor() {
          super()
          this.attachShadow({ mode: 'open'})
          this.shadowRoot.innerHTML = `
            <input type=text class="inside-shadow">
          `
          this.classList.add('my-component')
        }
      }
      customElements.define('my-component', Component)

      document.body.innerHTML = `
        <button class="button-1">one</button>
        <my-component></my-component>
        <button class="button-2">two</button>
      `
      typeRight()
      assertActiveClass('button-1')
      typeRight()
      assertActiveClass('my-component')
      assertShadowActiveClass('inside-shadow')
      typeRight()
      assertActiveClass('button-1')

    })
  })
})
