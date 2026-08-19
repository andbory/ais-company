import { cp, mkdir, readdir } from 'node:fs/promises'
import path from 'node:path'

const projectRoot = process.cwd()
const source = path.join(projectRoot, 'server', 'generated', 'prisma')
const target = path.join(projectRoot, 'dist-server', 'server', 'generated', 'prisma')

async function copyTree(from, to) {
  await mkdir(to, { recursive: true })
  for (const entry of await readdir(from, { withFileTypes: true })) {
    const sourcePath = path.join(from, entry.name)
    const targetPath = path.join(to, entry.name)
    if (entry.isDirectory()) await copyTree(sourcePath, targetPath)
    else {
      try {
        await cp(sourcePath, targetPath, { force: true })
      } catch (error) {
        if (error?.code !== 'EPERM' && error?.code !== 'EBUSY') throw error
        console.warn(`Prisma runtime file is locked; keeping existing copy: ${path.relative(projectRoot, targetPath)}`)
      }
    }
  }
}

await copyTree(source, target)
console.log(`Copied Prisma runtime to ${path.relative(projectRoot, target)}`)
