import { readFile } from 'node:fs/promises'
import { load } from 'js-yaml'
import { describe, expect, it } from 'vitest'

describe('installable bundle', () => {
  it('mounts only the Observer runtime plugin', async () => {
    const source = await readFile(new URL('../cordis.patch.yml', import.meta.url), 'utf8')

    expect(load(source)).toEqual([{
      insert: [{
        id: 'observer',
        name: 'dsh-observer',
        config: {
          repeatCallThreshold: 3,
          repeatedErrorThreshold: 2,
          maxIssues: 50,
        },
      }],
    }])
  })
})
