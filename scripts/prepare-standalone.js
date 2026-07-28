const fs = require('fs')
const path = require('path')

const root = path.resolve(__dirname, '..')
const standalone = path.join(root, '.next', 'standalone')

if (!fs.existsSync(standalone)) {
  throw new Error('Build standalone non trovata in .next/standalone')
}

const assets = [
  {
    source: path.join(root, '.next', 'static'),
    target: path.join(standalone, '.next', 'static')
  },
  {
    source: path.join(root, 'public'),
    target: path.join(standalone, 'public')
  }
]

for (const { source, target } of assets) {
  if (!fs.existsSync(source)) continue
  fs.rmSync(target, { recursive: true, force: true })
  fs.mkdirSync(path.dirname(target), { recursive: true })
  fs.cpSync(source, target, { recursive: true })
}

console.log('Asset statici copiati nella build standalone')
