// Download-Knopf: holt die neueste Version aus den GitHub-Releases und wählt die Datei fürs eigene System.
(() => {
  const cfg = window.HUGIHD || {}
  const repo = cfg.repo || ''
  const releasesPage = repo ? `https://github.com/${repo}/releases/latest` : '#'
  const $ = id => document.getElementById(id)
  $('gh-link').href = repo ? `https://github.com/${repo}/releases` : '#'

  const ICON = {
    win: '<svg class="os" viewBox="0 0 16 16" aria-hidden="true"><path fill="currentColor" d="M0 2.2 6.5 1.3v6.2H0zM7.3 1.2 16 0v7.5H7.3zM0 8.3h6.5v6.3L0 13.7zM7.3 8.3H16V16l-8.7-1.2z"/></svg>',
    mac: '<svg class="os" viewBox="0 0 16 16" aria-hidden="true"><path fill="currentColor" d="M11.2 0c.1 1-.3 2-.9 2.7-.6.7-1.5 1.2-2.4 1.1-.1-1 .3-2 .9-2.6.6-.7 1.6-1.2 2.4-1.2zm2.7 11.6c-.4.9-.6 1.3-1.1 2.1-.7 1.1-1.7 2.4-2.9 2.4-1.1 0-1.4-.7-2.8-.7s-1.8.7-2.9.7c-1.2 0-2.1-1.2-2.8-2.3C-.6 10.7-.8 7.1.5 5.2c.9-1.4 2.3-2.2 3.6-2.2s2.2.7 3.3.7c1.1 0 1.7-.7 3.3-.7 1.2 0 2.4.6 3.3 1.7-2.9 1.6-2.4 5.7-.1 6.9z"/></svg>'
  }

  function system () {
    const ua = navigator.userAgent
    if (/Windows/i.test(ua)) return 'win'
    if (/Macintosh|Mac OS X/i.test(ua) && !/iPhone|iPad/i.test(ua)) return 'mac'
    if (/Linux/i.test(ua) && !/Android/i.test(ua)) return 'linux'
    return 'other'
  }

  /** Apple-Chip oder Intel? (Chrome verrät es direkt, sonst über die Grafikkarte) */
  async function macChip () {
    try {
      if (navigator.userAgentData && navigator.userAgentData.getHighEntropyValues) {
        const v = await navigator.userAgentData.getHighEntropyValues(['architecture'])
        if (v.architecture) return v.architecture === 'arm' ? 'arm64' : 'x64'
      }
    } catch (e) { /* egal */ }
    try {
      const gl = document.createElement('canvas').getContext('webgl')
      const ext = gl && gl.getExtension('WEBGL_debug_renderer_info')
      const r = ext ? gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) : ''
      if (/Intel|AMD|Radeon/i.test(r)) return 'x64'
    } catch (e) { /* egal */ }
    return 'arm64' // die meisten Macs seit 2020
  }

  const mb = b => (b / 1048576).toFixed(0) + ' MB'

  function setMain (asset, label, icon, version) {
    const a = $('dl-main')
    a.href = asset ? asset.browser_download_url : releasesPage
    a.innerHTML = (icon ? ICON[icon] : '') + `<span>${label}</span>`
    $('dl-meta').textContent = asset ? `Version ${asset.version}, ${mb(asset.size)}` : `Version ${version}`
  }

  function other (links) {
    $('dl-other').innerHTML = links.filter(l => l.asset).map(l => `<a href="${l.asset.browser_download_url}">${l.label}</a>`).join('')
  }

  async function run () {
    if (!repo) {
      $('dl-meta').textContent = 'Download-Quelle fehlt (config.js).'
      return
    }
    let rels
    try {
      const r = await fetch(`https://api.github.com/repos/${repo}/releases?per_page=15`, { headers: { Accept: 'application/vnd.github+json' } })
      if (!r.ok) throw new Error(r.status)
      rels = (await r.json()).filter(x => !x.draft && !x.prerelease)
    } catch (e) {
      $('dl-main').href = releasesPage
      $('dl-meta').textContent = 'Die Versionsliste lässt sich gerade nicht laden – der Knopf führt zu GitHub.'
      return
    }
    if (!rels.length) {
      $('dl-main').href = releasesPage
      $('dl-meta').textContent = 'Noch keine Version veröffentlicht.'
      return
    }
    // Neueste Version, die eine passende Datei hat (Mac und Windows können verschieden aktuell sein)
    const find = re => {
      for (const rel of rels) {
        const a = (rel.assets || []).find(x => re.test(x.name))
        if (a) return Object.assign({ version: String(rel.tag_name || '').replace(/^v/, '') }, a)
      }
      return null
    }
    const version = String(rels[0].tag_name || '').replace(/^v/, '')
    const win = find(/Setup.*\.exe$/i)
    const arm = find(/arm64\.dmg$/i)
    const intel = find(/x64\.dmg$/i) || find(/\.dmg$/i)
    const sys = system()
    if (sys === 'win') {
      setMain(win, 'Für Windows herunterladen', 'win', version)
      if (!win) $('dl-meta').textContent = 'Die Windows-Version ist noch nicht hochgeladen – schau bald wieder vorbei.'
      other([{ asset: arm, label: 'Mac (Apple-Chip)' }, { asset: intel, label: 'Mac (Intel)' }])
    } else if (sys === 'mac') {
      const chip = await macChip()
      const mine = chip === 'arm64' ? arm : intel
      setMain(mine || arm || intel, chip === 'arm64' ? 'Für Mac herunterladen (Apple-Chip)' : 'Für Mac herunterladen (Intel)', 'mac', version)
      other([{ asset: chip === 'arm64' ? intel : arm, label: chip === 'arm64' ? 'Doch ein Intel-Mac?' : 'Doch ein Mac mit Apple-Chip?' }, { asset: win, label: 'Windows' }])
    } else {
      setMain(null, 'Alle Downloads auf GitHub', null, version)
      $('dl-meta').textContent = `Version ${version} – für Windows und Mac. Auf Handy oder Tablet läuft der Client nicht.`
      other([{ asset: win, label: 'Windows' }, { asset: arm, label: 'Mac (Apple-Chip)' }, { asset: intel, label: 'Mac (Intel)' }])
    }
  }

  // Vitrine: Edition wählen
  const NAMES = { smaragdflamme: 'Smaragdflamme', hoellendrache: 'Höllendrache', frostkristall: 'Frostkristall', leere: 'Leere' }
  document.querySelectorAll('.sc-pick button').forEach(b => {
    b.addEventListener('click', () => {
      const ed = b.dataset.ed
      document.querySelectorAll('.sc-pick button').forEach(x => x.setAttribute('aria-pressed', String(x === b)))
      document.documentElement.style.setProperty('--ed', getComputedStyle(b).getPropertyValue('--c'))
      $('sc-wings').src = `img/wings-${ed}.png`
      $('sc-cape').src = `img/cape-${ed}.png`
      $('sc-shield').src = `img/shield-${ed}.png`
      $('sc-name').textContent = `Spezial-Edition ${NAMES[ed]}`
    })
  })

  run()
})()
