#!/usr/bin/env node
/**
 * xhs-cli landing 部署脚本
 *
 * 流程：docker build → login → push → SSH 远程 pull + run
 *
 * 必填（在 .env.deploy 中配置）：
 *   DOCKER_REGISTRY   镜像仓库地址，如 registry.cn-shanghai.aliyuncs.com/your-ns
 *   DOCKER_USERNAME   仓库登录用户名
 *   DOCKER_PASSWORD   仓库登录密码
 *   SSH_HOST          服务器 IP 或域名
 *   SSH_USERNAME      SSH 用户名
 *   SSH_PASSWORD      SSH 密码
 *
 * 可选：
 *   DEPLOY_TAG              镜像 tag，默认 latest（CI 可用 GITHUB_SHA 前 7 位）
 *   DOCKER_IMAGE_NAME       镜像名，默认 xhs-cli-landing
 *   SSH_PORT                SSH 端口，默认 22
 *   DEPLOY_CONTAINER_NAME   容器名，默认 xhs-cli-landing
 *   DEPLOY_PUBLISH_PORT     宿主机映射端口，默认 38521
 *   DEPLOY_CONTAINER_TZ     容器时区，如 Asia/Shanghai
 *   DEPLOY_DOCKER_PLATFORM  构建平台，默认 linux/amd64
 *   DEPLOY_SKIP_IMAGE_UPDATE  设为 true 时跳过本地 build/push 与远程 pull
 *   DEPLOY_DOCKER_PULL_BASE   设为 true 时 build 拉取最新基础镜像
 */
import fs from 'node:fs'
import path from 'node:path'
import { spawn } from 'node:child_process'
import { Client } from 'ssh2'

function parseEnvFile(filePath) {
  if (!fs.existsSync(filePath)) {
    throw new Error(`file not found: ${filePath}`)
  }
  const content = fs.readFileSync(filePath, 'utf8')
  const env = {}
  for (const rawLine of content.split(/\r?\n/)) {
    const line = rawLine.trim()
    if (!line || line.startsWith('#')) continue
    const idx = line.indexOf('=')
    if (idx <= 0) continue
    const key = line.slice(0, idx).trim()
    let value = line.slice(idx + 1).trim()
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1)
    }
    env[key] = value
  }
  return env
}

function run(command, args, options = {}) {
  const { cwd, input, redactedArgs } = options
  const printableArgs = redactedArgs || args
  console.log(`> ${command} ${printableArgs.join(' ')}`)
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd,
      stdio: ['pipe', 'inherit', 'inherit'],
      shell: false,
    })
    child.on('error', reject)
    child.on('exit', (code) => {
      if (code === 0) resolve()
      else reject(new Error(`${command} exited with code ${code ?? 'unknown'}`))
    })
    if (input != null) {
      child.stdin.write(input)
    }
    child.stdin.end()
  })
}

