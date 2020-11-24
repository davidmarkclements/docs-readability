'use strict'
const { test, beforeEach } = require('tap')
const { mockVscode, mockTextReadability, loadExtension } = require('./helper')

const BLUE_BOOK = '\uD83D\uDCD8'
const GREEN_BOOK = '\uD83D\uDCD7'
const ORANGE_BOOK = '\uD83D\uDCD9'
const RED_BOOK = '\uD83D\uDCD5'
const BOOK_STACK = '\uD83D\uDCDA'

beforeEach(async () => {
  mockTextReadability()
  mockVscode()
})

test('creates a status bar icon on load', async ({ is }) => {
  let results = null
  mockVscode({
    StatusBarAlignment: { Left: 0, Right: 1 },
    window: {
      createStatusBarItem (...args) {
        results = args
      }
    }
  })
  loadExtension()
  const [align, priority] = results
  is(align, 1)
  is(priority, 100)
})

test('enables status bar icon on activation', async ({ is }) => {
  let shown = false
  const mockedStatus = {
    show () {
      shown = true
    }
  }
  mockVscode({
    window: {
      createStatusBarItem (...args) {
        return mockedStatus
      }
    }
  })
  const { activate } = loadExtension()
  const context = { subscriptions: [] }
  await activate(context)
  is(context.subscriptions[0], mockedStatus)
  is(shown, true)
})

test('elementary status', async ({ is }) => {
  {
    mockTextReadability(-1)
    const { activate } = loadExtension()
    const context = { subscriptions: [] }
    await activate(context)
    const [{ text, tooltip }] = context.subscriptions
    is(text, BLUE_BOOK)
    is(tooltip, 'Readability: Elementary (-1)')
  }
  {
    mockTextReadability(11)
    const { activate } = loadExtension()
    const context = { subscriptions: [] }
    await activate(context)
    const [{ text, tooltip }] = context.subscriptions
    is(text, BLUE_BOOK)
    is(tooltip, 'Readability: Elementary (11)')
  }
})

test('appropriate status', async ({ is }) => {
  mockTextReadability(12)
  const { activate } = loadExtension()
  const context = { subscriptions: [] }
  await activate(context)
  const [{ text, tooltip }] = context.subscriptions
  is(text, GREEN_BOOK)
  is(tooltip, 'Readability: Appropriate (12)')
})

test('challenging status', async ({ is }) => {
  mockTextReadability(21)
  const { activate } = loadExtension()
  const context = { subscriptions: [] }
  await activate(context)
  const [{ text, tooltip }] = context.subscriptions
  is(text, ORANGE_BOOK)
  is(tooltip, 'Readability: Challenging (21)')
})

test('esoteric status', async ({ is }) => {
  mockTextReadability(26)
  const { activate } = loadExtension()
  const context = { subscriptions: [] }
  await activate(context)
  const [{ text, tooltip }] = context.subscriptions
  is(text, RED_BOOK)
  is(tooltip, 'Readability: Esoteric (26)')
})

test('baffling status', async ({ is }) => {
  mockTextReadability(27)
  const { activate } = loadExtension()
  const context = { subscriptions: [] }
  await activate(context)
  const [{ text, tooltip }] = context.subscriptions
  is(text, BOOK_STACK)
  is(tooltip, 'Readability: Baffling (27)')
})

test('updates status when current document is edited', async ({ is }) => {
  let getTextCalls = 0
  const document = {
    getText () {
      getTextCalls += 1
      return 'lorem ipsum'
    },
    languageId: 'markdown'
  }
  mockTextReadability([2, 13])
  mockVscode({
    window: { activeTextEditor: { document } },
    workspace: {
      onDidChangeTextDocument (fn) {
        fn({ document })
      }
    }
  })
  const { activate } = loadExtension()
  const context = { subscriptions: [] }
  await activate(context)
  const [{ text, tooltip }] = context.subscriptions
  is(text, GREEN_BOOK)
  is(tooltip, 'Readability: Appropriate (13)')
  is(getTextCalls, 2)
})

test('does not update status when documents other than the current document are edited', async ({ is }) => {
  let getTextCalls = 0
  const document = {
    getText () {
      getTextCalls += 1
      return 'lorem ipsum'
    },
    languageId: 'markdown'
  }
  mockTextReadability([2, 13])
  mockVscode({
    window: { activeTextEditor: { document } },
    workspace: {
      onDidChangeTextDocument (fn) {
        const document = {
          getText () {},
          languageId: 'markdown'
        }
        fn({ document })
      }
    }
  })
  const { activate } = loadExtension()
  const context = { subscriptions: [] }
  await activate(context)
  const [{ text, tooltip }] = context.subscriptions
  is(text, BLUE_BOOK)
  is(tooltip, 'Readability: Elementary (2)')
  is(getTextCalls, 1)
})

