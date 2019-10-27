require('jsdom-global')()
const kaiosNavigation = require('../pkg')
const assert = require('assert')

function typeLeft () {
  window.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowLeft'}))
}

function typeRight () {
  window.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight'}))
}

function assertActiveClass (className) {
  assert.deepStrictEqual([...document.activeElement.classList], className)
}

describe('test suite', () => {

  beforeEach(() => {
    kaiosNavigation.register()
  })

  afterEach(() => {
    kaiosNavigation.unregister()
  })

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
})
