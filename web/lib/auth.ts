import { createClient } from './supabase'

export async function getUser() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  return user
}

export async function getSession() {
  const supabase = createClient()
  const { data: { session } } = await supabase.auth.getSession()
  return session
}

// Database types for TypeScript
export interface User {
  id: string
  email: string
  name?: string
  image?: string
  created_at: string
  updated_at: string
}

export interface Subscription {
  id: string
  user_id: string
  keywords: string[]
  active: boolean
  digest_time: string
  max_papers: number
  summary_model: string
  tone: string
  include_pdf_link: boolean
  created_at: string
  updated_at: string
}

export interface Paper {
  id: string // arXiv ID
  title: string
  abstract: string
  authors: string[]
  published: string
  url: string
  pdf_url: string
  categories: string[]
  summary?: string
  processed_content?: string
  created_at: string
}

export interface UserPaper {
  id: string
  user_id: string
  paper_id: string
  bookmarked: boolean
  read_at?: string
  rating?: number
  created_at: string
}

export interface DigestHistory {
  id: string
  date: string
  papers: string[] // Array of paper IDs
  created_at: string
} 