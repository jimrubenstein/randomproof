import type { GistFile } from '../stores/useRandomProofStore'

export interface GistResponse {
  files: Record<string, {
    filename: string
    content: string
  }>
}

export async function fetchGistData(gistUrl: string): Promise<{
  files: GistFile[]
  hasStrictFile: boolean
  saltContent: string | null
}> {
  // Extract gist ID from URL
  const gistIdMatch = gistUrl.match(/gist\.github\.com\/[^\/]+\/([a-f0-9]+)/)
  if (!gistIdMatch) {
    throw new Error('Invalid GitHub Gist URL')
  }
  
  const gistId = gistIdMatch[1]
  const apiUrl = `https://api.github.com/gists/${gistId}`
  
  const response = await fetch(apiUrl)
  if (!response.ok) {
    throw new Error(`Failed to fetch gist: ${response.statusText}`)
  }
  
  const data: GistResponse = await response.json()
  
  const files: GistFile[] = []
  let hasStrictFile = false
  let saltContent: string | null = null
  
  for (const [filename, file] of Object.entries(data.files)) {
    files.push({
      filename,
      content: file.content
    })
    
    if (filename === '_strict') {
      hasStrictFile = true
    }
    
    if (filename === '_salt') {
      saltContent = file.content.trim()
    }
  }
  
  return {
    files,
    hasStrictFile,
    saltContent
  }
}