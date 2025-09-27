if (typeof WebAssembly !== 'undefined') {
  const originalInstantiateStreaming = WebAssembly.instantiateStreaming

  if (typeof originalInstantiateStreaming === 'function') {
    WebAssembly.instantiateStreaming = async (
      source: Response | Promise<Response>,
      importObject?: WebAssembly.Imports,
    ) => {
      try {
        return await originalInstantiateStreaming.call(WebAssembly, source, importObject)
      } catch (error) {
        const response = await source
        if (response && response.headers && response.headers.get('content-type') !== 'application/wasm') {
          console.warn(
            'WebAssembly.instantiateStreaming fallback: unexpected MIME type',
            response.headers.get('content-type'),
          )
        }
        const bytes = await response.arrayBuffer()
        return WebAssembly.instantiate(bytes, importObject)
      }
    }
  } else {
    WebAssembly.instantiateStreaming = async (
      source: Response | Promise<Response>,
      importObject?: WebAssembly.Imports,
    ) => {
      const response = await source
      const bytes = await response.arrayBuffer()
      return WebAssembly.instantiate(bytes, importObject)
    }
  }
}