test('determines status when active text editor is changed to another markdown document', async ({ is }) => {
  let getTextCalledSecondTime = false
  mockTextReadability([2, 13])
  mockVscode({
    window: {
      onDidChangeActiveTextEditor (fn) {
        const document = {
          getText () {
            getTextCalledSecondTime = true
            return 'lorem ipsum'
          },
          languageId: 'markdown'
        }
        fn({ document })
      }
    }
  })
  const { activate } = loadExtension()
  const context = { subscriptions: [] }
  await activate(context)
  const [{ text, tooltip }] = context.subscriptions
  is(text, GREEN_BOOK)
  is(tooltip, 'Readability: Appropriate (13)')
  is(getTextCalledSecondTime, true)
})

test('hides status when active text editor is changed to a document that is not markdown', async ({ resolves }) => {
  mockVscode({
    window: {
      onDidChangeActiveTextEditor (fn) {
        fn()
      }
    }
  })
  const { activate } = loadExtension()
  const context = { subscriptions: [] }
  await resolves(() => activate(context))
})

test('does not error when active text editor is changed with a null editor instance', async ({ is }) => {
  let getTextCalledSecondTime = false
  mockTextReadability([2, 13])
  mockVscode({
    window: {
      onDidChangeActiveTextEditor (fn) {
        const document = {
          getText () {
            getTextCalledSecondTime = true
            return 'lorem ipsum'
          },
          languageId: 'javascript'
        }
        fn({ document })
      }
    }
  })
  const { activate } = loadExtension()
  const context = { subscriptions: [] }
  await activate(context)
  const [{ text, tooltip }] = context.subscriptions
  is(text, BLUE_BOOK)
  is(tooltip, 'Readability: Elementary (2)')
  is(getTextCalledSecondTime, false)
})

test('does not error when active text editor is changed to no document', async ({ resolves }) => {
  mockVscode({
    window: {
      onDidChangeActiveTextEditor (fn) {
        fn({})
      }
    }
  })
  const { activate } = loadExtension()
  const context = { subscriptions: [] }
  await resolves(() => activate(context))
})

test('hides status bar icon on deactivation', async ({ is }) => {
  let hidden = false
  const mockedStatus = {
    show () {},
    hide () {
      hidden = true
    }
  }
  mockVscode({
    window: {
      createStatusBarItem () {
        return mockedStatus
      }
    }
  })
  const { activate, deactivate } = loadExtension()
  const context = { subscriptions: [] }
  await activate(context)
  is(context.subscriptions[0], mockedStatus)
  await deactivate()
  is(hidden, true)
})

test('does not error/fail when there is no active text editor', async ({ resolves }) => {
  mockVscode({
    window: {
      activeTextEditor: null
    }
  })
  const { activate } = loadExtension()
  const context = { subscriptions: [] }
  await resolves(() => activate(context))
})

test('displays any analysis errors in a vscode error message slide-in', async ({ is, teardown }) => {
  let errMsg = ''
  teardown(() => {
    delete require.cache[require.resolve('remark')]
  })
  require.cache[require.resolve('remark')] = {
    exports () {
      const remark = {
        use () { return remark },
        process (md, cb) {
          process.nextTick(cb, Error('test error'))
        }
      }
      return remark
    }
  }
  mockVscode({
    window: {
      showErrorMessage (msg) {
        errMsg = msg
      }
    }
  })
  const { activate } = loadExtension()
  const context = { subscriptions: [] }
  await activate(context)
  is(errMsg, 'docs-readability: test error')
})

test('strips markdown and normalizes content before scoring', async ({ is }) => {
  let result = ''
  mockTextReadability((content) => {
    result = content
  })
  mockVscode({
    window: {
      onDidChangeActiveTextEditor (fn) {
        const document = {
          getText () {
            return 'A *code* sample: \n```js\nconsole.log("lorem ipsum")\n```\nEnd.'
          },
          languageId: 'markdown'
        }
        fn({ document })
      }
    }
  })
  const { activate } = loadExtension()
  const context = { subscriptions: [] }
  await activate(context)
  is(result, 'A code sample.\n\n\n\nEnd.\n')
})
