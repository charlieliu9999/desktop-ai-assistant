// Ambient shims for main process to avoid pulling in legacy/adapter/bisheng code during type-check
declare module '../services/legacy/*' {
  const anyModule: any;
  export = anyModule;
}

declare module '../services/adapters/*' {
  const anyModule: any;
  export = anyModule;
}

declare module '../services/agent/*' {
  const anyModule: any;
  export = anyModule;
}

declare module '../../bisheng-integration/*' {
  const anyModule: any;
  export = anyModule;
}

