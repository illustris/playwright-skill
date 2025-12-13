// nixos.js - NixOS Chromium Path Detection
// Automatically detects NixOS and provides path to Nix-packaged Chromium

const fs = require('fs');
const { execSync } = require('child_process');

/**
 * Check if running on NixOS
 * @returns {boolean}
 */
function isNixOS() {
  return fs.existsSync('/etc/NIXOS');
}

/**
 * Get the Nix-packaged Chromium executable path dynamically.
 * Uses nix build to realize the store path and find the browser.
 *
 * @returns {string|null} Path to chromium executable or null if not found/not NixOS
 */
function getNixChromiumPath() {
  // Check environment variable override first
  const envPath = process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH;
  if (envPath) {
    if (fs.existsSync(envPath)) {
      return envPath;
    }
    console.warn(`PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH set but not found: ${envPath}`);
  }

  if (!isNixOS()) {
    return null;
  }

  try {
    // Build and get the browsers directory path
    const browsersPath = execSync(
      "nix build 'nixpkgs#playwright-driver.browsers' --no-link --print-out-paths",
      { encoding: 'utf8', timeout: 120000, stdio: ['pipe', 'pipe', 'pipe'] }
    ).trim();

    if (!browsersPath || !fs.existsSync(browsersPath)) {
      return null;
    }

    // Find chromium directory (chromium-XXXX, not chromium_headless_shell)
    const entries = fs.readdirSync(browsersPath);
    const chromiumDir = entries.find(e => e.startsWith('chromium-') && !e.includes('headless'));

    if (!chromiumDir) {
      console.warn('NixOS detected but chromium not found in playwright-driver.browsers');
      return null;
    }

    // Resolve symlink to get actual chromium path
    const chromiumLink = `${browsersPath}/${chromiumDir}`;
    const chromiumReal = fs.realpathSync(chromiumLink);

    // Check for chrome-linux (newer) or chrome-linux64 (older) directory structure
    let chromiumPath = `${chromiumReal}/chrome-linux/chrome`;
    if (!fs.existsSync(chromiumPath)) {
      chromiumPath = `${chromiumReal}/chrome-linux64/chrome`;
    }

    if (fs.existsSync(chromiumPath)) {
      return chromiumPath;
    }

    console.warn(`NixOS chromium path not found at expected location: ${chromiumPath}`);
    return null;

  } catch (error) {
    // nix build failed - maybe nix not in PATH or network issue
    console.warn('Failed to detect NixOS chromium path:', error.message);
    return null;
  }
}

/**
 * Get launch options with NixOS executablePath if applicable.
 * Merges NixOS-specific options with provided options.
 *
 * @param {Object} options - User-provided launch options
 * @returns {Object} Options with executablePath added if on NixOS
 */
function getNixOSLaunchOptions(options = {}) {
  // If executablePath already set, respect it
  if (options.executablePath) {
    return options;
  }

  const nixChromiumPath = getNixChromiumPath();

  if (nixChromiumPath) {
    console.log(`NixOS detected, using: ${nixChromiumPath}`);
    return {
      ...options,
      executablePath: nixChromiumPath
    };
  }

  return options;
}

module.exports = {
  isNixOS,
  getNixChromiumPath,
  getNixOSLaunchOptions
};
