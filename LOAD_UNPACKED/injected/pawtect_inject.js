// pawtect_inject.js - Finds and exposes the St() sign function from the page's module

const findSignFn = async () => {
  const resources = performance.getEntriesByType('resource')
    .filter(e => e.name.includes('/_app/immutable/chunks/'))
    .map(e => e.name)
  
  for (const url of resources) {
    try {
      const mod = await import(url)
      if (typeof mod.r === 'function') {
        window.__wplaceSign = mod.r  // St = r per bundle exports
        console.log('wplacer: Sign function found at', url)
        return
      }
    } catch {}
  }
  console.warn('wplacer: Sign function not found, falling back to header interception only')
}

// Wait for page modules to load
setTimeout(findSignFn, 3000)
