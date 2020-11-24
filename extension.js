'use strict'
const { promisify } = require('util')
const vscode = require('vscode')
const remark = require('remark')
const gfm = require('remark-gfm')
const strip = require('strip-markdown')
const readability = require('text-readability')
const { name } = require('./package.json')

const analyze = promisify((markdown, cb) => {
  remark()
    .use(gfm)
    .use(strip)
    .process(markdown, function (err, stripped) {
      if (err) {
        cb(err)
        return
      }
      const normalized = stripped.contents.replace(/:/g, '.')
      cb(null, readability.textStandard(normalized, true))
    })
})

const categorize = (score) => {
  switch (true) {
    case score <= 11: return 'Elementary'
    case score <= 16: return 'Appropriate'
    case score <= 21: return 'Challenging'
    case score <= 26: return 'Esoteric'
    default: return 'Baffling'
  }
}

const emojis = {
  Elementary: '\uD83D\uDCD8',
  Appropriate: '\uD83D\uDCD7',
  Challenging: '\uD83D\uDCD9',
  Esoteric: '\uD83D\uDCD5',
  Baffling: '\uD83D\uDCDA'
}

const status = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100)

async function display (status, document) {
  try {
    const content = document.getText()
    const score = await analyze(content)
    const label = categorize(score)
    status.tooltip = `Readability: ${label} (${score})`
    status.text = `${emojis[label]}`
    status.show()
  } catch (err) {
    vscode.window.showErrorMessage(`${name}: ${err.message}`)
  }
}

async function activate (context) {
  const { subscriptions } = context
  subscriptions.push(status)
  const { activeTextEditor } = vscode.window
  let current = activeTextEditor ? activeTextEditor.document : null
  if (current) await display(status, current)
  vscode.window.onDidChangeActiveTextEditor((editor) => {
    if (!editor || !editor.document) return
    if (editor.document.languageId !== 'markdown') {
      status.hide()
      return
    }
    current = editor.document
    display(status, current)
  })
  vscode.workspace.onDidChangeTextDocument(({ document }) => {
    if (document === current) display(status, current)
  })
}

function deactivate () {
  status.hide()
}

module.exports = {
  activate,
  deactivate
}
