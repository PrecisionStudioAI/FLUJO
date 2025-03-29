/**
 * Environment detection utility functions
 */

import { isElectron } from './isElectron';

/**
 * Detects if the application is running in a server environment
 * 
 * @returns {boolean} True if running in a server environment, false otherwise
 */
export function isServerEnvironment(): boolean {
  // Check if we're in Node.js
  if (typeof window === 'undefined') {
    // This is either SSR or a Node.js environment
    // Check if we're in a server build
    return process.env.SERVER_BUILD === 'true' || 
           (process.env.NODE_ENV === 'production' && !process.env.ELECTRON_RUN_AS_NODE);
  }
  
  // If we have a window object, we're in a browser
  // Check if we're not in Electron
  return !isElectron();
}

/**
 * Detects if the application is running in a desktop environment (Electron)
 * 
 * @returns {boolean} True if running in a desktop environment, false otherwise
 */
export function isDesktopEnvironment(): boolean {
  return isElectron();
} 