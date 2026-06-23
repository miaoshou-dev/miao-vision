/**
 * Service Container
 *
 * A simple dependency injection container for managing service instances.
 * Supports:
 * - Singleton and transient lifetimes
 * - Factory functions for lazy instantiation
 * - Type-safe service access
 * - Easy mocking for tests
 *
 * @module services/container
 *
 * @example Production usage
 * ```typescript
 * import { container } from '@/lib/services/container'
 *
 * // Get a service
 * const db = container.get('database')
 * await db.query('SELECT 1')
 * ```
 *
 * @example Test usage with mocks
 * ```typescript
 * import { createContainer } from '@/lib/services/container'
 *
 * const testContainer = createContainer()
 * testContainer.register('database', {
 *   query: async () => ({ columns: [], data: [], rowCount: 0, executionTime: 0 }),
 *   isInitialized: () => true,
 * })
 *
 * const db = testContainer.get('database')
 * ```
 */

import type { ServiceRegistry, ServiceKey } from './interfaces'

// ============================================================================
// Types
// ============================================================================

/**
 * Service factory function type
 */
export type ServiceFactory<T> = () => T

/**
 * Service registration options
 */
export interface ServiceOptions {
  /**
   * Singleton (default) - single instance shared across all consumers
   * Transient - new instance created on each get()
   */
  lifetime?: 'singleton' | 'transient'
}

/**
 * Internal service registration
 */
interface ServiceRegistration<T = unknown> {
  factory?: ServiceFactory<T>
  instance?: T
  options: ServiceOptions
}

// ============================================================================
// Service Container Class
// ============================================================================

/**
 * Service Container
 *
 * Manages service registration and resolution with type safety.
 */
export class ServiceContainer {
  private services = new Map<string, ServiceRegistration>()

  /**
   * Register a service instance
   *
   * @example
   * ```typescript
   * container.register('database', duckDBManager)
   * ```
   */
  register<K extends ServiceKey>(
    key: K,
    instance: ServiceRegistry[K],
    options: ServiceOptions = {}
  ): void {
    this.services.set(key, {
      instance,
      options: { lifetime: 'singleton', ...options }
    })
  }

  /**
   * Register a service factory for lazy instantiation
   *
   * @example
   * ```typescript
 * container.registerFactory('reportExecution', () => new ReportExecutionService())
   * ```
   */
  registerFactory<K extends ServiceKey>(
    key: K,
    factory: ServiceFactory<ServiceRegistry[K]>,
    options: ServiceOptions = {}
  ): void {
    this.services.set(key, {
      factory,
      options: { lifetime: 'singleton', ...options }
    })
  }

  /**
   * Get a service instance
   *
   * @throws Error if service is not registered
   *
   * @example
   * ```typescript
   * const db = container.get('database')
   * await db.query('SELECT 1')
   * ```
   */
  get<K extends ServiceKey>(key: K): ServiceRegistry[K] {
    const registration = this.services.get(key)

    if (!registration) {
      throw new Error(`Service "${key}" is not registered`)
    }

    // For transient lifetime, always create new instance
    if (registration.options.lifetime === 'transient' && registration.factory) {
      return registration.factory() as ServiceRegistry[K]
    }

    // For singleton, return existing or create from factory
    if (registration.instance) {
      return registration.instance as ServiceRegistry[K]
    }

    if (registration.factory) {
      registration.instance = registration.factory()
      return registration.instance as ServiceRegistry[K]
    }

    throw new Error(`Service "${key}" has no instance or factory`)
  }

  /**
   * Check if a service is registered
   */
  has(key: ServiceKey): boolean {
    return this.services.has(key)
  }

  /**
   * Remove a service registration
   *
   * Useful for test cleanup
   */
  unregister(key: ServiceKey): void {
    this.services.delete(key)
  }

  /**
   * Clear all registrations
   *
   * Useful for test cleanup
   */
  clear(): void {
    this.services.clear()
  }

  /**
   * Replace a service (useful for mocking in tests)
   *
   * @example
   * ```typescript
   * container.replace('database', mockDatabase)
   * ```
   */
  replace<K extends ServiceKey>(
    key: K,
    instance: ServiceRegistry[K]
  ): void {
    if (!this.services.has(key)) {
      throw new Error(`Cannot replace "${key}": service not registered`)
    }
    this.services.set(key, {
      instance,
      options: { lifetime: 'singleton' }
    })
  }

  /**
   * Create a child container that inherits from this one
   *
   * Useful for scoped services or test isolation
   */
  createChild(): ServiceContainer {
    const child = new ServiceContainer()
    // Copy all registrations to child
    for (const [key, reg] of this.services) {
      child.services.set(key, { ...reg })
    }
    return child
  }
}

// ============================================================================
// Factory Function
// ============================================================================

/**
 * Create a new service container
 *
 * Use this for tests or isolated scopes.
 *
 * @example
 * ```typescript
 * const testContainer = createContainer()
 * testContainer.register('database', mockDb)
 * ```
 */
export function createContainer(): ServiceContainer {
  return new ServiceContainer()
}

// ============================================================================
// Global Container Instance
// ============================================================================

/**
 * Global service container
 *
 * Use this for production code.
 * For tests, use createContainer() to create isolated containers.
 */
export const container = new ServiceContainer()

// ============================================================================
// Service Registration Helper
// ============================================================================

/**
 * Initialize the default services in the container
 *
 * Call this once at application startup.
 */
export function initializeDefaultServices(): void {
  // Import services lazily to avoid circular dependencies
  const { duckDBManager } = require('@core/database/duckdb')
  const { ReportExecutionService } = require('@core/engine/report-execution.service')

  // Register database service (already a singleton)
  if (!container.has('database')) {
    container.register('database', duckDBManager)
  }

  // Register report execution service
  if (!container.has('reportExecution')) {
    container.registerFactory('reportExecution', () => new ReportExecutionService())
  }
}
