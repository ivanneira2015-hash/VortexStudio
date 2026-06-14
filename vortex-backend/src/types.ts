import { Request } from 'express'

export interface AuthRequest extends Request {
  user?: { id: string; email: string }
}

export type AppStack = 'flutter' | 'kotlin' | 'react_native'
export type AppTarget = 'mobile' | 'tv' | 'both'

export interface PreviewComponent {
  type: 'text' | 'button' | 'card' | 'list' | 'image' | 'input' | 'nav_bar' | 'app_bar' | 'spacer' | 'chip'
  value?: string
  label?: string
  title?: string
  subtitle?: string
  items?: string[]
  color?: string
  style?: string
  placeholder?: string
}

export interface ScreenPreview {
  title: string
  bg_color?: string
  components: PreviewComponent[]
}

export interface GeneratedScreen {
  name: string
  route: string
  description: string
  code: string
  preview: ScreenPreview
}

export interface GeneratedApp {
  app_name: string
  description: string
  theme: {
    primary: string
    background: string
    surface: string
    text_primary: string
  }
  screens: GeneratedScreen[]
  main_dart: string
  pubspec_yaml: string
  is_tv_compatible: boolean
  stack_recommendation: {
    recommended_stack: 'flutter' | 'kotlin' | 'react_native'
    recommended_target: 'mobile' | 'tv' | 'both'
    reasoning: string
    is_current_stack_ideal: boolean
  }
}
