if (typeof window !== 'undefined' && typeof global !== 'undefined') {
  if (!global.TurboModuleRegistry) {
    global.TurboModuleRegistry = {
      get: (name) => {
        if (global.NativeModules && global.NativeModules[name]) {
          return global.NativeModules[name];
        }
        return null;
      },
      getEnforcing: (name) => {
        if (global.NativeModules && global.NativeModules[name]) {
          return global.NativeModules[name];
        }
        console.warn(`[Web Polyfill] TurboModuleRegistry: Module '${name}' not found, using mock`);
        return {
          getConstants: () => ({
            isTesting: false,
            reactNativeVersion: {
              major: 0,
              minor: 76,
              patch: 5,
            },
          }),
        };
      },
    };
  }
  
  if (!global.NativeModules) {
    global.NativeModules = {};
  }
  
  if (!global.NativeModules.PlatformConstants) {
    global.NativeModules.PlatformConstants = {
      getConstants: () => ({
        isTesting: false,
        reactNativeVersion: {
          major: 0,
          minor: 76,
          patch: 5,
        },
      }),
    };
  }
}

