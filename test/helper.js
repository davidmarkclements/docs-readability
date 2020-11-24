'use strict'
const Module = require('module')
const { _resolveFilename, _cache: cache } = Module
const extensionPath = require.resolve('../extension.js')
const readabilityPath = require.resolve('text-readability')
Module._resolveFilename = (request, ...args) => {
  if (request === 'vscode') return request
  return _resolveFilename(request, ...args)
}

module.exports = {
  mockTextReadability (score = 1) {
    if (typeof score === 'function') {
      cache[readabilityPath] = {
        exports: {
          textStandard: score
        }
      }
      return
    }
    cache[readabilityPath] = {
      exports: {
        textStandard () {
          if (Array.isArray(score)) return score.shift()
          return score
        }
      }
    }
  },
  mockVscode (mock = {}) {
    cache.vscode = {
      exports: {
        StatusBarAlignment: { Left: 0, Right: 1, ...(mock.StatusBarAlignment || {}) },
        window: {
          showErrorMessage (msg) {
            console.error(msg)
          },
          onDidChangeActiveTextEditor () {},
          createStatusBarItem () {
            return { show () {}, hide () {} }
          },
          activeTextEditor: {
            document: {
              getText () {
                return 'lorem ipsum'
              }
            }
          },
          ...(mock.window || {})
        },
        workspace: {
          onDidChangeTextDocument () {},
          ...(mock.workspace || {})
        }
      }
    }
  },
  loadExtension () {
    const extension = require(extensionPath)
    delete cache[extensionPath]
    return extension
  }
}
