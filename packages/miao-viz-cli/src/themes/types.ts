export type ThemeName = 'standard-white' | 'magazine' | 'standard-dark' | 'minimal' | 'nyt' | 'bloomberg' | 'tableau'
export type LayoutName = 'standard' | 'editorial'

export interface SvgTheme {
  palette: string[]
  background: string
  axisColor: string
  labelColor: string
}

export interface ReportTheme {
  name: ThemeName
  layout: LayoutName
  css: string
  svg: SvgTheme
}
