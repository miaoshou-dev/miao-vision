/// <reference types="svelte" />
/// <reference types="vite/client" />

// Module declarations for Vite special imports
declare module '*.wasm?url' {
  const url: string
  export default url
}

declare module '*.worker.js?url' {
  const url: string
  export default url
}

declare module '*.css' {
  const content: string
  export default content
}
