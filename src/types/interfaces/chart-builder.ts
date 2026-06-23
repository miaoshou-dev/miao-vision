/**
 * Input Initializer Interface
 */

import type { ParsedCodeBlock } from '@/types/report'
import type { IInputStore } from './stores'

/**
 * Interface for input initialization service
 */
export interface IInputInitializer {
  /**
   * Initialize default values for input components
   */
  initializeDefaults(
    blocks: ParsedCodeBlock[],
    inputStore: IInputStore
  ): void
}