function shEscape(value) {
  return `'${String(value).replace(/'/g, `'\\''`)}'`
}

function parseRegistryLoginHost(registry) {
  const host = String(registry || '').split('/')[0]?.trim()
  if (host) return host
  return 'docker.io'
}

function getArgValue(flag) {
  const idx = process.argv.indexOf(flag)
  if (idx === -1) return undefined
  return process.argv[idx + 1]
}

function hasFlag(flag) {
  return process.argv.includes(flag)
}

function isTruthy(value) {
  const normalized = String(value ?? '').trim().toLowerCase()
  return normalized === '1' || normalized === 'true' || normalized === 'yes' || normalized === 'on'
}

function printHelp() {
  console.log(`Usage: npm run deploy -- [options]

Options:
  --config <path>       Deploy config file (default: .env.deploy)
  --tag <tag>           Image tag (default: latest or DOCKER_IMAGE_TAG)
  --image <name>        Image name without registry (default: xhs-cli-landing)
  --container <name>    Remote container name (default: xhs-cli-landing)
  --host-port <port>    Remote exposed port (default: 38521)
  --pull-base           Ask docker build to pull newer base images (FROM ...)
  --no-image-update     Skip local build/login/push and remote pull
  --dry-run             Print commands only, do not execute
  --help                Show help
`)
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function isRetryableSshError(error) {
  const message = String(error?.message || error || '')
  return /handshake|ECONNRESET|ETIMEDOUT|EPIPE|ENOTCONN|Socket closed|Connection lost|connect/i.test(message)
}

function buildSshConnectOptions({ sshHost, sshPort, sshUser, sshPassword }) {
  const connectOptions = {
    host: sshHost,
    port: sshPort,
    username: sshUser,
  }
  if (sshPassword) {
    connectOptions.password = sshPassword
  }
  return connectOptions
}

async function runRemoteBashOnce({
  sshHost,
  sshPort,
  sshUser,
  sshPassword,
  remoteCommand,
}) {
  return new Promise((resolve, reject) => {
    const conn = new Client()
    conn.on('ready', () => {
      conn.exec(`bash -lc ${shEscape(remoteCommand)}`, (err, stream) => {
        if (err) {
          conn.end()
          reject(err)
          return
        }

        stream.on('close', (code) => {
          conn.end()
          if (code === 0) resolve()
          else reject(new Error(`remote command exited with code ${code ?? 'unknown'}`))
        })
        stream.stderr.on('data', (chunk) => process.stderr.write(chunk))
        stream.on('data', (chunk) => process.stdout.write(chunk))
        stream.end()
      })
    })
    conn.on('error', reject)
    conn.connect(buildSshConnectOptions({ sshHost, sshPort, sshUser, sshPassword }))
  })
}

async function runRemoteBash(options) {
  const maxAttempts = 5
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      await runRemoteBashOnce(options)
      return
    } catch (error) {
      if (attempt >= maxAttempts || !isRetryableSshError(error)) {
        throw error
      }
      const waitMs = attempt * 3000
      console.warn(
        `SSH attempt ${attempt}/${maxAttempts} failed: ${error.message}. Retrying in ${waitMs / 1000}s...`,
      )
      await sleep(waitMs)
    }
  }
}

async function main() {
  if (hasFlag('--help')) {
    printHelp()
    return
  }

  const dryRun = hasFlag('--dry-run')
  const noImageUpdate = hasFlag('--no-image-update')
  const repoRoot = process.cwd()
  const configPath = path.resolve(repoRoot, getArgValue('--config') || '.env.deploy')
  const landingRoot = path.resolve(repoRoot, 'landing')
  const dockerfilePath = path.resolve(landingRoot, 'Dockerfile')

  if (!fs.existsSync(dockerfilePath)) {
    throw new Error(`dockerfile not found: ${dockerfilePath}`)
  }

  const deployEnv = parseEnvFile(configPath)

  const registry = deployEnv.DOCKER_REGISTRY || ''
  const dockerUsername = deployEnv.DOCKER_USERNAME || ''
  const dockerPassword = deployEnv.DOCKER_PASSWORD || ''
  const sshHost = deployEnv.SSH_HOST
  const sshUser = deployEnv.SSH_USERNAME
  const sshPassword = deployEnv.SSH_PASSWORD || ''
  const sshPort = Number(deployEnv.SSH_PORT || '22')

  if (!registry) {
    throw new Error('DOCKER_REGISTRY is required in deploy config')
  }
  if (!sshHost || !sshUser) {
    throw new Error('SSH_HOST and SSH_USERNAME are required in deploy config')
  }
  if (!dockerUsername || !dockerPassword) {
    throw new Error('DOCKER_USERNAME and DOCKER_PASSWORD are required in deploy config')
  }

  const imageName = getArgValue('--image') || deployEnv.DOCKER_IMAGE_NAME || 'xhs-cli-landing'
  const imageTag =
    getArgValue('--tag') ||
    deployEnv.DEPLOY_TAG ||
    deployEnv.DOCKER_IMAGE_TAG ||
    (process.env.GITHUB_SHA ? process.env.GITHUB_SHA.slice(0, 7) : '') ||
    'latest'
  const containerName = getArgValue('--container') || deployEnv.DEPLOY_CONTAINER_NAME || 'xhs-cli-landing'
  const frontendHostPort =
    getArgValue('--host-port') ||
    deployEnv.DEPLOY_PUBLISH_PORT ||
    deployEnv.REMOTE_FRONTEND_PORT ||
    deployEnv.REMOTE_HOST_PORT ||
    '38521'
  const containerTz = (deployEnv.DEPLOY_CONTAINER_TZ || '').trim()
  const skipImageUpdate = noImageUpdate || isTruthy(deployEnv.DEPLOY_SKIP_IMAGE_UPDATE)
  const dockerPlatform = (deployEnv.DEPLOY_DOCKER_PLATFORM || 'linux/amd64').trim()
  const pullBaseImages =
    hasFlag('--pull-base') || isTruthy(deployEnv.DEPLOY_DOCKER_PULL_BASE)

  const imageRef = `${registry.replace(/\/+$/, '')}/${imageName}:${imageTag}`
  const registryLoginHost = parseRegistryLoginHost(registry)
  const dockerPasswordB64 = Buffer.from(dockerPassword, 'utf8').toString('base64')
  const tzFlag = containerTz ? `-e TZ=${shEscape(containerTz)}` : ''

  const remoteImagePrepare = skipImageUpdate
    ? "echo 'skip image update: use existing remote image'"
    : [
        `REG_PASS="$(printf %s ${shEscape(dockerPasswordB64)} | base64 -d)"`,
        `printf '%s' "$REG_PASS" | docker login ${shEscape(registryLoginHost)} -u ${shEscape(dockerUsername)} --password-stdin`,
        'unset REG_PASS',
        `docker pull ${shEscape(imageRef)}`,
      ].join(' && ')

  const remoteCommand = [
    'set -e',
    remoteImagePrepare,
    `(docker rm -f ${shEscape(containerName)} >/dev/null 2>&1 || true)`,
    [
      'docker run -d',
      `--name ${shEscape(containerName)}`,
      '--restart unless-stopped',
      `-p ${shEscape(`${frontendHostPort}:3000`)}`,
      tzFlag,
      shEscape(imageRef),
    ].filter(Boolean).join(' '),
    `echo "[deploy] 容器已启动: ${containerName}"`,
  ].join(' && ')

  console.log('Deploy plan:')
  console.log('- mode: landing-only')
  console.log(`- dockerfile: ${path.relative(repoRoot, dockerfilePath)}`)
  console.log(`- image: ${imageRef}`)
  console.log(`- remote: ${sshUser}@${sshHost}:${sshPort}`)
  console.log(`- container: ${containerName}`)
  console.log(`- ports: ${frontendHostPort}->3000`)
  console.log(`- docker platform: ${dockerPlatform}`)
  console.log(`- image update: ${skipImageUpdate ? 'disabled' : 'enabled'}`)
  if (!skipImageUpdate) {
    console.log(`- docker build base images: ${pullBaseImages ? 'pull from registry' : 'local only (--pull=false)'}`)
  }
  if (dryRun) {
    console.log('\n[dry-run] skip execution')
    return
  }

  if (!skipImageUpdate) {
    console.log('\n[1/4] Building local docker image...')
    const buildArgs = pullBaseImages
      ? ['build', '--platform', dockerPlatform, '--pull=true', '-f', dockerfilePath, '-t', imageRef, landingRoot]
      : ['build', '--platform', dockerPlatform, '--pull=false', '-f', dockerfilePath, '-t', imageRef, landingRoot]
    await run('docker', buildArgs, { cwd: repoRoot })

    console.log('\n[2/4] Logging in to registry...')
    await run('docker', ['login', registryLoginHost, '-u', dockerUsername, '--password-stdin'], {
      input: `${dockerPassword}\n`,
      redactedArgs: ['login', registryLoginHost, '-u', dockerUsername, '--password-stdin'],
    })

    console.log('\n[3/4] Pushing image...')
    await run('docker', ['push', imageRef], { cwd: repoRoot })
  } else {
    console.log('\n[1-3/4] Image update disabled; skip local build/login/push.')
  }

  console.log('\n[4/4] SSH to server, pull image, and run container...')
  await runRemoteBash({
    sshHost,
    sshPort,
    sshUser,
    sshPassword,
    remoteCommand,
  })

  console.log('\nDeploy completed.')
}

main().catch((error) => {
  console.error(`Deploy failed: ${error.message}`)
  process.exit(1)
})
